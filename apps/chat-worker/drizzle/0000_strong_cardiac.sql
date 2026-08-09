CREATE TYPE "public"."app_role" AS ENUM('STUDENT', 'MODERATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."attachment_type" AS ENUM('IMAGE', 'DOCUMENT', 'GIF');--> statement-breakpoint
CREATE TYPE "public"."message_type" AS ENUM('TEXT', 'IMAGE', 'DOCUMENT', 'GIF', 'POLL', 'ANNOUNCEMENT', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."message_visibility" AS ENUM('VISIBLE', 'HIDDEN', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."moderation_action_type" AS ENUM('WARN', 'FLAG', 'UNFLAG', 'SUSPEND', 'BAN', 'DELETE_MESSAGE');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('SPAM', 'HARASSMENT', 'ABUSE', 'INAPPROPRIATE', 'MISINFORMATION', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('UNIVERSITY', 'BATCHMATE');--> statement-breakpoint
CREATE TYPE "public"."room_visibility" AS ENUM('PUBLIC', 'PRIVATE', 'HIDDEN');--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"type" "attachment_type" NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"original_file_name" varchar(255) NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"file_size" bigint NOT NULL,
	"storage_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_attachments_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"message_id" uuid NOT NULL,
	"user_uid" varchar(128) NOT NULL,
	"emoji" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_user_uid_pk" PRIMARY KEY("message_id","user_uid")
);
--> statement-breakpoint
CREATE TABLE "message_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"reporter_uid" varchar(128) NOT NULL,
	"reason" "report_reason" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"author_uid" varchar(128) NOT NULL,
	"reply_to_message_id" uuid,
	"type" "message_type" DEFAULT 'TEXT' NOT NULL,
	"visibility" "message_visibility" DEFAULT 'VISIBLE' NOT NULL,
	"content" text,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_uid" varchar(128) NOT NULL,
	"moderator_uid" varchar(128) NOT NULL,
	"action" "moderation_action_type" NOT NULL,
	"action_reason" text,
	"message_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_text" varchar(255) NOT NULL,
	"display_order" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"option_id" uuid NOT NULL,
	"user_uid" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_option_id_user_uid_pk" PRIMARY KEY("option_id","user_uid")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"multiple_choice" boolean DEFAULT false NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "polls_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"room_id" uuid NOT NULL,
	"user_uid" varchar(128) NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_members_room_id_user_uid_pk" PRIMARY KEY("room_id","user_uid")
);
--> statement-breakpoint
CREATE TABLE "room_pins" (
	"room_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"pinned_by" varchar(128) NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_pins_room_id_message_id_pk" PRIMARY KEY("room_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "room_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"retention_days" integer NOT NULL,
	"max_messages" integer NOT NULL,
	"send_message_role" "app_role" NOT NULL,
	"send_attachment_role" "app_role" NOT NULL,
	"create_poll_role" "app_role" NOT NULL,
	"create_announcement_role" "app_role" NOT NULL,
	"pin_message_role" "app_role" NOT NULL,
	"pin_limit" smallint DEFAULT 5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_policies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"type" "room_type" NOT NULL,
	"visibility" "room_visibility" DEFAULT 'PUBLIC' NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"message_count" bigint DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_reply" FOREIGN KEY ("reply_to_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_pins" ADD CONSTRAINT "room_pins_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "room_pins" ADD CONSTRAINT "room_pins_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_policy_id_room_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."room_policies"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_attachment_message" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_attachment_storage" ON "message_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_reactions_message" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_reactions_user" ON "message_reactions" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "idx_reports_message" ON "message_reports" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_reports_reporter" ON "message_reports" USING btree ("reporter_uid");--> statement-breakpoint
CREATE INDEX "idx_reports_created" ON "message_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_room_created" ON "messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_author" ON "messages" USING btree ("author_uid");--> statement-breakpoint
CREATE INDEX "idx_mod_user" ON "moderation_actions" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "idx_mod_moderator" ON "moderation_actions" USING btree ("moderator_uid");--> statement-breakpoint
CREATE INDEX "idx_mod_created" ON "moderation_actions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_poll_options_poll" ON "poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "idx_poll_votes_option" ON "poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "idx_poll_votes_user" ON "poll_votes" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "idx_room_members_user" ON "room_members" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "idx_room_members_room" ON "room_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_room_pins_room" ON "room_pins" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_rooms_type" ON "rooms" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_rooms_last_message" ON "rooms" USING btree ("last_message_at");