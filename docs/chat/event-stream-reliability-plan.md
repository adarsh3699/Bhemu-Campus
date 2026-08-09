# Chat Event Stream Reliability Plan

## Status: canonical message write path implemented

Message creation uses the Room Durable Object WebSocket command and persists
the message, idempotency record, and room event transactionally. PostgreSQL is
the durable source of truth; WebSocket is the low-latency delivery path and
the replay endpoint is the recovery path.

The current implementation already provides:

- Durable Object WebSocket metadata restoration after hibernation via socket attachments.
- Defensive connection recovery when a hibernated Durable Object is reconstructed.
- Client reconnects with capped exponential backoff.
- Client reconciliation from PostgreSQL after every successful `room.synced` event.
- Idempotent message upserts that merge REST results, WebSocket events, and optimistic messages.
- Short-lived local chat sessions keep Firestore profile reads off the message hot path.
- PostgreSQL is the only idempotency authority; the DO does not duplicate that mapping in storage.
- Public-room policy snapshots are carried by the verified WebSocket lease, avoiding a room-policy read per message.
- Committed WebSocket message events use an ordered Durable Object fan-out queue;
  the sender ACK is not held up by receiver count, while HTTP mutations wait on
  the same queue so edit/delete/reaction events cannot overtake a message.
- Firebase session bootstrap coalesces concurrent profile reads per UID without
  retaining a profile cache, so moderation changes remain fresh between sessions.
- Structured Worker metrics for auth/message timing, broadcast completion/failure, WebSocket lifecycle, fan-out size, and heartbeat timeouts.

The runtime now includes the first reliability tier: a durable `room_events`
table, DO-owned room sequence allocation, a membership-protected replay API,
client cursors/gap recovery, and a canonical WebSocket `message.send` command.
Reactions, edits, deletes, polls, pins, and moderation still use the existing
broadcast path until their mutations are given the same transaction + event
contract.

## Why the event stream is the canonical path

The pre-event-stream design treated WebSocket broadcast as a best-effort
notification:

```text
write message to PostgreSQL
        |
        +--> broadcast to currently connected sockets
```

If the socket is disconnected, the Durable Object is unavailable, or the broadcast fails, the message is still safe in PostgreSQL, but the realtime notification is lost. The current client reconciliation repairs most of these gaps by fetching recent messages after reconnect. It does not provide an exact, ordered record of every change.

The event-stream design makes PostgreSQL the durable event source and WebSocket the low-latency delivery path:

```text
one database transaction
        |
        +--> message/reaction/moderation state
        +--> durable room event with room sequence
                         |
                         +--> asynchronous relay / retry
                                      |
                                      +--> WebSocket fast path
                                      +--> replay API recovery path
```

## Target guarantees

The target is at-least-once delivery with idempotent application. Exactly-once network delivery is not realistic; duplicate delivery must be safe.

For each room:

1. Every durable event receives a monotonically increasing `roomSeq`.
2. Every event also receives a globally unique `eventId`.
3. Clients persist the last successfully applied sequence per room and device.
4. Events with `roomSeq <= lastApplied` are duplicates and are ignored.
5. An event ahead of the next expected sequence indicates a gap.
6. The client pauses normal application, fetches missing events, applies them in order, then resumes buffered live events.
7. If the requested history has expired, the server returns `resync_required`; the client loads a fresh room snapshot/history and starts from its new high-water mark.

This is the same general reliability shape as Discord gateway resume and Telegram update difference recovery: a connection has a cursor, a gap is detectable, and missed work can be replayed rather than guessed from the latest page.

## Database model implemented in migration 0004

`room_events` is keyed by `(room_id, room_seq)`, with a unique `event_id`,
versioned JSON payload, and indexes for room replay. The DO stores the next
sequence in durable DO storage. Failed reservations can leave gaps; clients
repair missing persisted events and do not assume sequences are contiguous.

Migration 0005 adds `message_idempotency`; it is required by the canonical
message command.

The message write and the corresponding `room_events` insert must be in the same PostgreSQL transaction. Sequence allocation must be atomic per room. Do not write the message first and create the event later; that recreates the current dual-write failure window.

