// ============================================================
// bCampus Chat Worker — Poll Service
// ============================================================

import { PollRepository, type PollWithOptions } from "../repositories/poll.repository";
import { MessageRepository } from "../repositories/message.repository";
import { RoomRepository } from "../repositories/room.repository";
import { RoomService } from "./room.service";
import type { BroadcastFn } from "./message.service";
import type { Database } from "../../db/drizzle";
import { enforceRoomPolicy } from "../policies/room.policy";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../types";
import { MAX_POLL_OPTIONS, MIN_POLL_OPTIONS } from "../../constants";

export interface CreatePollInput {
	roomId: string;
	content: string; // poll question shown as message content
	options: string[];
	multipleChoice: boolean;
	closesAt: string | null;
}

export interface VotePollInput {
	pollId: string;
	optionIds: string[];
}

// ---- Write-blocking moderation check (FRD §7.12) ----
function assertCanWrite(user: AuthUser): void {
	if (user.moderation.status === "suspended") {
		throw Errors.accountSuspended(user.moderation.expiresAt);
	}
}

export class PollService {
	private readonly pollRepo: PollRepository;
	private readonly msgRepo: MessageRepository;
	private readonly roomRepo: RoomRepository;
	private readonly roomService: RoomService;

	constructor(db: Database) {
		this.pollRepo = new PollRepository(db);
		this.msgRepo = new MessageRepository(db);
		this.roomRepo = new RoomRepository(db);
		this.roomService = new RoomService(db);
	}

	async createPoll(
		user: AuthUser,
		input: CreatePollInput,
		broadcast: BroadcastFn,
	): Promise<PollWithOptions> {
		assertCanWrite(user);

		if (input.options.length < MIN_POLL_OPTIONS || input.options.length > MAX_POLL_OPTIONS) {
			throw Errors.invalidPollOptionCount(MIN_POLL_OPTIONS, MAX_POLL_OPTIONS);
		}

		const room = await this.roomService.requireMembership(input.roomId, user.uid);
		enforceRoomPolicy(room.policy, user.role, "create_poll");

		// Step 1 — create the parent POLL message
		const msgId = crypto.randomUUID();
		const msg = await this.msgRepo.create({
			id: msgId,
			roomId: input.roomId,
			authorUid: user.uid,
			replyToMessageId: null,
			type: "POLL",
			content: input.content,
		});

		// Step 2 — create poll + options in one transaction (FRD §3.8)
		const poll = await this.pollRepo.create({
			messageId: msgId,
			multipleChoice: input.multipleChoice,
			closesAt: input.closesAt,
			options: input.options,
		});

		// Step 3 — update room counters
		await this.roomRepo.incrementMessageCount(input.roomId, msg.createdAt);

		// Step 4 — broadcast after commit (FRD §6.2 Principle 1)
		// FRD §6.10: poll creation emits message.created (for the message)
		// then poll.updated (for poll state). Clients listen to both.
		await broadcast(input.roomId, { event: "message.created", data: msg });
		await broadcast(input.roomId, { event: "poll.updated", data: poll });

		return poll;
	}

	async vote(
		user: AuthUser,
		input: VotePollInput,
		broadcast: BroadcastFn,
	): Promise<PollWithOptions> {
		assertCanWrite(user);

		const poll = await this.pollRepo.findById(input.pollId);
		if (!poll) throw Errors.pollNotFound();
		if (poll.isClosed) throw Errors.pollClosed();

		// Auto-close check
		if (poll.closesAt && new Date(poll.closesAt) <= new Date()) {
			await this.pollRepo.close(poll.id);
			throw Errors.pollClosed();
		}

		if (!poll.multipleChoice && input.optionIds.length !== 1) {
			throw Errors.validationError("Single-choice polls accept exactly one option.");
		}

		const validOptionIds = new Set(poll.options.map((o) => o.id));
		for (const oid of input.optionIds) {
			if (!validOptionIds.has(oid)) throw Errors.pollOptionCrossPoll();
		}

		// For single-choice: remove previous votes before casting new one
		if (!poll.multipleChoice) {
			const previous = await this.pollRepo.getUserVotes(poll.id, user.uid);
			for (const prevId of previous) {
				await this.pollRepo.removeVote(prevId, user.uid);
			}
		}

		for (const optionId of input.optionIds) {
			await this.pollRepo.upsertVote(optionId, user.uid);
		}

		const updated = await this.pollRepo.findById(poll.id);
		if (!updated) throw Errors.pollNotFound();

		const msg = await this.msgRepo.findById(poll.messageId);
		if (msg) {
			await broadcast(msg.roomId, { event: "poll.updated", data: updated });
		}

		return updated;
	}

	async closePoll(
		user: AuthUser,
		pollId: string,
		broadcast: BroadcastFn,
	): Promise<PollWithOptions> {
		assertCanWrite(user);

		const poll = await this.pollRepo.findById(pollId);
		if (!poll) throw Errors.pollNotFound();
		if (poll.isClosed) throw Errors.pollClosed();

		const msg = await this.msgRepo.findById(poll.messageId);
		if (!msg) throw Errors.messageNotFound();

		// Only poll creator or someone with create_poll permission can close
		if (msg.authorUid !== user.uid) {
			const room = await this.roomService.getRoom(msg.roomId);
			enforceRoomPolicy(room.policy, user.role, "create_poll");
		}

		await this.pollRepo.close(pollId);
		const updated = await this.pollRepo.findById(pollId);
		if (!updated) throw Errors.pollNotFound();

		await broadcast(msg.roomId, { event: "poll.closed", data: updated });
		return updated;
	}
}
