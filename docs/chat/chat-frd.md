# bCampus Chat Backend

## Functional Requirements Document (FRD)

**Version:** 1.0

**Status:** Draft

**Project:** bCampus

**Module:** Communication Platform

---

# 1. Introduction

## 1.1 Purpose

This document defines the functional and technical requirements for the bCampus Chat backend.

The objective is to build a scalable, production-ready, real-time communication system that supports university-wide communication while remaining cost-efficient enough to operate on free-tier infrastructure during the initial growth phase.

This document serves as the single source of truth for backend implementation.

Claude Code should implement the backend according to this document without making architectural decisions independently.

---

# 1.2 Project Overview

bCampus is a university ecosystem application.

The Communication Platform is one module inside bCampus.

Unlike WhatsApp or Telegram, users cannot create private groups.

All communication happens inside predefined rooms managed by the application.

Initially the platform contains two rooms:

• University

• Batchmate

Additional system rooms may be added in future releases.

Examples

- Placement
- Hostel
- Department
- Club
- Event

The architecture must support these future rooms without requiring database redesign.

---

# 1.3 Objectives

The backend must provide:

- Real-time messaging
- Low latency
- High reliability
- Secure authentication
- Moderation tools
- File sharing
- Polls
- Message reactions
- Announcements
- Automatic cleanup
- Horizontal scalability
- Clean architecture
- Type-safe implementation

The backend must be deployable entirely on free-tier infrastructure.

---

# 1.4 Non Goals

The following features are explicitly excluded from Version 1.

- Direct Messages (DM)
- Voice Chat
- Video Calls
- Threads
- Stories
- AI Chatbot
- Search Engine
- Message Translation
- End-to-End Encryption
- Message Scheduling
- Read Receipts
- Online Status
- Last Seen
- Typing Indicator History

These features may be introduced in future phases.

The database architecture should not depend on them.

---

# 1.5 Design Principles

The entire backend must follow these principles.

## Simplicity

Do not introduce unnecessary abstractions.

Avoid overengineering.

Business logic should remain easy to understand.

---

## Performance

Optimize for

- fast reads
- fast writes
- low latency

Never optimize for hypothetical future requirements.

---

## Scalability

The architecture should comfortably support

500–5000 concurrent active users

without redesign.

Scaling beyond this should require infrastructure upgrades rather than architectural rewrites.

---

## Single Responsibility

Every component must own exactly one responsibility.

Examples

Firestore

↓

Identity

PostgreSQL

↓

Communication data

Cloudflare Worker

↓

Business logic

Durable Objects

↓

Realtime synchronization

Cloudflare R2

↓

Media storage

---

## Database Philosophy

PostgreSQL stores data.

Business logic belongs inside the Worker.

The database should enforce

- constraints
- relationships
- integrity

The database should not contain business logic.

No triggers.

No stored procedures.

No SQL functions.

---

## Source of Truth

Each responsibility has exactly one source of truth.

Authentication

↓

Firebase Authentication

User Profile

↓

Firestore

Chat Data

↓

PostgreSQL

Realtime State

↓

Durable Objects

Media

↓

Cloudflare R2

No data should exist in multiple places unless explicitly required.

---

# 1.6 Success Criteria

The backend will be considered complete only when all of the following conditions are satisfied.

- Database schema frozen.
- Drizzle schema implemented.
- Repository layer complete.
- Service layer complete.
- Every HTTP endpoint implemented.
- Every WebSocket event implemented.
- Every database constraint validated.
- Every permission validated.
- Backend deployed successfully.
- All automated tests passing.
- No TODOs.
- No stub methods.
- No TypeScript errors.
- No ESLint errors.
- Production-ready deployment achieved.

Completion of this document marks the transition to Frontend Development.

# 2. System Architecture

## 2.1 Overview

The bCampus Communication Platform follows a distributed, service-oriented architecture designed specifically for Cloudflare Workers.

The backend is fully stateless except for real-time communication, which is managed using Cloudflare Durable Objects.

Each infrastructure component has one clearly defined responsibility.

```
                 Client (Expo / Web)
                        │
              HTTPS / WebSocket
                        │
                        ▼
            Cloudflare Worker (Hono)
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
 Firebase Auth      Durable Objects    Neon PostgreSQL
        │               │                │
        ▼               ▼                ▼
 Firestore        Realtime State      Chat Database
                        │
                        ▼
                 Cloudflare R2
                  Media Storage
```

The Worker acts as the single entry point for all requests.

No client communicates directly with PostgreSQL.

No client communicates directly with Durable Objects.

All requests must pass through authentication and authorization before reaching business logic.

---

# 2.2 High-Level Architecture

The backend consists of six logical layers.

```
Client

↓

Authentication

↓

HTTP API

↓

Service Layer

↓

Repository Layer

↓

Database
```

Each layer has exactly one responsibility.

---

# 2.3 Component Responsibilities

## Firebase Authentication

Purpose

Authenticate users.

Responsibilities

- Login
- Signup
- JWT generation
- Session validation

Firebase Authentication **must never** store chat data.

---

## Firestore

Purpose

Store identity and profile information.

Responsibilities

- User profile
- Username
- Display name
- Photo URL
- Roles
- Moderation status
- Active / Suspended / Banned state

Firestore **must never** store chat messages.

---

## PostgreSQL (Neon)

Purpose

Store communication data.

Responsibilities

- Rooms
- Messages
- Attachments
- Polls
- Reactions
- Reports
- Moderation history

PostgreSQL is the single source of truth for communication.

---

## Durable Objects

Purpose

Manage realtime communication.

Responsibilities

- WebSocket connections
- Broadcast messages
- Connection lifecycle
- Presence
- Message ordering

Durable Objects **must not** become permanent storage.

Everything important is persisted to PostgreSQL.

---

## Cloudflare R2

Purpose

Store media files.

Responsibilities

- Images
- Documents
- GIFs

Only object metadata is stored inside PostgreSQL.

Actual binary files exist only inside R2.

---

## Cloudflare Worker

Purpose

Business logic.

Responsibilities