If a Durable Object wakes with a stale local sequence after a deployment or
restore, the database rejects the conflicting `(room_id, room_seq)` insert.
The message service reads the database high-water mark only on that unique
conflict, advances the DO allocator monotonically, and retries the same
command once. Normal sends do not pay this recovery read or retry cost.

The event payload should be a versioned DTO, not an arbitrary internal database row. This allows the event contract to evolve independently from repository fields.

## Proposed protocol

Subscribe/resume:

```json
{
  "op": "subscribe",
  "roomId": "room-id",
  "after": 481
}
```

Event:

```json
{
  "id": "event-id",
  "type": "message.created",
  "roomId": "room-id",
  "roomSeq": 482,
  "timestamp": "2026-08-07T12:00:00.000Z",
  "payload": {}
}
```

Recovery endpoint:

```text
GET /api/v1/rooms/:roomId/events?after=481&limit=100
```

The replay endpoint must enforce membership, paginate by `(room_id, sequence)`,
and return the current high-water mark. It must not use offset pagination. If a
cursor is older than the retained window or cannot be safely bridged, the
response sets `resyncRequired`; the client then loads a fresh message snapshot.

## Relay and retry model

The transaction commits the event before any network relay begins. A relay then publishes the event to the room Durable Object. Relay delivery is at-least-once:

- Retry transient Worker, Durable Object, and queue failures with backoff.
- Deduplicate by `eventId` in the Durable Object/client.
- Preserve per-room ordering where possible.
- Let the client detect and repair ordering gaps even if independent relay attempts arrive out of order.
- Record attempts, final failures, and dead-letter events.

Cloudflare Queues or a database polling publisher are both valid future implementations. The choice should be made after measuring room volume and operational cost.

## Rollout plan

### Operational safeguards retained

- Hibernation restoration and reconnect reconciliation remain required runtime
  safeguards.
- Structured observability remains enabled; it does not change message delivery
  semantics.
- Fault-injection tests should cover disconnects and delayed REST/WebSocket
  responses.

### Phase 1 — implemented canonical path

- `eventId`/`roomSeq` are included for streamed message-created events.
- Client deduplication, local room cursors, replay pagination, and gap
  detection are implemented.
- Snapshot reconciliation remains only for initial history and expired replay.

### Phase 2 — migration verification

- Apply migrations 0004 and 0005 in a development database.
- Verify migrations 0004 and 0005 in every target database before starting the
  Worker. Message creation has no REST fallback when the schema is missing.
- Extend room sequencing to reaction, deletion, poll, pin, and moderation
  mutations before claiming full-room event coverage.

### Phase 3 — replay API and cursor persistence (implemented for messages)

- The replay endpoint is available at
  `GET /api/v1/rooms/:roomId/events?after=<seq>&limit=<n>`.
- The web client persists one cursor per room in local storage.
- Gap detection and replay are implemented for message-created events.
- Snapshot/resync handling remains the recovery path for expired or unavailable
  event history.
- An hourly guarded cleanup keeps the replay window at 30 days; events are not
  archival history.

### Phase 4 — asynchronous outbox relay

- Move broadcast publication to a retryable relay.
- Add dead-letter handling and an operator replay tool.
- Keep direct broadcast as a low-latency optimization only if it does not bypass the durable event.

### Phase 5 — retention and operations

- Define event retention (for example, seven to thirty days initially).
- Compact or archive old events.
- Load-test sequence allocation and hot rooms.
- Document the snapshot fallback once replay history expires.

## Metrics plan

The first metrics should be structured events, not a high-cardinality metrics explosion. The Worker already has a structured logger in `apps/chat-worker/src/lib/logger.ts`, request IDs in `src/index.ts`, and Cloudflare observability enabled in `wrangler.jsonc`.

### Backend events currently emitted

Emit one structured log for lifecycle and failure transitions:

```text
chat.auth.session
chat.ws.connected
chat.ws.disconnected
chat.ws.reconnect_metadata_expired
chat.ws.broadcast
chat.ws.broadcast_failed
chat.ws.fanout
chat.ws.heartbeat_timeout
chat.message.created
chat.message.admission
chat.message.failed
chat.room.sequence_repaired
```

