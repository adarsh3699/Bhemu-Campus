// ============================================================
// bCampus Chat Worker — Drizzle Schema
// ============================================================
// Mirrors the canonical SQL schema in docs/chat/schema.sql.
// IMPORTANT: Do not change column types/names without a migration.

import {
	pgTable,
	uuid,
	varchar,
	integer,
	smallint,
	timestamp,
	boolean,
	bigint,
	pgEnum,
	check,
	foreignKey,
	index,
	primaryKey,
	text,
	jsonb,
	unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---- Enums ----

export const roomTypeEnum = pgEnum("room_type", ["UNIVERSITY", "BATCHMATE"]);
export const roomVisibilityEnum = pgEnum("room_visibility", ["PUBLIC", "PRIVATE", "HIDDEN"]);
export const appRoleEnum = pgEnum("app_role", ["STUDENT", "MODERATOR", "ADMIN"]);
export const messageTypeEnum = pgEnum("message_type", [
	"TEXT",
	"IMAGE",
	"DOCUMENT",
	"GIF",
	"POLL",
	"ANNOUNCEMENT",
	"SYSTEM",
]);
export const messageVisibilityEnum = pgEnum("message_visibility", [
	"VISIBLE",
	"HIDDEN",
	"DELETED",
]);
export const attachmentTypeEnum = pgEnum("attachment_type", ["IMAGE", "DOCUMENT", "GIF"]);
export const reportReasonEnum = pgEnum("report_reason", [
	"SPAM",
	"HARASSMENT",
	"ABUSE",
	"INAPPROPRIATE",
	"MISINFORMATION",
	"OTHER",
]);
export const moderationActionTypeEnum = pgEnum("moderation_action_type", [
	"WARN",
	"FLAG",
	"UNFLAG",
	"SUSPEND",
	"BAN",
	"DELETE_MESSAGE",
]);

// ---- Room Policies ----

export const roomPolicies = pgTable(
	"room_policies",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: varchar("name", { length: 100 }).notNull().unique(),
		retentionDays: integer("retention_days").notNull(),
		maxMessages: integer("max_messages").notNull(),
		sendMessageRole: appRoleEnum("send_message_role").notNull(),
		sendAttachmentRole: appRoleEnum("send_attachment_role").notNull(),
		createPollRole: appRoleEnum("create_poll_role").notNull(),
		createAnnouncementRole: appRoleEnum("create_announcement_role").notNull(),
		pinMessageRole: appRoleEnum("pin_message_role").notNull(),
		pinLimit: smallint("pin_limit").default(5).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check("chk_retention_days", sql`${table.retentionDays} > 0`),
		check("chk_max_messages", sql`${table.maxMessages} > 0`),
		check(
			"chk_pin_limit",
			sql`${table.pinLimit} > 0 AND ${table.pinLimit} <= 100`,
		),
	],
);

// ---- Rooms ----

export const rooms = pgTable(
	"rooms",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		policyId: uuid("policy_id")
			.notNull()
			.references(() => roomPolicies.id, { onDelete: "restrict", onUpdate: "cascade" }),
		type: roomTypeEnum("type").notNull(),
		visibility: roomVisibilityEnum("visibility").default("PUBLIC").notNull(),
		name: varchar("name", { length: 100 }).notNull(),
		description: text("description"),
		/**
		 * groupKey — null for UNIVERSITY, set for BATCHMATE rooms.
		 * Format: "{batchYear}_{programCode}" e.g. "2024_P132"
		 * Sourced from leaderboard.groupKey / Firestore user profile.
		 */
		groupKey: varchar("group_key", { length: 100 }),
		messageCount: bigint("message_count", { mode: "number" }).default(0).notNull(),
		lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_rooms_type").on(table.type),
		index("idx_rooms_last_message").on(table.lastMessageAt),
		index("idx_rooms_group_key").on(table.groupKey),
		// One room per (type, groupKey) pair — replaces old uq_room_type
		unique("uq_room_type_group").on(table.type, table.groupKey),
	],
);

// ---- Room Members ----

