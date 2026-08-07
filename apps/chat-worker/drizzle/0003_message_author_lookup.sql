-- ============================================================
-- Migration 0003 — Fast duplicate-spam lookup
-- ============================================================
-- The message write path checks the latest messages by (room, author) and
-- createdAt. Keep this index separate from idx_messages_room_created so the
-- query can stop after the requested ten rows without scanning other authors.

CREATE INDEX IF NOT EXISTS "idx_messages_room_author_created"
    ON "messages" ("room_id", "author_uid", "created_at", "id");
