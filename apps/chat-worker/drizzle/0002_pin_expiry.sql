-- ============================================================
-- Migration 0002 — Expiring room pins
-- ============================================================

ALTER TABLE "room_pins"
    ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_room_pins_expiry"
    ON "room_pins" ("expires_at")
    WHERE "expires_at" IS NOT NULL;
