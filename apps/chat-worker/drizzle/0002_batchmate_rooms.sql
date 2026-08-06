-- ============================================================
-- Migration 0002 — Batchmate Multi-Room Support
-- ============================================================
-- Changes:
--   rooms:
--     - DROP CONSTRAINT uq_room_type  (was blocking multiple BATCHMATE rooms)
--     + ADD COLUMN group_key VARCHAR(100)  (e.g. "2024_P132", null for UNIVERSITY)
--     + ADD INDEX idx_rooms_group_key
--     + ADD UNIQUE(type, group_key) — one room per type+group combination
-- ============================================================

-- 1. Drop the old single-type-per-room constraint
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS uq_room_type;

-- 2. Add group_key column (null for UNIVERSITY, set for BATCHMATE)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS group_key VARCHAR(100);

-- 3. Set group_key = 'UNIVERSITY' for the existing university room
--    (so the new unique constraint doesn't conflict with itself)
UPDATE rooms SET group_key = 'UNIVERSITY' WHERE type = 'UNIVERSITY';

-- 4. Set group_key for the existing batchmate room (use a placeholder)
UPDATE rooms SET group_key = 'DEFAULT' WHERE type = 'BATCHMATE' AND group_key IS NULL;

-- 5. New composite unique: one room per (type, group_key) pair
ALTER TABLE rooms
    ADD CONSTRAINT uq_room_type_group
    UNIQUE (type, group_key);

-- 6. Index for fast lookup by group_key
CREATE INDEX IF NOT EXISTS idx_rooms_group_key
    ON rooms (group_key)
    WHERE group_key IS NOT NULL;
