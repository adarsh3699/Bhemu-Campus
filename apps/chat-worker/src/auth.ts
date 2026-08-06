// ============================================================
// Legacy re-export — use src/auth/ instead
// ============================================================
// This file is kept only for backward compatibility with any
// tooling that imports directly. New code must import from
// ./auth/firebase or ./auth/session.

export { verifyFirebaseToken } from "./auth/firebase";