- Authentication
- Authorization
- Validation
- Rate limiting
- Repository access
- Durable Object communication
- Signed upload URLs
- Cleanup jobs

The Worker owns every business rule.

---

# 2.4 Request Flow

Every request follows exactly the same lifecycle.

```
Client

↓

Firebase ID token (session bootstrap only)

↓

POST /api/v1/session

↓

Short-lived chat session

↓

Cloudflare Worker (normal chat request)

↓

Authentication

↓

Authorization

↓

Validation

↓

Service Layer

↓

Repository

↓

Database

↓

Response
```

No repository should ever perform business validation.

Validation belongs to the Service Layer.

---

# 2.5 Message Flow

Sending a message follows this sequence.

```
User

↓

WebSocket `message.send`

↓

Worker validates

↓

Room policy validation

↓

Spam validation

↓

Save message

↓

Persist attachments

↓

Commit transaction

↓

Notify Durable Object

↓

Broadcast to clients

↓

HTTP success
```

Database persistence always happens before broadcasting.

Clients must never receive a message that does not exist in PostgreSQL.

---

# 2.6 Attachment Flow

```
Client

↓

Request upload URL

↓

Worker validates

↓

Generate signed R2 URL

↓

Client uploads directly to R2

↓

Worker stores metadata

↓

Attachment linked to message
```

Files never pass through the Worker.

This minimizes latency and bandwidth costs.

---

# 2.7 Realtime Flow

Each room owns exactly one Durable Object instance.

```
University Room

↓

University Durable Object

↓

Connected Users

────────────────────

Batchmate Room

↓

Batchmate Durable Object

↓

Connected Users
```

Rooms are completely isolated.

Broadcasts from one room must never reach another room.

---

# 2.8 Data Ownership

Every type of data has one owner.

| Data                 | Owner             |
| -------------------- | ----------------- |
| Authentication       | Firebase Auth     |
| User Profile         | Firestore         |
| Chat Messages        | PostgreSQL        |
| Attachments          | PostgreSQL + R2   |
| Media Files          | R2                |
| Realtime Connections | Durable Objects   |
| Business Rules       | Cloudflare Worker |

No duplication should exist unless explicitly required.

---

# 2.9 Failure Recovery

The system must recover gracefully from infrastructure failures.

## Database Failure

- Return appropriate HTTP error.
- Do not broadcast.
- Retry only where appropriate.

---

## Durable Object Failure

- Database remains correct.
- Client reconnects automatically.
- Missed messages are fetched through pagination.

---

## Worker Restart

Workers are stateless.

Restarting a Worker must not affect chat history.

---

## Client Disconnect

Client reconnects.

Server returns latest messages using cursor pagination.

No messages should be lost.

---

# 2.10 Scalability Strategy

Version 1 targets:

- 500+ concurrent users

Expected capacity:

- 5,000 concurrent users without architecture changes.

Scaling strategy:

- More Worker instances
- More Durable Object instances
- Larger Neon plan
- Larger R2 storage

No database redesign should be required.

---

# 2.11 Architectural Principles

The following rules are mandatory.

1. Business logic belongs only inside Services.
2. Repositories contain database access only.
3. Workers remain stateless.
4. Durable Objects manage realtime state only.
5. PostgreSQL stores communication data only.
6. Firestore stores identity only.
7. R2 stores media only.
8. Cursor pagination only.
9. No OFFSET pagination.
10. No business logic inside SQL.
11. No duplicated data unless justified.
12. Every write must be validated before persistence.
13. Every API must be authenticated.
14. Every action must respect room policies.
15. Every message must be persisted before broadcast.

This architecture is frozen for Version 1 and should not be modified without a formal architecture review.

# 3. Backend Architecture & Coding Standards

## 3.1 Objective

The backend must follow a clean, modular architecture where every component has a single responsibility.

The architecture should be easy to understand, easy to test, and easy to extend.

Business logic must never be tightly coupled with infrastructure.

The goal is to allow future developers to understand the project without requiring architectural explanations.

---

# 3.2 Folder Structure

The backend should follow the following structure.

```
src/

├── api/
│
│   ├── routes/
│   ├── middleware/
│   ├── validators/
│   └── responses/
│
├── auth/
│
│   ├── firebase.ts
│   ├── chat-session.ts
│   ├── permissions.ts
│   └── session.ts
│
├── chat/
│
│   ├── services/
│   ├── repositories/
│   ├── websocket/
│   ├── events/
│   ├── policies/
│   ├── moderation/
│   ├── spam/
│   └── attachments/
│
├── db/
│
│   ├── schema/
│   ├── migrations/
│   ├── drizzle.ts
│   └── index.ts
│
├── durable-objects/
│
│   ├── ChatRoomDO.ts
│   └── ConnectionManager.ts
│
├── lib/
│
│   ├── logger.ts
│   ├── errors.ts
│   ├── pagination.ts
│   └── utils.ts
│
├── jobs/
│
│   ├── cleanup.ts
│   ├── polls.ts
│   └── moderation.ts
│
├── types/
│
├── constants/
│
└── index.ts
```

No folder should exceed one responsibility.

---

# 3.3 Layered Architecture

Every request must pass through the following layers.

```
HTTP Route

↓

Middleware

↓

Validation

↓

Service

↓

Repository

↓

Database
```

Each layer has one responsibility.

---

# 3.4 Route Layer

Routes should only perform:

- Authentication
- Authorization
- Request parsing
- Calling the correct service
- Returning the response

Routes must never contain business logic.

Good

```ts
router.post("/messages", createMessageHandler);
```

Bad

```ts
router.post("/messages", async () => {
	// validation
	// insert db
	// broadcast
	// notifications
});
```

---

# 3.5 Service Layer

The Service Layer owns all business logic.

Examples

Create message

↓

Validate

↓

Spam detection

↓

Permission validation

↓

Repository

↓

Broadcast

↓

Return response

No SQL belongs here.

---

# 3.6 Repository Layer

Repositories only communicate with PostgreSQL.

Allowed

- SELECT
- INSERT
- UPDATE
- DELETE
- Transactions

Not Allowed

- Authentication
- Authorization
- Spam detection
- Room policy validation

