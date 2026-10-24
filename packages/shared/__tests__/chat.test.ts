import { describe, expect, it } from "vitest";
import {
	canPerformChatAction,
	getChatPinExpiry,
	getChatPollOptionPercentage,
	getChatPollTotalVotes,
	isDeletedChatAnnouncement,
	mergeChatMessages,
	removeChatPinForMessage,
	toggleChatPollOption,
	validateChatPollDraft,
} from "../src";

function message(overrides: Partial<import("../src").ChatDisplayMessage> = {}): import("../src").ChatDisplayMessage {
	return {
		id: "message-1",
		roomId: "room-1",
		authorUid: "user-1",
		authorName: "Student",
		replyToMessageId: null,
		type: "TEXT",
		visibility: "VISIBLE",
		content: "hello",
		editedAt: null,
		deletedAt: null,
		attachments: [],
		createdAt: "2026-10-24T10:00:00.000Z",
		updatedAt: "2026-10-24T10:00:00.000Z",
		...overrides,
	};
}

describe("chat shared rules", () => {
	it("normalizes and validates poll drafts consistently", () => {
		expect(validateChatPollDraft("  Choose one  ", [" A ", "", "B "])).toEqual({
			question: "Choose one",
			options: ["A", "B"],
			error: null,
		});
		expect(validateChatPollDraft("Question", ["A", "a"]).error).toBe("Poll options must be unique.");
	});

	it("calculates poll totals and percentages", () => {
		const options = [{ voteCount: 1 }, { voteCount: 3 }];
		expect(getChatPollTotalVotes(options)).toBe(4);
		expect(getChatPollOptionPercentage(options[0]!, 4)).toBe(25);
		expect(getChatPollOptionPercentage(options[0]!, 0)).toBe(0);
	});

	it("toggles single and multiple poll selections", () => {
		expect(toggleChatPollOption(["a"], "b", false)).toEqual(["b"]);
		expect(toggleChatPollOption(["a"], "b", true)).toEqual(["a", "b"]);
		expect(toggleChatPollOption(["a", "b"], "a", true)).toEqual(["b"]);
	});

	it("shares role checks and deterministic pin expiry", () => {
		expect(canPerformChatAction("MODERATOR", "STUDENT")).toBe(true);
		expect(canPerformChatAction("STUDENT", "MODERATOR")).toBe(false);
		expect(getChatPinExpiry("8h", 0)).toBe(new Date(8 * 60 * 60 * 1_000).toISOString());
		expect(getChatPinExpiry("forever", 0)).toBeNull();
	});

	it("identifies deleted announcements without hiding other messages", () => {
		expect(isDeletedChatAnnouncement({ type: "ANNOUNCEMENT", visibility: "DELETED" })).toBe(true);
		expect(isDeletedChatAnnouncement({ type: "TEXT", visibility: "DELETED" })).toBe(false);
	});

	it("removes a deleted message from the pinned messages", () => {
		const pins = [
			{ roomId: "room-1", messageId: "deleted", pinnedBy: "user-1", pinnedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
			{ roomId: "room-1", messageId: "kept", pinnedBy: "user-1", pinnedAt: "2026-01-01T00:00:00.000Z", expiresAt: null },
		];

		expect(removeChatPinForMessage(pins, "deleted")).toEqual([pins[1]]);
	});

	it("does not resurrect a newer deleted message from an older replay snapshot", () => {
		const deleted = message({
			visibility: "DELETED",
			content: "",
			deletedAt: "2026-10-24T10:02:00.000Z",
			updatedAt: "2026-10-24T10:02:00.000Z",
		});
		const replayedCreation = message({ updatedAt: "2026-10-24T10:00:00.000Z" });

		expect(mergeChatMessages([deleted], [replayedCreation])[0]).toMatchObject({
			visibility: "DELETED",
			content: "",
		});
	});

	it("applies a newer deletion over a visible cached message", () => {
		const visible = message();
		const deleted = message({
			visibility: "DELETED",
			content: "",
			deletedAt: "2026-10-24T10:02:00.000Z",
			updatedAt: "2026-10-24T10:02:00.000Z",
		});

		expect(mergeChatMessages([visible], [deleted])[0]).toMatchObject({
			visibility: "DELETED",
			content: "",
		});
	});

	it("ignores an older deletion snapshot when a newer visible state is present", () => {
		const visible = message({ updatedAt: "2026-10-24T10:03:00.000Z" });
		const staleDeleted = message({
			visibility: "DELETED",
			content: "",
			deletedAt: "2026-10-24T10:02:00.000Z",
			updatedAt: "2026-10-24T10:02:00.000Z",
		});

		expect(mergeChatMessages([visible], [staleDeleted])[0]).toMatchObject({
			visibility: "VISIBLE",
			content: "hello",
		});
	});
});
