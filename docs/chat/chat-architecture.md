# bCampus Communication System – Architecture Discussion

## Background

bCampus is an academic platform (Web + Expo) built around Firebase.

Current architecture includes:

- Firebase Authentication
- Firestore
- UMS Extension
- GPA & Marks
- Attendance
- Leaderboard
- Profile Sharing
- Real-time collaborative profile editing

Firestore is already well-structured for academic and collaborative data and **will continue to be used only for those features**.

The communication system must be developed as a **separate service**, without affecting the existing Firestore architecture.

---

# High-Level Goals

Design a production-ready communication platform that:

- Works on both Web and Expo.
- Shares one backend.
- Supports at least 500 concurrent users initially.
- Can scale to thousands of concurrent users with minimal architectural changes.
- Remains as close to free as possible during early development.

---

# Hosting Decision

After evaluating several free hosting providers:

- Render Free → Not suitable due to sleeping/cold starts for realtime communication.
- Oracle Cloud → Not feasible because it requires a credit card.
- Railway/Fly/Koyeb → Free tiers are limited or already exhausted.

Therefore, the chosen platform is:

**Cloudflare Workers**

---

# Communication Architecture

Instead of building a traditional Node.js server with Express + Socket.IO, the communication service will be built using Cloudflare's native architecture.

Proposed stack:

- Cloudflare Workers
- Durable Objects
- Native WebSockets
- Neon PostgreSQL
- Cloudflare R2
- Firebase Authentication

---

# Authentication

Firebase Authentication remains the upstream identity provider. The client
exchanges its Firebase ID token once at `POST /api/v1/session`; the Worker
resolves the Firestore profile and returns a short-lived signed chat session.

All normal chat REST requests and WebSocket connections send only that chat
session. The Worker verifies it locally and uses the embedded Firebase UID as
the application's identity, so message traffic never falls back to a
Firebase/Firestore lookup.

The Durable Object receives only trusted user information and never verifies
Firebase or chat-session tokens itself.

---

# Database Responsibilities

## Firestore

Continue using Firestore only for:

- Academic data
- GPA
- Attendance
- Marks
- Profiles
- Leaderboard
- Collaborative profile editing

## Neon PostgreSQL

Store communication-related data:

- Rooms
- Members
- Messages
- Reactions
- Read receipts
- Attachments
- Moderation data

## Cloudflare R2

Store:

- Images
- Videos
- Documents
- Voice notes
- Other media

---

# Realtime Layer

Realtime communication should use:

Cloudflare Workers + Durable Objects + Native WebSockets.

Durable Objects will manage:

- Active WebSocket connections
- Presence
- Typing indicators
- Live room state
- Message admission, room sequencing, and low-latency broadcasting

Persistent chat history should always be stored in PostgreSQL.

PostgreSQL stores the immutable `room_events` record in the same message
transaction. WebSockets are the fast delivery path; reconnects and sequence
gaps recover through the membership-protected replay endpoint. The REST
message-create endpoint is intentionally removed, while REST history remains
available for snapshots and expired replay recovery.

---

# Redis Discussion

Redis will **not** be included in the initial architecture.

Reason:

Traditional Node.js applications require Redis for Pub/Sub and distributed realtime coordination.

Cloudflare Durable Objects already provide stateful coordination for realtime rooms.

Redis should only be introduced later if future requirements justify it, such as:

- Distributed caching
- Background processing
- Cross-service coordination
- Heavy analytics
- AI caching

Redis is considered an optimization, not a foundation.

---

# Why Not Express + Socket.IO?

Express + Socket.IO is designed around long-running Node.js servers.

Cloudflare Workers do not execute as permanent Node.js processes.

Instead, Cloudflare provides:

- Native WebSockets
- Durable Objects

These services replace the need for a traditional Socket.IO server in a Cloudflare-native architecture.

---

# Scalability Strategy

Initial architecture should comfortably support several hundred concurrent users.

As traffic grows:

- Additional Durable Objects will automatically handle more rooms.
- PostgreSQL remains the persistent datastore.
- R2 continues storing media.
- Redis and other distributed infrastructure should only be introduced when required.

The architecture should avoid unnecessary complexity during the MVP while remaining scalable for future growth.

---

# Design Philosophy

The communication system should be treated as an independent platform within bCampus.

Academic features continue using Firebase.

Communication features use Cloudflare's realtime ecosystem.

Both systems should integrate through Firebase Authentication while remaining loosely coupled.

---

# Next Step

This document only establishes the architecture and technology decisions.

The next phase will define the exact product requirements, including:

- Features
- User experience
- Room types
- Permissions
- APIs
- Events
- Database schema
- Implementation roadmap
- Deployment strategy