Repositories should never know who the current user is.

---

# 3.7 Durable Objects

Durable Objects only manage realtime communication.

Responsibilities

- Active WebSocket connections
- Broadcasting
- Presence
- Connection lifecycle

Not Responsibilities

- Authentication
- PostgreSQL queries
- Business validation
- Permission checks

A Durable Object should assume the Worker has already validated the request.

---

# 3.8 Transactions

Every multi-step write operation must use a database transaction.

Required transactions

Message

-

Attachments

Poll

-

Options

Delete message

-

Attachments

If one operation fails

↓

Rollback everything.

Partial writes are never acceptable.

---

# 3.9 Validation

Every incoming request must pass validation before reaching the Service Layer.

Validation order

Authentication

↓

Authorization

↓

Request schema

↓

Business rules

↓

Database

Validation should use Zod.

No manual validation.

---

# 3.10 Error Handling

The backend must never throw raw errors to the client.

Every endpoint should return a consistent response.

Example

```json
{
	"success": false,
	"error": {
		"code": "MESSAGE_TOO_LONG",
		"message": "Message exceeds the maximum allowed size."
	}
}
```

Every error should have

- HTTP Status
- Error Code
- Human-readable Message

---

# 3.11 Logging

Every request must include structured logs.

Required fields

- Request ID
- User UID
- Room ID
- Endpoint
- Method
- Duration
- Database Time
- Durable Object Time

No console.log statements should remain in production.

---

# 3.12 Dependency Rules

Allowed

```
Route

↓

Service

↓

Repository
```

Not Allowed

```
Repository

↓

Service
```

Repositories must never call services.

Services may use multiple repositories.

---

# 3.13 Shared Types

All request and response types must exist inside the shared package.

Never duplicate interfaces.

React Native

↓

Shared Types

↓

Worker

↓

Durable Objects

↓

Web

Everything uses identical types.

---

# 3.14 Constants

Never hardcode values.

Create shared constants.

Examples

```
MESSAGE_PAGE_SIZE

MAX_ATTACHMENTS

MAX_FILE_SIZE

MAX_POLL_OPTIONS

DEFAULT_PIN_LIMIT

REPORT_THRESHOLD
```

Business rules should never appear as magic numbers.

---

# 3.15 Configuration

Everything environment-specific belongs in configuration.

Examples

Database URL

Firebase

R2

JWT

Room IDs

Secrets

Never hardcode secrets.

---

# 3.16 Naming Conventions

Classes

```
MessageService
```

Repositories

```
MessageRepository
```

Durable Objects

```
ChatRoomDO
```

Validators

```
CreateMessageValidator
```

Routes

```
message.routes.ts
```

Types

```
MessageResponse
```

Consistency is mandatory.

---

# 3.17 Code Quality Standards

The codebase must follow these rules.

- Strict TypeScript
- Zero `any`
- Zero dead code
- Zero duplicated business logic
- Zero commented-out code
- ESLint clean
- Prettier clean

Every public function should have a single responsibility.

Functions should remain short and readable.

---

# 3.18 Performance Standards

Avoid

- N+1 queries
- Full table scans
- OFFSET pagination
- Repeated database calls
- Duplicate validation

Prefer

- Cursor pagination
- Batch queries
- Transactions
- Proper indexes
- Connection reuse

---

# 3.19 Definition of Clean Architecture

The backend is considered clean only when:

- Every layer has one responsibility.
- No circular dependencies exist.
- No duplicated business logic exists.
- Every dependency points inward.
- Every module is independently testable.
- Infrastructure can change without affecting business logic.

This architecture is mandatory for all backend development and should be followed consistently throughout the project.

# 4. Communication Domain Specification

## 4.1 Overview

The Communication Domain is responsible for every feature related to chat.

This includes:

- Rooms
- Messages
- Attachments
- Reactions
- Polls
- Reports
- Moderation
- Announcements
- Cleanup

This module must remain independent from authentication, user profile management and media storage.

---

# 4.2 Communication Model

Communication follows a room-based architecture.

Users never communicate directly.

Every message belongs to exactly one room.

```
Room

↓

Messages

↓

Replies

↓

Attachments

↓

Reactions

↓

Reports
```

Messages cannot exist without a room.

Attachments cannot exist without a message.

Reactions cannot exist without a message.

Reports cannot exist without a message.

---

# 4.3 Room Types

Version 1 contains two rooms.

## University

Purpose

University-wide communication.

Members

Every authenticated student.

Examples

- General discussion
- University announcements
- Campus questions
- Event discussion

---

## Batchmate

Purpose

Communication between students sharing the same batch.

Membership is automatically determined by:

- University
- Program
- Batch Year

Users cannot manually join another Batchmate room.

---

# 4.4 Room Lifecycle

Rooms are system-managed.

Users cannot:

- Create rooms
- Delete rooms
- Rename rooms
- Change policies

Future system rooms may be added by administrators.

Examples

Placement

Hostel

Department

Club

Event

---

# 4.5 Room Membership

Membership is determined by backend rules.

University

Every active student.

Batchmate

Automatically assigned using:

- University
- Program
- Batch Year

Membership changes automatically when profile information changes.

Users never manually join or leave.

---

# 4.6 Room Policies

Every room references one Room Policy.

Room Policy controls:

- Message permission
- Attachment permission
- Poll permission
- Announcement permission
- Pin permission
- Message retention
- Maximum messages
- Pin limit

Permissions must never be hardcoded.

Every authorization decision reads the policy from PostgreSQL.

---

# 4.7 Message Lifecycle

A message progresses through the following states.

```
Created

↓

Visible

↓

Edited (optional)

↓

Deleted (optional)

↓

Cleaned Up
```

Cleanup permanently removes messages according to the room policy.

---

# 4.8 Message Creation

When a user sends a message:

1. Authenticate user.
2. Validate room membership.
3. Load room policy.
4. Validate permissions.
5. Run spam validation.
6. Validate request body.
7. Begin database transaction.
8. Save message.
9. Save attachments (if any).
10. Commit transaction.
11. Notify Durable Object.
12. Broadcast message.
13. Return success.

