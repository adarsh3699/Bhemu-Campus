# Chat authentication hot-path design

## Problem

Every authenticated API request used to verify the Firebase ID token and read
`users/{uid}` from Firestore. That profile read was unnecessary for every
message and added a remote network round-trip to the send path.

## Current design

1. The client exchanges its Firebase ID token at `POST /api/v1/session`.
2. The Worker verifies Firebase and reads the Firestore profile once.
3. The Worker signs a five-minute HMAC chat session containing the resolved UID,
   role, and moderation state.
4. Chat REST requests and WebSocket reconnects send that session token.
5. The Worker verifies the session locally with `CHAT_SESSION_SECRET`; no
   Firestore request is made on the hot path.
6. Before expiry, the client transparently refreshes through Firebase.

There is no Firebase-token fallback on normal chat traffic. Every chat REST
request and WebSocket connection requires the short-lived chat session. If the
session endpoint is unavailable, the client retries or shows an
authentication-unavailable state rather than silently downgrading to the slower
Firebase/Firestore path.

## Security decisions

- The session is short-lived and cannot renew itself; renewal requires Firebase
  authentication and a fresh Firestore profile read.
- `CHAT_SESSION_SECRET` must be stored as a Cloudflare secret and rotated when
  required. Rotation invalidates existing chat sessions.
- A moderation or role change can remain stale for at most the session TTL
  (currently five minutes). Lower the TTL or add a revocation list if instant
  ban enforcement becomes a requirement.
- Firebase remains the upstream identity provider for session bootstrap and
  refresh. Report auto-flagging is an explicit integration exception because it
  currently calls the Firestore REST API directly with the Firebase token; move
  that write behind a Worker service credential to make the report route
  session-only as well.

## Deployment

Set the secret before deploying:

```sh
wrangler secret put CHAT_SESSION_SECRET
```

Observe `chat.auth.session` with `source=firebase` only on session bootstrap,
`source=chat_session` for normal chat traffic, and
`source=chat_session_rejected` for invalid/legacy credentials. The expected
result is one Firestore profile lookup per session refresh, not per message.
