-- Schema Version: 1.0 (Reviewed)
-- ============================================================
-- bCampus Communication Platform
-- PostgreSQL Schema v1.0
--
-- Part 1 - Foundation
--
-- PostgreSQL 17+
-- Neon Compatible
-- Drizzle Compatible
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE room_type AS ENUM (
    'UNIVERSITY',
    'BATCHMATE'
);

CREATE TYPE room_visibility AS ENUM (
    'PUBLIC',
    'PRIVATE',
    'HIDDEN'
);

CREATE TYPE app_role AS ENUM (
    'STUDENT',
    'MODERATOR',
    'ADMIN'
);

CREATE TYPE message_type AS ENUM (
    'TEXT',
    'IMAGE',
    'DOCUMENT',
    'GIF',
    'POLL',
    'ANNOUNCEMENT',
    'SYSTEM'
);

CREATE TYPE message_visibility AS ENUM (
    'VISIBLE',
    'HIDDEN',
    'DELETED'
);

CREATE TYPE attachment_type AS ENUM (
    'IMAGE',
    'DOCUMENT',
    'GIF'
);

CREATE TYPE report_reason AS ENUM (
    'SPAM',
    'HARASSMENT',
    'ABUSE',
    'INAPPROPRIATE',
    'MISINFORMATION',
    'OTHER'
);

CREATE TYPE moderation_action_type AS ENUM (
    'WARN',
    'FLAG',
    'UNFLAG',
    'SUSPEND',
    'BAN',
    'DELETE_MESSAGE'
);

-- ============================================================
-- ROOM POLICIES
-- ============================================================

CREATE TABLE room_policies (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    name VARCHAR(100)
        NOT NULL
        UNIQUE,

    retention_days INTEGER
        NOT NULL,

    max_messages INTEGER
        NOT NULL,

    send_message_role app_role
        NOT NULL,

    send_attachment_role app_role
        NOT NULL,

    create_poll_role app_role
        NOT NULL,

    create_announcement_role app_role
        NOT NULL,

    pin_message_role app_role
        NOT NULL,

    pin_limit SMALLINT
        NOT NULL
        DEFAULT 5,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT chk_retention_days
        CHECK (retention_days > 0),

    CONSTRAINT chk_max_messages
        CHECK (max_messages > 0),

    CONSTRAINT chk_pin_limit
        CHECK (
            pin_limit > 0
            AND pin_limit <= 100
        )
);

COMMENT ON TABLE room_policies
IS 'Defines room behavior and permissions.';

-- ============================================================
-- ROOMS
-- ============================================================