Database persistence always happens before broadcasting.

---

# 4.9 Reply Messages

Every reply references another message.

Rules

- Parent message must exist.
- Parent message must belong to the same room.
- Replying to deleted messages is not allowed.
- Reply chains are unlimited.

The backend stores only the parent message ID.

Reply previews are generated when loading messages.

---

# 4.10 Message Editing

Only the original author may edit a message.

Exceptions

Moderators and administrators may edit only if moderation tools explicitly support it.

Editing updates:

- content
- updated_at
- edited_at

Message ID never changes.

Replies remain intact.

Reactions remain intact.

---

# 4.11 Message Deletion

Deletion is soft delete.

Rules

Only:

- Author
- Moderator
- Admin

may delete.

Deleting a message:

- Updates visibility.
- Sets deleted_at.
- Preserves moderation history.

Attachments are deleted during cleanup.

---

# 4.12 Attachment Lifecycle

Supported attachment types

- Image
- Document
- GIF

Upload flow

Client

↓

Signed URL

↓

Cloudflare R2

↓

Metadata

↓

PostgreSQL

The Worker never receives binary file data.

---

# 4.13 Attachment Rules

Attachments always belong to exactly one message.

Deleting the parent message eventually removes:

- Metadata
- File from R2

Maximum attachment limits are defined by configuration.

---

# 4.14 Reactions

Each user may have one reaction per message.

Changing a reaction updates the existing record.

Rules

- User cannot react to deleted messages.
- User may remove their reaction.
- Reactions are broadcast immediately.

---

# 4.15 Poll Lifecycle

Poll creation

↓

Options

↓

Voting

↓

Close

↓

Archive

Rules

Poll creator must satisfy room policy.

Closed polls reject new votes.

Poll deletion removes:

- Options
- Votes

using cascading deletes.

---

# 4.16 Poll Voting

Single Choice

One vote per user.

Changing vote replaces the previous vote.

Multiple Choice

Multiple votes allowed.

Business rules are enforced in the Service Layer.

---

# 4.17 Reports

Users may report messages.

Rules

One report per user per message.

Reports contain

- Reason
- Optional description

Reports are immutable.

Duplicate reports are rejected.

---

# 4.18 Moderation

Moderation actions include:

- Warn
- Flag
- Suspend
- Ban
- Delete Message

Every moderation action creates an immutable audit record.

Nothing is physically overwritten.

---

# 4.19 Announcement Messages

Announcements are a specialized message type.

Only roles permitted by Room Policy may create announcements.

Announcements participate in pagination exactly like normal messages.

---

# 4.20 Pinned Messages

Pinned messages belong to a room.

Rules

Maximum pin count is defined by Room Policy.

Pinning is restricted by role.

When the limit is reached, the backend rejects additional pins.

---

# 4.21 Automatic Cleanup

Cleanup runs on a scheduled job.

For each room:

Load policy.

If

Message count exceeds limit

OR

Retention period expires

↓

Delete oldest messages.

Cleanup also removes:

- Attachments
- Metadata
- R2 objects

Message count cache is updated.

---

# 4.22 Broadcast Rules

Every successful change generates a realtime event.

Events include

- Message Created
- Message Updated
- Message Deleted
- Reaction Updated
- Poll Updated
- Poll Closed
- Announcement Created
- Pin Updated

Broadcast occurs only after successful database commit.

---

# 4.23 Ordering

Messages are ordered by:

```
created_at DESC

↓

id DESC
```

Cursor pagination uses both fields.

OFFSET pagination is prohibited.

---

# 4.24 Domain Invariants

The following rules must always remain true.

- Every message belongs to one room.
- Every attachment belongs to one message.
- Every reaction belongs to one message.
- Every report belongs to one message.
- Every poll belongs to one message.
- Room policies are always enforced.
- Database commit occurs before broadcast.
- Messages are immutable except for edits.
- Moderation history is immutable.
- Cleanup never violates referential integrity.

Violating these invariants is considered a backend defect.

# 5. HTTP API Specification

## 5.1 Overview

The bCampus Communication Platform exposes a REST API for all request-response operations.

Realtime communication is handled separately through WebSockets.

The REST API is responsible for:

- Authentication
- Validation
- CRUD operations
- Pagination
- Upload URLs
- Room metadata
- Poll management
- Moderation
- Reports

Every endpoint follows the same architecture.

```
HTTP Request

↓

Authentication

↓

Authorization

↓

Validation

↓

Service

↓

Repository

↓

Database

↓

HTTP Response
```

Every endpoint must be stateless.

---

# 5.2 API Design Principles

The API must follow these principles.

## RESTful

Resources are nouns.

Examples

```
/rooms

/messages

/polls

/reports
```

Avoid verbs inside URLs.

Bad

```
/sendMessage
```

Good

```
POST /reactions
```

---

## JSON Only

All requests and responses use JSON.

Exceptions

Signed upload requests.

---

## Versioning

All endpoints are versioned.

```
/api/v1/...
```

Future breaking changes create

```
/api/v2/...
```

Never modify existing API behavior.

---

# 5.3 Authentication

Every normal chat endpoint requires a short-lived chat-session JWT. The session
bootstrap endpoint (`POST /api/v1/session`) specifically requires a Firebase
ID token, and the health endpoint is unauthenticated.

Normal chat authentication flow

```
Client

↓

Chat-session JWT

↓

Authorization Header

↓

Worker

↓

Local session verification

↓

Authenticated User
```

Header

```
Authorization: Bearer <token>
```

Missing or invalid tokens return

```
401 Unauthorized
```

---

# 5.4 Standard Response Format

Success

```json
{
	"success": true,
	"data": {}
}
```

Failure

```json
{
	"success": false,
	"error": {
		"code": "MESSAGE_NOT_FOUND",
		"message": "Message does not exist."
	}
}
```

Every endpoint must use this structure.

Never return raw errors.

---

# 5.5 Rooms API

## Get Rooms

```
GET /api/v1/rooms
```

Returns

- University
- Batchmate

including

- room id
- room name
- room type
- last message
- unread count (future)
- message count

