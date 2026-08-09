-- ============================================================
-- Migration 0004 — Durable room event stream
-- ============================================================
--
-- Events are written in the same database batch as the message write. The
-- Room Durable Object allocates room_seq values for a serialized room;
-- gaps are valid when a reserved command fails and are repaired by cursor
-- replay.

CREATE TABLE IF NOT EXISTS "room_events" (
    "room_id" uuid NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "room_seq" bigint NOT NULL,
    "event_id" uuid NOT NULL UNIQUE,
    "event_type" varchar(64) NOT NULL,
    "aggregate_id" uuid,
    "version" integer NOT NULL DEFAULT 1,
    "payload" jsonb NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("room_id", "room_seq")
);

CREATE INDEX IF NOT EXISTS "idx_room_events_created"
    ON "room_events" ("room_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_room_events_aggregate"
    ON "room_events" ("aggregate_id");