export const roomMembers = pgTable(
	"room_members",
	{
		roomId: uuid("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
		userUid: varchar("user_uid", { length: 128 }).notNull(),
		notificationsEnabled: boolean("notifications_enabled").default(true).notNull(),
		joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.roomId, table.userUid] }),
		index("idx_room_members_user").on(table.userUid),
		index("idx_room_members_room").on(table.roomId),
	],
);

// ---- Messages ----

export const messages = pgTable(
	"messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		roomId: uuid("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
		authorUid: varchar("author_uid", { length: 128 }).notNull(),
		replyToMessageId: uuid("reply_to_message_id"),
		type: messageTypeEnum("type").default("TEXT").notNull(),
		visibility: messageVisibilityEnum("visibility").default("VISIBLE").notNull(),
		// content: schema.sql uses NOT NULL DEFAULT '' for constraint enforcement.
		// We store null in application code only when visibility = DELETED.
		content: text("content").notNull().default(""),
		// editedAt / deletedAt — canonical timestamps per schema.sql
		editedAt: timestamp("edited_at", { withTimezone: true, mode: "string" }),
		deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_messages_room_created").on(table.roomId, table.createdAt),
		index("idx_messages_reply").on(table.replyToMessageId),
		index("idx_messages_author").on(table.authorUid),
		index("idx_messages_visibility").on(table.visibility),
		index("idx_messages_created").on(table.createdAt),
		// Mirror schema.sql chk_text_message: TEXT messages must have non-empty trimmed content
		// Exception: DELETED messages may have empty content (soft-delete wipes content)
		check(
			"chk_text_message",
			sql`${table.type} <> 'TEXT' OR ${table.visibility} = 'DELETED' OR LENGTH(TRIM(${table.content})) > 0`,
		),
		foreignKey({
			columns: [table.replyToMessageId],
			foreignColumns: [table.id],
			name: "fk_messages_reply",
		})
			.onDelete("set null")
			.onUpdate("cascade"),
	],
);

// ---- Message idempotency records ----
//
// The Room DO is a fast duplicate-admission cache, but PostgreSQL remains the
// final authority. The unique room/user/key constraint makes concurrent REST,
// retry, and WebSocket commands converge on one committed message even when
// the DO has not recorded its post-write cache entry yet.
export const messageIdempotency = pgTable(
	"message_idempotency",
	{
		roomId: uuid("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
		authorUid: varchar("author_uid", { length: 128 }).notNull(),
		key: varchar("key", { length: 128 }).notNull(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.roomId, table.authorUid, table.key] }),
		unique("uq_message_idempotency_message").on(table.messageId),
		index("idx_message_idempotency_created").on(table.createdAt),
	],
);

// ---- Durable room event stream ----
//
// The Room Durable Object allocates roomSeq values for its serialized room
// command stream. PostgreSQL stores the immutable event payload alongside
// the message transaction, so the DO remains a delivery coordinator rather
// than a second source of truth.
export const roomEvents = pgTable(
	"room_events",
	{
		roomId: uuid("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
		roomSeq: bigint("room_seq", { mode: "number" }).notNull(),
		eventId: uuid("event_id").notNull().unique(),
		eventType: varchar("event_type", { length: 64 }).notNull(),
		aggregateId: uuid("aggregate_id"),
		version: integer("version").default(1).notNull(),
		payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.roomId, table.roomSeq] }),
		index("idx_room_events_created").on(table.roomId, table.createdAt),
		index("idx_room_events_aggregate").on(table.aggregateId),
	],
);

// ---- Message Attachments ----

export const messageAttachments = pgTable(
	"message_attachments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
		type: attachmentTypeEnum("type").notNull(),
		displayOrder: smallint("display_order").default(0).notNull(),
		originalFileName: varchar("original_file_name", { length: 255 }).notNull(),
		mimeType: varchar("mime_type", { length: 150 }).notNull(),
		fileSize: bigint("file_size", { mode: "number" }).notNull(),
		storageKey: text("storage_key").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_attachment_message").on(table.messageId),
		index("idx_attachment_storage").on(table.storageKey),
		check("chk_attachment_size", sql`${table.fileSize} > 0`),
		check("chk_display_order", sql`${table.displayOrder} >= 0`),
	],
);