---

## Get Room

```
GET /api/v1/rooms/:roomId
```

Returns

Room metadata.

---

# 5.6 Messages API

## Load Messages

```
GET /api/v1/messages
```

Query Parameters

```
roomId

cursor

limit
```

Rules

- Cursor pagination only
- Never OFFSET

Default

```
limit = 50
```

---

## Create Message

Message creation is a WebSocket `message.send` command. The Worker does not
expose a REST create endpoint; this prevents a message from being committed
without its room event and idempotency record.

Command payload

```json
{
	"roomId": "",
	"content": "",
	"replyToMessageId": null,
	"attachments": []
}
```

Validation

- Authentication
- Membership
- Room policy
- Spam
- Zod schema

Transaction

Message

↓

Attachments

↓

Commit

↓

Broadcast

---

## Edit Message

```
PATCH /api/v1/messages/:messageId
```

Rules

Only author.

Moderator/Admin only through moderation workflow.

---

## Delete Message

```
DELETE /api/v1/messages/:messageId
```

Soft delete.

---

# 5.7 Attachments API

Worker never receives binary data.

## Request Upload URL

```
POST /api/v1/attachments/upload-url
```

Returns

```json
{
	"uploadUrl": "...",
	"storageKey": "..."
}
```

Client uploads directly to R2.

---

# 5.8 Reactions API

## Add / Change Reaction

```
POST /api/v1/reactions
```

Rules

One reaction per user.

Changing reaction updates existing row.

---

## Remove Reaction

```
DELETE /api/v1/reactions/:messageId
```

---

# 5.9 Poll API

## Create Poll

```
POST /api/v1/polls
```

Creates

- Poll
- Options

inside one transaction.

---

## Vote

```
POST /api/v1/polls/:pollId/vote
```

Service validates

- Single choice
- Multiple choice
- Closed poll

---

## Close Poll

```
PATCH /api/v1/polls/:pollId/close
```

Permission determined by Room Policy.

---

# 5.10 Reports API

## Report Message

```
POST /api/v1/reports
```

Rules

One report per user.

Duplicate reports rejected.

---

# 5.11 Moderation API

Restricted.

Examples

```
POST /api/v1/moderation/warn

POST /api/v1/moderation/suspend

POST /api/v1/moderation/ban

POST /api/v1/moderation/delete-message
```

Every action creates immutable moderation history.

---

# 5.12 Pagination

Cursor format

```
created_at

+

id
```

Example

```
GET /messages?cursor=...
```

Never

```
OFFSET
```

---

# 5.13 Validation

Every endpoint validates

Authentication

↓

Authorization

↓

Request Schema

↓

Business Rules

↓

Database

Validation uses

Zod

only.

---

# 5.14 HTTP Status Codes

| Status | Meaning           |
| ------ | ----------------- |
| 200    | Success           |
| 201    | Created           |
| 204    | Deleted           |
| 400    | Bad Request       |
| 401    | Unauthorized      |
| 403    | Forbidden         |
| 404    | Not Found         |
| 409    | Conflict          |
| 422    | Validation Failed |
| 429    | Rate Limited      |
| 500    | Internal Error    |

Every endpoint must use the same status codes.

---

# 5.15 Error Codes

Examples

```
INVALID_TOKEN

CHAT_SESSION_REQUIRED

ROOM_NOT_FOUND

MESSAGE_NOT_FOUND

MESSAGE_DELETED

POLL_CLOSED

NOT_ROOM_MEMBER

PERMISSION_DENIED

SPAM_DETECTED

ATTACHMENT_LIMIT

INVALID_ATTACHMENT

REPORT_ALREADY_EXISTS
```

Codes remain constant.

Messages may change.

---

# 5.16 Idempotency

Creating messages should support idempotent retries.

The client sends a unique request identifier.

If the same request is received again:

- do not create duplicate messages
- return the previously created message

This prevents duplicate messages caused by retries or unstable networks.

---

# 5.17 Rate Limiting

Rate limiting is enforced in the Worker.

Limits apply per authenticated user.

Protection includes:

- Message spam
- Attachment abuse
- Report abuse
- Poll abuse

Rate limits should be configurable.

---

# 5.18 API Documentation

Every endpoint must include

- Description
- Authentication requirements
- Request schema
- Response schema
- Error responses
- Example request
- Example response

OpenAPI documentation should be generated from the implementation wherever practical.

---

# 5.19 API Invariants

The following rules are mandatory.

- Every endpoint is authenticated (except health).
- Every request is validated.
- Every response uses the standard response format.
- Every database write is transactional where required.
- Every successful write is broadcast after commit.
- No endpoint bypasses the Service Layer.
- No endpoint communicates directly with PostgreSQL.
- No endpoint contains business logic.

Violating these rules is considered an implementation defect.

# 6. Realtime Communication & WebSocket Specification

## 6.1 Overview

The bCampus Communication Platform uses **Cloudflare Durable Objects** as the realtime communication layer.

HTTP APIs are responsible for persistence and business logic.

Durable Objects are responsible only for:

- WebSocket connections
- Room sessions
- Message broadcasting
- Connection lifecycle
- Presence
- Event delivery

Durable Objects must never become a source of truth.

The source of truth is always PostgreSQL.

---

# 6.2 Design Principles

The realtime layer must follow these principles.

## Principle 1

Database first.

Realtime second.

Every successful write follows

```

Client

↓

HTTP API

↓

Database Commit

↓

Durable Object Broadcast

↓

Clients

```

A message must never be broadcast before it has been successfully committed.

---

## Principle 2

One Durable Object per Room.

```

University Room

↓

University Durable Object

↓

Connected Users

────────────────────────────

Batchmate Room

↓

Batchmate Durable Object

↓

Connected Users

```

Each room is completely isolated.

No broadcast may cross room boundaries.

---

## Principle 3

Durable Objects are Stateless Storage

Durable Objects may keep temporary in-memory state.

Examples

- Connected sockets
- Heartbeat timestamps
- Presence
- Temporary queues

Durable Objects must never permanently store:

- Messages
- Polls
- Reports
- Attachments

