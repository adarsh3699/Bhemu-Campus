-- ============================================================
-- Migration 0006 — Remove retired duplicate-spam lookup index
-- ============================================================
-- Message duplicate admission now runs in the Room Durable Object. The
-- author/time index created by migration 0003 is no longer read and only
-- adds write amplification to every message insert.

DROP INDEX IF EXISTS "idx_messages_room_author_created";
