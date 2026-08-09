-- ============================================================
-- Migration 0005 — Database-authoritative message idempotency
-- ============================================================
-- The unique key is scoped to the room and authenticated author. NULL keys
-- are not stored in this table, so ordinary messages are unaffected.

CREATE TABLE IF NOT EXISTS "message_idempotency" (
    "room_id" uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "author_uid" varchar(128) NOT NULL,
    "key" varchar(128) NOT NULL,
    "message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("room_id", "author_uid", "key"),
    CONSTRAINT "uq_message_idempotency_message" UNIQUE ("message_id")
);

CREATE INDEX IF NOT EXISTS "idx_message_idempotency_created"
    ON "message_idempotency" ("created_at");