These are emitted through the Worker structured logger. Successful broadcast and fan-out events are deliberately separate: one measures the Worker-to-Durable-Object request, while the other records the number of sockets present inside the room. Fan-out logs include `delivery: "background_ordered"` for WebSocket message sends; the durable event is committed before that queue is scheduled, and replay/heartbeat gap recovery remains the correctness path if a receiver is unavailable.

`chat.auth.session` includes `source` (`firebase` during bootstrap or `chat_session` on the hot path), plus `verificationDurationMs`, `profileDurationMs`, and `profileSource` (`firestore` or `inflight`) when applicable. `chat.message.created.durationMs` measures the WebSocket command from admission through the transactional write and ACK; `admissionDurationMs` and `serviceDurationMs` split the DO admission from the Worker/database portion, while `roomPolicySource` confirms whether a public socket lease avoided the room read. `chat.message.failed` records only safe database driver metadata (`errorName`, `errorCode`, and `constraint`) when available; it never logs message content or SQL. `chat.room.sequence_repaired` counts self-healing sequence recovery. The top-level `request` log remains useful for REST reads and non-create mutations. Comparing these fields identifies whether latency is coming from Firebase/Firestore, PostgreSQL, or application work.

Client reconciliation outcomes are not sent to the Worker yet. Add an authenticated, rate-limited telemetry endpoint only if server-side metrics cannot explain a production gap.

Recommended fields:

```json
{
  "requestId": "request-id",
  "roomId": "room-id",
  "connectionId": "connection-id",
  "eventId": "event-id",
  "userHash": "non-reversible-or-omitted",
  "durationMs": 12,
  "status": "ok",
  "reason": "socket_closed"
}
```

Never log message content, Firebase tokens, email addresses, or raw user identifiers. Do not log every heartbeat as an info event; count timeout/failure transitions and sample successful heartbeats only when debugging.

### Client events to add

The browser should report aggregated, privacy-safe lifecycle outcomes rather than every message body:

```text
chat_client.ws_open
chat_client.room_synced
chat_client.ws_closed
chat_client.ws_reconnect_scheduled
chat_client.reconciliation_started
chat_client.reconciliation_completed
chat_client.reconciliation_failed
chat_client.sequence_gap_detected   # only after roomSeq exists
```

Useful fields are `roomType`, `attempt`, `durationMs`, `recoveredCount`, `closeCode`, and `onlineState`. A small sampling rate is sufficient for successful events; retain all failures.

### Dashboard measurements

Track these over time:

- Message send latency: API request start to successful response.
- Broadcast latency: database commit to Durable Object broadcast completion.
- Reconnect success rate and reconnect time.
- Reconciliation success rate and number of recovered messages.
- Broadcast failure rate.
- Messages created versus `message.created` events observed by connected clients.
- Duplicate event rate.
- Sequence gaps per 1,000 active rooms once sequences exist.
- Outbox oldest pending age and dead-letter count once the relay exists.

Suggested initial service objectives:

- 99.9% of successful message writes create a durable realtime event.
- 99% of reconnects become synchronized within 10 seconds.
- Zero unbounded outbox backlog.
- Zero messages lost after replay or snapshot recovery.

### Practical implementation order for metrics

1. Keep structured Worker lifecycle/failure logs and compare the canonical
   WebSocket path against replay/recovery outcomes.
2. Query Cloudflare Observability for counts and latency distributions.
3. Add client failure/reconciliation telemetry only if server logs cannot explain gaps.
4. Introduce Analytics Engine, PostHog, or another metrics sink only when log queries become insufficient.
5. Add alerts for broadcast failures, reconnect storms, and pending relay age.

## Operational requirement

Run migrations 0004 and 0005 before starting the Worker in an environment.
The canonical message command fails closed when the database is unavailable;
there is no alternate REST write that could create a message without its
durable event and idempotency record. Snapshot history remains available for
initial load and expired replay recovery.

## References

- [Discord Gateway resume and sequence numbers](https://docs.discord.com/developers/events/gateway)
- [Telegram update sequencing and difference recovery](https://core.telegram.org/api/updates)
- [Cloudflare Durable Object WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Cloudflare Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [AWS transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)
