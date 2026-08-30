# bCampus Communication Domain Model

> Version: 1.0
>
> Status: Approved
>
> This document defines the **business domain** of the bCampus Communication Platform.
> It intentionally does **not** describe database tables, APIs, or implementation details.
> Those will be designed in later phases.
>
> This document acts as the foundation for the PostgreSQL schema, Cloudflare Workers architecture, WebSocket events, and REST APIs.

---

# Design Philosophy

The communication system is **not a chat feature**.

It is an independent communication platform inside bCampus.

Design goals:

- Simple to understand
- Easy to extend
- Production-ready
- Scalable
- Low operational cost
- Cloudflare-native
- Works for both Web and Expo

---

# Core Principle

Everything revolves around a **Room**.

Nothing exists outside a Room.

```
User
 │
 ├──── joins ───► Room
 │                  │
 │                  ├──── contains ───► Message
 │                  │                      │
 │                  │                      ├── Reply
 │                  │                      ├── Attachment
 │                  │                      ├── Reaction
 │                  │                      ├── Report
 │                  │                      └── Read Receipt (future)
 │                  │
 │                  ├──── Poll
 │                  ├──── Pin
 │                  └──── Announcement
 │
 └──── Moderator Action
```

---

# Domain Objects

## 1. User

The communication service **does not own users**.

User identity belongs to Firebase + Firestore.

Communication only references the Firebase UID.

Current identity consists of:

- uid
- username
- displayName
- photoURL
- role
- moderation

No academic information is duplicated.

---

## 2. Room

A Room is the highest-level communication object.

Every conversation belongs to exactly one Room.

Current room types:

- University
- Batchmate

Future room types:

- Club
- Department
- Subject
- Event
- Placement
- Lost & Found
- Direct Message
- Study Group

A room owns:

- Messages
- Members
- Polls
- Pins
- Announcements

---

## 3. Room Member

Users do not directly belong to messages.

Users belong to Rooms.

A Room Member defines participation inside a room.

Today, membership is automatic.

Future room types may support joining and leaving manually.

---

## 4. Message

Everything visible in chat is a Message.

There are **not** separate database entities like ImageMessage or PollMessage.

Every item in chat is simply a Message with a different type.

Supported message types:

- Text
- Image
- Document
- GIF
- Poll
- Announcement
- System

Future:

- Voice
- Video
- Event
- Quiz
- AI Summary

---

## 5. Reply

Replies are not independent objects.

A reply is simply a Message referencing another Message.

This keeps conversations simple while supporting nested discussions.

---

## 6. Attachment

A Message may contain zero or more Attachments.

Supported attachment types:

- Image
- PDF
- Document
- ZIP
- Video

Attachments are stored in Cloudflare R2.

Only metadata belongs to the communication database.

---

## 7. Reaction

A Reaction represents one user's reaction to one message.

Supported examples:

- 👍
- ❤️
- 😂
- 🎉

Reactions are independent from Messages.

---

## 8. Poll

A Poll belongs to a Message.

Polls support:

- Single choice
- Multiple choice (future)
- Anonymous voting (future)
- Closing
- Reopening
- Live results

---

## 9. Announcement

An Announcement is a Message with elevated permissions.

It is not a separate communication object.

Only authorized roles may create announcements.

---

## 10. Pin

Pins belong to Rooms.

A Room controls which messages remain pinned.

Messages themselves do not know whether they are pinned.

A pin may last 8 hours, 1 day, 1 week, 1 month, or Forever. Expired pins are
removed from the active room pin set automatically.

---

## 11. Report

Reports belong to Messages.

Users report messages.

Moderation decisions are derived from message reports.

This prevents abuse and provides better moderation history.

---

## 12. Moderation Action

Every moderator action creates an immutable moderation history.

Examples:

- Warn
- Suspend
- Ban
- Remove Flag
- Delete Message
- Pin Message
- Create Announcement

This is an audit log.

It should never be modified or deleted.

---

## 13. Presence

Presence is **not persistent**.

Examples:

- Online
- Offline
- Typing
- Active WebSocket

Presence exists only inside Durable Objects.

It is never stored in PostgreSQL.

---

## 14. Notifications

Notifications are an independent subsystem.

They are not chat messages.

Future examples:

- Mention
- Reply
- Announcement
- Poll ended

---

# Room Policy

Every Room is governed by a configurable policy defining capabilities and permissions. Behavior should never be hardcoded; business rules must be **data-driven**.

### Example Structure & Read-Only Room

```yaml
University:
    retention: { days: 45, max_messages: 100000 }
    permissions:
        send_messages: [student, moderator, admin]
        send_attachments: [student, moderator, admin]
        create_polls: [moderator, admin]
        create_announcements: [admin]
        pin_messages: [moderator, admin]
    limits: { pin_limit: 5 }

# Read-Only Example: Students can view/react, but cannot send or create polls.
PlacementNotices:
    retention: { days: 365, max_messages: 5000 }
    permissions:
        send_messages: [moderator, admin]
        send_attachments: [moderator, admin]
        create_polls: [admin]
        create_announcements: [admin]
        pin_messages: [admin]
    limits: { pin_limit: 10, max_pinned_messages: 10, max_attachment_size_mb: 50, max_attachments_per_message: 10 }
```

### Why Room Policies?

Adding a new room type (e.g., Club Chat, Lost & Found, Placement Notices) should require **only a new Room Policy**. Because policies control who can send messages, upload files, or create polls, no backend or frontend code needs to be rewritten when introducing new room models.

---

# Out of Scope

The following are intentionally excluded from the communication database:

- Online users
- Typing indicators
- Active WebSocket connections
- Temporary spam counters
- Duplicate message detection state
- In-memory room state

These belong exclusively to Cloudflare Durable Objects.

---

# Future Expansion

The architecture should support future features without redesign:

- Direct Messages
- Subject Discussions
- Clubs
- Events
- Placement Communities
- AI Study Assistant
- Voice Channels
- Video Calls
- Collaborative Study Sessions
- Quiz Rooms
- File Collaboration

No existing domain object should require breaking changes.

---

---

# Zero JSON Rule

Unless there's a very strong reason, don't store JSON in PostgreSQL.

**Bad**

- settings JSONB
- members JSONB
- reactions JSONB
- attachments JSONB

**Good**

- rooms
  ↓
- room_members
  ↓
- messages
  ↓
- attachments
  ↓
- reactions

**Why?**

- Easier indexing
- Easier migrations
- Better SQL queries
- Better constraints
- Better analytics

The only place I currently accept JSON is where the structure is truly dynamic (if we ever add configurable room policies stored in the database). Otherwise, prefer normalized columns and tables.

---

# Message Visibility

Instead of `deleted`, think `visibility`.

Possible values:

- `visible`
- `hidden`
- `deleted`

**Example:**

- `visible` → everyone sees it.
- `hidden` → hidden from users, still visible to moderators (e.g., after automatic flagging or pending review).
- `deleted` → removed by moderator or author, retained only for audit/retention purposes.

This gives you much more flexibility than a simple delete flag.

---

# Approved Principles

- Firestore owns identity and permissions.
- PostgreSQL owns communication data.
- Cloudflare R2 owns media.
- Durable Objects own realtime state.
- Every communication object belongs to a Room.
- Every visible item is a Message.
- Presence is never persisted.
- Business rules are driven by Room Policies.
- The architecture should remain simple today while scaling for future growth.
