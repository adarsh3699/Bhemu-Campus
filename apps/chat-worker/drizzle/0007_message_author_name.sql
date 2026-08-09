-- ============================================================
-- Migration 0007 — Immutable message author display name
-- ============================================================
-- A message carries its display-name snapshot so history, room-event replay,
-- and WebSocket fan-out never need a per-message Firestore profile lookup.
-- Existing history receives the neutral fallback used by the UI.

ALTER TABLE "messages"
    ADD COLUMN IF NOT EXISTS "author_name" varchar(100) NOT NULL DEFAULT 'Student';