All permanent state belongs to PostgreSQL.

---

# 6.3 Connection Lifecycle

Connection flow

```

Client

↓

Chat-session JWT (query parameter for the upgrade)

↓

HTTP Upgrade Request

↓

Worker Authentication

↓

Authorization

↓

Resolve Room

↓

Locate Durable Object

↓

Open WebSocket

↓

Register Connection

↓

Ready

```

A connection is considered active only after successful registration.

---

# 6.4 Authentication

The Worker authenticates the user **before** the WebSocket reaches the Durable Object.

Durable Objects receive only trusted user information.

They should never verify Firebase tokens themselves.

---

# 6.5 Room Join

When a client joins a room

Worker validates

- JWT
- User exists
- Account active
- Room membership

Only after validation

↓

Connection is forwarded to the correct Durable Object.

Users cannot manually join rooms they do not belong to.

---

# 6.6 Connection State

Each connection maintains

```

Connection ID

User UID

Room ID

Connected At

Last Heartbeat

Device Type

```

Connection IDs must be unique.

A user may have multiple simultaneous connections.

Examples

Phone

Laptop

Web

Tablet

All receive broadcasts.

---

# 6.7 WebSocket Events

Every event contains

```json
{
	"id": "uuid",
	"type": "message.created",
	"timestamp": "...",
	"payload": {}
}
```

Fields

id

Globally unique event ID.

type

Event name.

timestamp

Server timestamp.

payload

Event-specific data.

---

# 6.8 Event Naming Convention

Use dot notation.

Examples

```

message.created

message.updated

message.deleted

reaction.updated

poll.created

poll.updated

poll.closed

announcement.created

pin.updated

presence.joined

presence.left

room.synced

```

Event names are immutable.

Future versions may add events.

Existing names must never change.

---

# 6.9 Incoming Events

Client → Server

Supported events

```

message.send

message.edit

message.delete

reaction.set

reaction.remove

poll.vote

report.create

heartbeat

```

Clients should never send database IDs they are not authorized to access.

---

# 6.10 Outgoing Events

Server → Client

```

message.created

message.updated

message.deleted

reaction.updated

poll.updated

poll.closed

announcement.created

pin.updated

presence.joined

presence.left

error

room.synced

```

Every client receives the same payload format.

---

# 6.11 Broadcast Rules

Broadcast occurs only after

- Database transaction committed
- Repository returned success

If persistence fails

↓

Nothing is broadcast.

Never broadcast speculative state.

---

# 6.12 Ordering Guarantee

Messages are delivered in commit order.

Ordering key

```

created_at

↓

id

```

Clients must display messages using this ordering.

Arrival order over WebSocket must never determine rendering order.

---

# 6.13 Heartbeat

Heartbeat keeps idle connections alive.

Client

↓

heartbeat

↓

Server

↓

heartbeat.ack

Heartbeat interval should be configurable.

Dead connections should be removed automatically.

---

# 6.14 Reconnection

If a connection drops

Client

↓

Reconnect

↓

Authenticate

↓

Reconnect WebSocket

↓

Request missed messages using cursor pagination

The server does not rely on cached WebSocket frames. The client replays
committed `room_events` from PostgreSQL using its last room sequence. If the
replay window has expired, it uses the message snapshot endpoint to converge.

---

# 6.15 Duplicate Prevention

Duplicate broadcasts must not create duplicate messages.

Every event contains a unique event ID.

Clients should ignore already processed events.

---

# 6.16 Error Events

Realtime errors use one format.

```json
{
	"type": "error",
	"payload": {
		"code": "PERMISSION_DENIED",
		"message": "You cannot send messages in this room."
	}
}
```

No stack traces.

No internal implementation details.

---

# 6.17 Presence

Version 1 supports only connection presence.

Supported events

```

presence.joined

presence.left

```

Typing indicators and online status are intentionally excluded.

They may be added in future versions.

---

# 6.18 Room Synchronization

When a client connects

Server sends

```

room.synced

```

This indicates

- Authentication successful
- Connection established
- Realtime channel ready

The client may begin sending events only after receiving this event.

---

# 6.19 Failure Recovery

If the Durable Object restarts

- Clients reconnect automatically.
- Missed messages are loaded using the REST API.
- No realtime cache recovery is attempted.

The database remains the single source of truth.

---

# 6.20 Scalability

Each room has one Durable Object instance.

Expected Version 1 capacity

- 500+ concurrent users

Target capacity

- 5,000 concurrent users

Scaling beyond this should require infrastructure upgrades, not protocol changes.

---

# 6.21 Protocol Invariants

The following rules are mandatory.

- Database commit always precedes broadcast.
- Every connection is authenticated.
- Durable Objects never modify PostgreSQL directly.
- One Durable Object manages one room.
- Event names are immutable.
- Clients never trust arrival order.
- Clients always recover using cursor pagination.
- Durable Objects are never a source of truth.
- Every event uses the shared TypeScript schema.
- Unknown event types must be ignored safely.

Violating these invariants is considered a protocol defect.

# 7. Security, Moderation & Anti-Abuse Specification

## 7.1 Overview

The bCampus Communication Platform must provide a safe, respectful and abuse-resistant communication environment.

Security is implemented across multiple layers rather than relying on a single mechanism.

Protection includes:

- Authentication
- Authorization
- Spam detection
- Duplicate detection
- User reporting
- Moderation workflow
- Suspensions
- Permanent bans
- Input validation
- File validation
- Audit logging

Every action affecting another user must be traceable.

---

# 7.2 Security Principles

The backend follows these principles.

## Authenticate Everything

Every request must belong to an authenticated Firebase user.

Anonymous access is never allowed.

---

## Authorize Everything

Authentication only proves identity.

Authorization determines whether the user is allowed to perform the requested action.

Every operation must validate permissions before execution.

---

## Never Trust the Client

The client is considered untrusted.

Never trust:

- User IDs
- Roles
- Room membership
- Attachment metadata
- Poll permissions
- Moderator status

Everything must be verified on the server.

---

## Server Owns Business Rules

The client only requests actions.

The server decides whether they are allowed.