// ---- Message Reactions ----

export const messageReactions = pgTable(
	"message_reactions",
	{
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
		userUid: varchar("user_uid", { length: 128 }).notNull(),
		emoji: varchar("emoji", { length: 32 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.messageId, table.userUid] }),
		index("idx_reactions_message").on(table.messageId),
		index("idx_reactions_user").on(table.userUid),
	],
);

// ---- Polls ----

export const polls = pgTable("polls", {
	id: uuid("id").defaultRandom().primaryKey(),
	messageId: uuid("message_id")
		.notNull()
		.unique()
		.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
	multipleChoice: boolean("multiple_choice").default(false).notNull(),
	isClosed: boolean("is_closed").default(false).notNull(),
	closesAt: timestamp("closes_at", { withTimezone: true, mode: "string" }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});

// ---- Poll Options ----

export const pollOptions = pgTable(
	"poll_options",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		pollId: uuid("poll_id")
			.notNull()
			.references(() => polls.id, { onDelete: "cascade", onUpdate: "cascade" }),
		optionText: varchar("option_text", { length: 255 }).notNull(),
		displayOrder: smallint("display_order").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_poll_options_poll").on(table.pollId),
		unique("uq_poll_option_order").on(table.pollId, table.displayOrder),
		check("chk_poll_option_order", sql`${table.displayOrder} >= 0`),
	],
);

// ---- Poll Votes ----

export const pollVotes = pgTable(
	"poll_votes",
	{
		optionId: uuid("option_id")
			.notNull()
			.references(() => pollOptions.id, { onDelete: "cascade", onUpdate: "cascade" }),
		userUid: varchar("user_uid", { length: 128 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.optionId, table.userUid] }),
		index("idx_poll_votes_option").on(table.optionId),
		index("idx_poll_votes_user").on(table.userUid),
	],
);

// ---- Room Pins ----

export const roomPins = pgTable(
	"room_pins",
	{
		roomId: uuid("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade", onUpdate: "cascade" }),
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
		pinnedBy: varchar("pinned_by", { length: 128 }).notNull(),
		pinnedAt: timestamp("pinned_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.roomId, table.messageId] }),
		index("idx_room_pins_room").on(table.roomId),
	],
);

// ---- Message Reports ----

export const messageReports = pgTable(
	"message_reports",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		messageId: uuid("message_id")
			.notNull()
			.references(() => messages.id, { onDelete: "cascade", onUpdate: "cascade" }),
		reporterUid: varchar("reporter_uid", { length: 128 }).notNull(),
		reason: reportReasonEnum("reason").notNull(),
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("uq_report_once").on(table.messageId, table.reporterUid),
		index("idx_reports_message").on(table.messageId),
		index("idx_reports_reporter").on(table.reporterUid),
		index("idx_reports_created").on(table.createdAt),
	],
);

// ---- Moderation Actions ----

export const moderationActions = pgTable(
	"moderation_actions",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userUid: varchar("user_uid", { length: 128 }).notNull(),
		moderatorUid: varchar("moderator_uid", { length: 128 }).notNull(),
		action: moderationActionTypeEnum("action").notNull(),
		actionReason: text("action_reason"),
		messageId: uuid("message_id").references(() => messages.id, {
			onDelete: "set null",
			onUpdate: "cascade",
		}),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_mod_user").on(table.userUid),
		index("idx_mod_moderator").on(table.moderatorUid),
		index("idx_mod_created").on(table.createdAt),
	],
);

// ---- Inferred row types ----

export type RoomPolicy = typeof roomPolicies.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomMember = typeof roomMembers.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;
export type PollVote = typeof pollVotes.$inferSelect;
export type RoomPin = typeof roomPins.$inferSelect;
export type MessageReport = typeof messageReports.$inferSelect;
export type ModerationAction = typeof moderationActions.$inferSelect;
