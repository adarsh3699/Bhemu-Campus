-- ============================================================
-- Migration 0001 — Chat Schema Fix
-- Aligns DB with canonical schema.sql
--
-- Changes vs 0000:
--   messages:
--     + ADD COLUMN content       TEXT NOT NULL DEFAULT ''
--       (old column was TEXT nullable — backfill then set NOT NULL)
--     + ADD COLUMN edited_at     TIMESTAMPTZ
--     + ADD COLUMN deleted_at    TIMESTAMPTZ
--     - DROP COLUMN has_attachments
--     - DROP COLUMN is_edited
--     - DROP COLUMN is_pinned
--     + ADD INDEX   idx_messages_reply
--     + ADD INDEX   idx_messages_visibility
--     + ADD INDEX   idx_messages_created
--     + ADD CONSTRAINT chk_text_message
--   message_reports:
--     + ADD CONSTRAINT uq_report_once
--   room_policies:
--     + ADD CONSTRAINT chk_retention_days
--     + ADD CONSTRAINT chk_max_messages
--     + ADD CONSTRAINT chk_pin_limit
--   message_attachments:
--     + ADD CONSTRAINT chk_attachment_size
--     + ADD CONSTRAINT chk_display_order
--   poll_options:
--     + ADD CONSTRAINT chk_poll_option_order
--     + ADD CONSTRAINT uq_poll_option_order
-- ============================================================

-- ============================================================
-- STEP 1 — Migrate messages.content to NOT NULL DEFAULT ''
-- ============================================================

-- Backfill any existing NULLs before setting NOT NULL
UPDATE "messages"
SET "content" = ''
WHERE "content" IS NULL;

-- Now enforce NOT NULL with empty-string default
ALTER TABLE "messages"
    ALTER COLUMN "content" SET NOT NULL,
    ALTER COLUMN "content" SET DEFAULT '';

-- ============================================================
-- STEP 2 — Add new canonical columns to messages
-- ============================================================

ALTER TABLE "messages"
    ADD COLUMN IF NOT EXISTS "edited_at"  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

-- Backfill deleted_at from visibility for any soft-deleted rows
UPDATE "messages"
SET "deleted_at" = "updated_at"
WHERE "visibility" = 'DELETED'
  AND "deleted_at" IS NULL;

-- ============================================================
-- STEP 3 — Drop legacy columns that are not in canonical schema
-- ============================================================

ALTER TABLE "messages"
    DROP COLUMN IF EXISTS "has_attachments",
    DROP COLUMN IF EXISTS "is_edited",
    DROP COLUMN IF EXISTS "is_pinned";

-- ============================================================
-- STEP 4 — Add missing indexes on messages
-- ============================================================

CREATE INDEX IF NOT EXISTS "idx_messages_reply"
    ON "messages" ("reply_to_message_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_messages_visibility"
    ON "messages" ("visibility");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_messages_created"
    ON "messages" ("created_at" DESC);--> statement-breakpoint

-- ============================================================
-- STEP 5 — Add chk_text_message CHECK constraint
-- ============================================================

ALTER TABLE "messages"
    ADD CONSTRAINT "chk_text_message"
    CHECK (
        type <> 'TEXT'
        OR visibility = 'DELETED'
        OR LENGTH(TRIM(content)) > 0
    );

-- ============================================================
-- STEP 6 — uq_report_once on message_reports
-- ============================================================

ALTER TABLE "message_reports"
    ADD CONSTRAINT "uq_report_once"
    UNIQUE ("message_id", "reporter_uid");

-- ============================================================
-- STEP 7 — CHECK constraints on room_policies
-- ============================================================

ALTER TABLE "room_policies"
    ADD CONSTRAINT "chk_retention_days"
    CHECK (retention_days > 0),
    ADD CONSTRAINT "chk_max_messages"
    CHECK (max_messages > 0),
    ADD CONSTRAINT "chk_pin_limit"
    CHECK (pin_limit > 0 AND pin_limit <= 100);

-- ============================================================
-- STEP 8 — CHECK constraints on message_attachments
-- ============================================================

ALTER TABLE "message_attachments"
    ADD CONSTRAINT "chk_attachment_size"
    CHECK (file_size > 0),
    ADD CONSTRAINT "chk_display_order"
    CHECK (display_order >= 0);

-- ============================================================
-- STEP 9 — CHECK + UNIQUE constraints on poll_options
-- ============================================================

ALTER TABLE "poll_options"
    ADD CONSTRAINT "chk_poll_option_order"
    CHECK (display_order >= 0);

-- uq_poll_option_order — only add if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_poll_option_order'
    ) THEN
        ALTER TABLE "poll_options"
            ADD CONSTRAINT "uq_poll_option_order"
            UNIQUE ("poll_id", "display_order");
    END IF;
END$$;

-- ============================================================
-- STEP 10 — rooms uq_room_type (if not present from 0000)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_room_type'
    ) THEN
        ALTER TABLE "rooms"
            ADD CONSTRAINT "uq_room_type"
            UNIQUE ("type");
    END IF;
END$$;