The client must never enforce business rules.

---

# 7.3 Authentication

Authentication is provided exclusively by Firebase Authentication.

Workflow

```
Client

↓

Firebase Login

↓

JWT

↓

Worker

↓

Firebase Verify

↓

Authenticated User
```

If verification fails

↓

Return

```
401 Unauthorized
```

---

# 7.4 Authorization

Authorization uses two sources.

## Firestore

Determines

- Active
- Flagged
- Suspended
- Banned
- User Role

---

## PostgreSQL

Determines

- Room Policy
- Membership
- Message Ownership

Both validations must pass.

---

# 7.5 User Roles

Supported application roles

```
Student

Moderator

Admin
```

Student

Allowed

- Send messages
- Upload attachments
- React
- Vote
- Report

Not Allowed

- Moderate
- Pin (unless room policy allows)
- Create announcements (unless room policy allows)

---

Moderator

Allowed

- Review reports
- Pin messages
- Warn users
- Suspend users
- Delete inappropriate messages

Cannot modify database directly.

All actions go through backend APIs.

---

Admin

Full platform access.

Can

- Ban users
- Change room policies
- Review moderation history
- Override moderation decisions

---

# 7.6 Room Permission Validation

Permissions are never hardcoded.

Every request loads the room policy.

Example

```
Student

↓

Create Poll

↓

Load Room Policy

↓

Allowed ?

↓

Continue

↓

Reject
```

Changing room policy changes system behavior immediately.

---

# 7.7 Spam Detection

The backend performs spam detection before storing any message.

Current rules

Duplicate detection

Repeated identical messages

Excessive attachment uploads

Oversized payloads

Invalid attachment types

Future rules may include

Machine learning

Link reputation

Keyword analysis

The architecture should support additional detectors without changing existing services.

---

# 7.8 Duplicate Detection

Duplicate messages are detected using normalized message content.

Normalization includes

- Trim whitespace
- Collapse repeated spaces
- Convert repeated newlines
- Case-insensitive comparison (configurable)

If a user repeatedly submits the same normalized message within a short time window, the backend rejects the duplicate.

Repeated duplicate attempts increase the user's spam score.

The spam score automatically resets after 24 hours.

No temporary exponential blocking is used.

---

# 7.9 Report Workflow

Users may report messages.

Rules

One report per user per message.

Duplicate reports are rejected.

Reports are immutable.

Every report includes

- Reporter
- Message
- Reason
- Optional description
- Timestamp

---

# 7.10 Automatic User Flagging

When a user receives

10 unique reports

within

24 hours

↓

Backend automatically

Flags the account.

The account remains usable.

No automatic suspension occurs.

Firestore is updated

```
moderation.status = "flagged"
```

Moderators are notified.

---

# 7.11 Moderator Review

Moderators review flagged accounts.

Available actions

- Ignore reports
- Remove flag
- Warn
- Suspend
- Ban

Every action requires a moderation reason.

Every action creates an immutable moderation record.

---

# 7.12 Suspended Users

Suspended users

Cannot

- Send messages
- Upload attachments
- Vote
- React
- Report

They may still

- Read messages
- Download attachments

When suspension expires

Access is automatically restored.

---

# 7.13 Banned Users

Banned users

Cannot access chat.

Every authenticated request returns

```
403 Forbidden
```

The backend never partially grants permissions to banned users.

---

# 7.14 Message Ownership

Only the original author may

- Edit
- Delete

Moderators and Admins may remove messages using moderation endpoints.

Normal delete and moderation delete are separate workflows.

---

# 7.15 Input Validation

Every request is validated using Zod.

Validation includes

- Required fields
- Enum validation
- UUID format
- Attachment limits
- Poll option count
- File metadata
- Cursor format

Invalid requests never reach the Service Layer.

---

# 7.16 File Validation

Before issuing a signed upload URL

Validate

- File type
- MIME type
- File size
- Allowed extension

Worker rejects invalid uploads.

R2 never stores unauthorized files.

---

# 7.17 Audit Logging

Every moderation action creates an immutable audit record.

Examples

Warn

Suspend

Ban

Delete Message

Remove Flag

Every record includes

- Moderator
- Target User
- Action
- Reason
- Timestamp

Audit records are never edited or deleted.

---

# 7.18 Security Events

The backend logs

Authentication failures

Authorization failures

Spam detection

Duplicate detection

Report creation

Moderation actions

Suspensions

Bans

Logs must not contain

Passwords

Firebase tokens

Signed URLs

Secrets

---

# 7.19 Security Invariants

The following rules are mandatory.

- Every request is authenticated.
- Every action is authorized.
- Room policies are always enforced.
- Duplicate reports are rejected.
- Moderation history is immutable.
- Banned users never access chat APIs.
- Suspended users cannot create new content.
- Spam detection always executes before persistence.
- Input validation always executes before business logic.
- Sensitive information is never logged.

Violating these rules is considered a security defect.

# 8. Data Management & Operational Requirements

## 8.1 Overview

The Communication Platform stores data across multiple storage systems.

Each storage technology has one clearly defined responsibility.

No storage system should duplicate another unless explicitly required.

The backend architecture follows the principle of **Single Source of Truth**.

---

# 8.2 Data Ownership

| Component                  | Responsibility                  |
| -------------------------- | ------------------------------- |
| Firebase Authentication    | Authentication & Identity       |
| Firestore                  | User Profile & Moderation State |
| PostgreSQL                 | Communication Data              |
| Cloudflare Durable Objects | Realtime State                  |
| Cloudflare R2              | Media Storage                   |

Every piece of data belongs to exactly one owner.

---

# 8.3 Firestore Responsibilities

Firestore stores user-centric information.

Examples

- User profile
- Username
- Display name
- Profile photo
- University
- Program
- Batch year
- Application role
- Moderation status
- Active status
- Notification preferences
- Account metadata

Firestore **must not** store

- Chat messages
- Polls
- Reports
- Attachments
- Reactions
- Room history

Firestore is optimized for identity, not communication.

---

# 8.4 PostgreSQL Responsibilities

PostgreSQL is the permanent source of truth for communication.