CREATE TABLE rooms (

    id UUID PRIMARY KEY
        DEFAULT gen_random_uuid(),

    policy_id UUID
        NOT NULL,

    type room_type
        NOT NULL,

    visibility room_visibility
        NOT NULL
        DEFAULT 'PUBLIC',

    name VARCHAR(100)
        NOT NULL,

    description TEXT,

    message_count BIGINT
        NOT NULL
        DEFAULT 0,

    last_message_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_rooms_policy
        FOREIGN KEY (policy_id)
        REFERENCES room_policies(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_room_type
        UNIQUE(type)
);

COMMENT ON TABLE rooms
IS 'Every chat room inside bCampus.';

-- ============================================================
-- ROOM MEMBERS
-- ============================================================

CREATE TABLE room_members (

    room_id UUID
        NOT NULL,

    user_uid VARCHAR(128)
        NOT NULL,

    notifications_enabled BOOLEAN
        NOT NULL
        DEFAULT TRUE,

    joined_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    PRIMARY KEY (
        room_id,
        user_uid
    ),

    CONSTRAINT fk_room_members_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

CREATE INDEX idx_rooms_type
ON rooms(type);

CREATE INDEX idx_rooms_last_message
ON rooms(last_message_at DESC);

CREATE INDEX idx_room_members_user
ON room_members(user_uid);

CREATE INDEX idx_room_members_room
ON room_members(room_id);

-- ============================================================
-- TABLE: messages
-- ============================================================

CREATE TABLE messages (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    room_id UUID
        NOT NULL,

    author_uid VARCHAR(128)
        NOT NULL,

    reply_to_message_id UUID,

    type message_type
        NOT NULL
        DEFAULT 'TEXT',

    visibility message_visibility
        NOT NULL
        DEFAULT 'VISIBLE',

    content TEXT
        NOT NULL
        DEFAULT '',

    edited_at TIMESTAMPTZ,

    deleted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_messages_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_messages_reply
        FOREIGN KEY (reply_to_message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_text_message
        CHECK (
            type <> 'TEXT'
            OR LENGTH(TRIM(content)) > 0
        )
);

COMMENT ON TABLE messages
IS 'Stores every chat message.';

COMMENT ON COLUMN messages.reply_to_message_id
IS 'Parent message when replying.';

COMMENT ON COLUMN messages.visibility
IS 'Current moderation visibility state.';

COMMENT ON COLUMN messages.deleted_at
IS 'Soft delete timestamp.';

-- ============================================================
-- MESSAGE INDEXES
-- ============================================================

CREATE INDEX idx_messages_room_created
ON messages (
    room_id,
    created_at DESC,
    id DESC
);

CREATE INDEX idx_messages_reply
ON messages(reply_to_message_id);

CREATE INDEX idx_messages_author
ON messages(author_uid);

CREATE INDEX idx_messages_visibility
ON messages(visibility);

CREATE INDEX idx_messages_created
ON messages(created_at DESC);

-- ============================================================
-- TABLE: message_attachments
-- ============================================================

CREATE TABLE message_attachments (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    message_id UUID
        NOT NULL,

    type attachment_type
        NOT NULL,

    display_order SMALLINT
        NOT NULL
        DEFAULT 0,

    original_file_name VARCHAR(255)
        NOT NULL,

    mime_type VARCHAR(150)
        NOT NULL,

    file_size BIGINT
        NOT NULL,

    storage_key TEXT
        NOT NULL
        UNIQUE,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_attachment_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_attachment_size
        CHECK (
            file_size > 0
        ),

    CONSTRAINT chk_display_order
        CHECK (
            display_order >= 0
        )
);

COMMENT ON TABLE message_attachments
IS 'Attachment metadata. Files are stored in Cloudflare R2.';

COMMENT ON COLUMN message_attachments.storage_key
IS 'Unique object key inside Cloudflare R2.';

-- ============================================================
-- ATTACHMENT INDEXES
-- ============================================================

CREATE INDEX idx_attachment_message
ON message_attachments(message_id);

CREATE INDEX idx_attachment_storage
ON message_attachments(storage_key);

-- ============================================================
-- TABLE: message_reactions
-- ============================================================

CREATE TABLE message_reactions (

    message_id UUID
        NOT NULL,

    user_uid VARCHAR(128)
        NOT NULL,

    emoji VARCHAR(32)
        NOT NULL,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    PRIMARY KEY (
        message_id,
        user_uid
    ),

    CONSTRAINT fk_reactions_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

COMMENT ON TABLE message_reactions
IS 'Stores one reaction per user for each message.';

CREATE INDEX idx_reactions_message
ON message_reactions(message_id);

CREATE INDEX idx_reactions_user
ON message_reactions(user_uid);

-- ============================================================
-- TABLE: polls
-- ============================================================

CREATE TABLE polls (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    message_id UUID
        NOT NULL
        UNIQUE,

    multiple_choice BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    is_closed BOOLEAN
        NOT NULL
        DEFAULT FALSE,

    closes_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_poll_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

COMMENT ON TABLE polls
IS 'Additional poll configuration for POLL messages.';

-- ============================================================
-- TABLE: poll_options
-- ============================================================

CREATE TABLE poll_options (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    poll_id UUID
        NOT NULL,

    option_text VARCHAR(255)
        NOT NULL,

    display_order SMALLINT
        NOT NULL,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_poll_option
        FOREIGN KEY (poll_id)
        REFERENCES polls(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_poll_option_order
        CHECK (
            display_order >= 0
        ),

    CONSTRAINT uq_poll_option_order
        UNIQUE (
            poll_id,
            display_order
        )
);

COMMENT ON TABLE poll_options
IS 'Available options for a poll.';

CREATE INDEX idx_poll_options_poll
ON poll_options(poll_id);

-- ============================================================
-- TABLE: poll_votes
-- ============================================================

CREATE TABLE poll_votes (

    option_id UUID
        NOT NULL,

    user_uid VARCHAR(128)
        NOT NULL,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    PRIMARY KEY (
        option_id,
        user_uid
    ),

    CONSTRAINT fk_poll_vote
        FOREIGN KEY (option_id)
        REFERENCES poll_options(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

COMMENT ON TABLE poll_votes
IS 'Stores votes for poll options.';

CREATE INDEX idx_poll_votes_option
ON poll_votes(option_id);

CREATE INDEX idx_poll_votes_user
ON poll_votes(user_uid);

-- ============================================================
-- TABLE: room_pins
-- ============================================================

CREATE TABLE room_pins (

    room_id UUID
        NOT NULL,

    message_id UUID
        NOT NULL,

    pinned_by VARCHAR(128)
        NOT NULL,

    pinned_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    PRIMARY KEY (
        room_id,
        message_id
    ),

    CONSTRAINT fk_room_pins_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_room_pins_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
);

COMMENT ON TABLE room_pins
IS 'Stores pinned messages for each room.';

CREATE INDEX idx_room_pins_room
ON room_pins(room_id);

-- ============================================================
-- TABLE: message_reports
-- ============================================================

CREATE TABLE message_reports (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    message_id UUID
        NOT NULL,

    reporter_uid VARCHAR(128)
        NOT NULL,

    reason report_reason
        NOT NULL,

    description TEXT,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_reports_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_report_once
        UNIQUE (
            message_id,
            reporter_uid
        )
);

COMMENT ON TABLE message_reports
IS 'Stores reports submitted against messages.';

CREATE INDEX idx_reports_message
ON message_reports(message_id);

CREATE INDEX idx_reports_reporter
ON message_reports(reporter_uid);

CREATE INDEX idx_reports_created
ON message_reports(created_at DESC);

-- ============================================================
-- TABLE: moderation_actions
-- ============================================================

CREATE TABLE moderation_actions (

    id UUID
        PRIMARY KEY
        DEFAULT gen_random_uuid(),

    user_uid VARCHAR(128)
        NOT NULL,

    moderator_uid VARCHAR(128)
        NOT NULL,

    action moderation_action_type
        NOT NULL,

    action_reason TEXT,

    message_id UUID,

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

    CONSTRAINT fk_mod_message
        FOREIGN KEY (message_id)
        REFERENCES messages(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

COMMENT ON TABLE moderation_actions
IS 'Immutable audit log of moderator actions.';

CREATE INDEX idx_mod_user
ON moderation_actions(user_uid);

CREATE INDEX idx_mod_moderator
ON moderation_actions(moderator_uid);

CREATE INDEX idx_mod_created
ON moderation_actions(created_at DESC);

-- ============================================================
-- DEFAULT ROOM POLICIES
-- ============================================================

INSERT INTO room_policies (

    name,

    retention_days,
    max_messages,

    send_message_role,
    send_attachment_role,

    create_poll_role,
    create_announcement_role,

    pin_message_role,

    pin_limit

)

VALUES

(

    'University',

    45,
    100000,

    'STUDENT',
    'STUDENT',

    'MODERATOR',
    'ADMIN',

    'MODERATOR',

    5

),

(

    'Batchmate',

    180,
    25000,

    'STUDENT',
    'STUDENT',

    'STUDENT',
    'MODERATOR',

    'MODERATOR',

    5

);

-- ============================================================
-- DEFAULT ROOMS
-- ============================================================

INSERT INTO rooms (

    policy_id,

    type,

    visibility,

    name,

    description

)

SELECT

    id,

    'UNIVERSITY',

    'PUBLIC',

    'University',

    'Official university chat.'

FROM room_policies

WHERE name='University';



INSERT INTO rooms (

    policy_id,

    type,

    visibility,

    name,

    description

)

SELECT

    id,

    'BATCHMATE',

    'PUBLIC',

    'Batchmate',

    'Official batchmate chat.'

FROM room_policies

WHERE name='Batchmate';