Stores

- Room Policies
- Rooms
- Room Members
- Messages
- Attachments
- Polls
- Poll Options
- Poll Votes
- Reactions
- Reports
- Moderation History
- Pinned Messages

PostgreSQL never stores

- Firebase sessions
- User passwords
- Profile images
- Uploaded files

---

# 8.5 Cloudflare R2 Responsibilities

Cloudflare R2 stores binary files only.

Supported

- Images
- Documents
- GIFs

R2 never stores

- User metadata
- Chat metadata
- Polls
- Reports

Only PostgreSQL stores metadata.

---

# 8.6 Durable Objects Responsibilities

Durable Objects are responsible for temporary realtime state.

Examples

- Active WebSocket connections
- Connection metadata
- Room sessions
- Broadcast queues
- Presence

Durable Objects must never permanently store data.

Every restart should be recoverable from PostgreSQL.

---

# 8.7 Message Retention

Every room follows its assigned Room Policy.

Each policy defines

- Retention period
- Maximum retained messages

Cleanup is automatic.

Users cannot disable retention.

---

# 8.8 Automatic Cleanup

Cleanup runs using Cloudflare Cron.

Default schedule

Every hour

Cleanup process

```
Load Room Policy

↓

Check Message Count

↓

Check Retention Period

↓

Select Oldest Messages

↓

Delete Attachments

↓

Delete R2 Objects

↓

Delete Metadata

↓

Delete Messages

↓

Update Message Count
```

Cleanup must execute in batches.

Large rooms must never be cleaned in a single transaction.

---

# 8.9 Batch Cleanup Strategy

Cleanup should process messages in configurable batches.

Example

```
Batch Size

500 Messages
```

Loop

↓

Delete Batch

↓

Commit

↓

Next Batch

This prevents

- Transaction timeouts
- Worker timeouts
- Large database locks

---

# 8.10 Attachment Cleanup

Deleting a message must eventually remove

- PostgreSQL metadata
- Cloudflare R2 object

Deletion order

```
Delete R2

↓

Delete Metadata

↓

Delete Message
```

If R2 deletion fails

↓

Retry later

Never lose track of orphaned files.

---

# 8.11 Backup Strategy

Neon PostgreSQL backups are managed by Neon.

Firestore backups follow Firebase capabilities.

R2 durability is managed by Cloudflare.

The application itself should remain stateless.

No custom backup implementation is required in Version 1.

---

# 8.12 Recovery Strategy

After infrastructure failure

Recover

- PostgreSQL
- Firestore
- R2

Durable Objects automatically rebuild runtime state from active client connections.

Missed messages are retrieved using cursor pagination.

No replay log is required.

---

# 8.13 Monitoring

The backend must expose operational metrics.

Examples

Database

- Query latency
- Failed queries
- Transaction failures

Worker

- Request latency
- Error rate
- CPU time

Durable Objects

- Active rooms
- Active connections
- Broadcast latency

R2

- Upload failures
- Delete failures

---

# 8.14 Structured Logging

Every request must generate structured logs.

Required fields

- Request ID
- User UID
- Room ID
- Route
- HTTP Method
- Status Code
- Database Duration
- Durable Object Duration
- Total Duration

Logs should support production debugging.

---

# 8.15 Performance Targets

Target response times

REST API

```
Average

< 150 ms
```

Realtime Broadcast

```
Average

< 100 ms
```

Database Insert

```
Average

< 50 ms
```

Room Load

```
Average

< 100 ms
```

Message Pagination

```
50 Messages

< 100 ms
```

These are engineering targets, not guarantees.

---

# 8.16 Scalability Targets

Version 1

- 500+ concurrent active users

Target Capacity

- 5,000 concurrent active users

Scaling should require

- Higher Neon plan
- More Worker capacity
- Additional Durable Object instances

No database redesign.

---

# 8.17 Configuration

All operational values must be configurable.

Examples

- Cleanup interval
- Cleanup batch size
- Message page size
- Maximum attachment count
- Maximum file size
- Poll option limit
- Report threshold
- Spam detection window

Configuration must never be hardcoded.

---

# 8.18 Health Checks

Expose endpoints

```
GET /health
```

Returns

Worker availability.

```
GET /ready
```

Returns

- PostgreSQL reachable
- Firestore reachable
- R2 reachable

Deployment is considered healthy only when all dependencies are available.

---

# 8.19 Deployment Requirements

Production deployment requires

- Cloudflare Workers
- Durable Objects
- Wrangler
- Neon PostgreSQL
- Firebase
- Cloudflare R2
- Cron Jobs

Environment variables must be validated during startup.

The application should fail fast if required configuration is missing.

---

# 8.20 Operational Invariants

The following rules are mandatory.

- Firestore stores identity only.
- PostgreSQL stores communication only.
- R2 stores binary files only.
- Durable Objects store temporary realtime state only.
- Database commits always precede broadcasts.
- Cleanup never violates referential integrity.
- All configuration is environment-driven.
- The backend remains stateless outside Durable Objects.
- Every production deployment passes health checks.
- Every failure is logged with sufficient context for debugging.

Violating these invariants is considered an operational defect.

---

# 8.21 Definition of Done (Backend)

The backend is considered complete only when all of the following conditions are satisfied.

## Architecture

- Database schema frozen
- Drizzle schema implemented
- Repository layer complete
- Service layer complete
- Clean architecture enforced

## Features

- Rooms
- Messages
- Replies
- Attachments
- Reactions
- Polls
- Reports
- Moderation
- Announcements
- Pinned messages

## Infrastructure

- Cloudflare Workers deployed
- Durable Objects operational
- Neon connected
- Firebase integrated
- Cloudflare R2 integrated
- Cleanup Cron operational

## Quality

- Zero TypeScript errors
- Zero ESLint errors
- Zero failing tests
- No TODOs
- No stub methods
- No dead code
- Strict TypeScript

## Testing

- Unit tests passing
- Integration tests passing
- Repository tests passing
- WebSocket tests passing
- Permission tests passing
- Performance validation completed

Only after every requirement above is satisfied may the project proceed to frontend implementation.
