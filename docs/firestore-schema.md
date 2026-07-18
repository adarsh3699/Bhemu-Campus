# Firestore Schema — Bhemu Calculator

Last audited & cleaned: 2026-06-28. 124 profiles verified clean.
Last updated: 2026-07-18 (added `leaderboard` collection).

---

## `users/{userId}`

| Field             | Type           | Notes                         |
| ----------------- | -------------- | ----------------------------- |
| email             | string         |                               |
| displayName       | string         |                               |
| photoURL          | string \| null |                               |
| createdAt         | Timestamp      | written once at signup — never overwritten |
| lastLoginAt       | Timestamp      | updated on every app open / login |
| updatedAt         | Timestamp      | updated when profile fields change (displayName, password) |
| hasPassword       | boolean        | true if email/password linked |
| passwordUpdatedAt | Timestamp?     | set when password changed     |

---

## `users/{userId}/profiles/{profileId}`

| Field       | Type       | Notes                                            |
| ----------- | ---------- | ------------------------------------------------ |
| id          | string     | same as doc ID                                   |
| name        | string     |                                                  |
| isDefault   | boolean    |                                                  |
| createdAt   | Timestamp  |                                                  |
| updatedAt   | Timestamp  |                                                  |
| lastOpened  | Timestamp? | only written for own profiles — never for shared |
| studentInfo | object?    | from UMS extension sync                          |
| umsVerified | boolean?   | from UMS extension sync                          |
| lastUMSSync | string?    | ISO string — from UMS extension sync             |
| copiedFrom  | object?    | `{ shareId, originalUserId, copiedAt }`          |

**Never stored (runtime-only — stripped before every write):**

- `isShared`, `ownerUserId` — attached in memory when merging shared profiles into the list
- `permission` — sourced from `userShares/incoming` at runtime
- `shareId`, `sharedAt` — already in `userShares/incoming`
- `userId`, `lastModified`, `collaborators`, `permissions` — removed

---

## `users/{userId}/profiles/{profileId}/gpaAndMarks/{semesterId}`

| Field    | Type             | Notes             |
| -------- | ---------------- | ----------------- |
| id       | string \| number | same as doc ID    |
| name     | string           | e.g. "Semester 1" |
| subjects | Subject[]        | see below         |

**Subject:**

```json
{
	"id": 1234567890,
	"subjectName": "Mathematics",
	"subjectCode": "MA101",
	"credit": 4,
	"grade": 9,
	"marks": {
		"ca": 23,
		"midTerm": 18,
		"endTerm": 40,
		"attendanceMarks": 5,
		"total": 86,
		"source": "ums | manual | partial",
		"umsGradePoint": 9,
		"customCutoff": { "gradePoint": 9, "cutoffMarks": 80 }
	}
}
```

**Why `grade` and `umsGradePoint` both exist:**

- `grade` — **single source of truth** for GPA/CGPA calculation and display. Shown everywhere.
- `marks.umsGradePoint` — what **UMS originally reported**. Used only for comparison: when `grade !== computeGradeFromMarks(marks.total)`, the "Grade ✎" badge shows. Never used for display.
- Display priority: `grade` → computed from `marks.total` (fallback if grade=0)
- During UMS fetch: both `grade` and `umsGradePoint` are written with the same value initially

**`customCutoff` — Relative Grading (WRITE-ONCE, UMS-ONLY):**

- Set ONLY during UMS sync when the standard grade table disagrees with UMS grade.
    - Example: marks total = 66, UMS says A(8), standard table says B+(7) → `customCutoff: { gradePoint: 8, cutoffMarks: 66 }`
- The frontend NEVER creates, modifies, or recalculates `customCutoff`. It is read-only after sync.
- `computeGradeFromMarks(total, customCutoff)` uses the cutoff: if `total >= cutoffMarks`, return `gradePoint`.
- If no relative grading: `customCutoff` is `null`.
- The "✦ Relative" badge shows when `customCutoff` is non-null.

---

## `users/{userId}/profiles/{profileId}/attendanceData/main`

Single flat doc per profile — no semester grouping.

| Field            | Type                  | Notes               |
| ---------------- | --------------------- | ------------------- |
| defaultThreshold | number                | e.g. 75             |
| updatedAt        | Timestamp             |                     |
| subjects         | Record\<id, Subject\> | keyed by subject ID |

**AttendanceSubject:**

```json
{ "id": "s1", "name": "Physics", "totalClasses": 40, "attended": 32, "threshold": 75 }
```

---

## `userShares/{userId}/outgoing/{shareId}`

## `userShares/{userId}/incoming/{shareId}`

Both are identical mirrored copies. Outgoing = owner's record. Incoming = recipient's record.

| Field           | Type             | Notes                                     |
| --------------- | ---------------- | ----------------------------------------- |
| shareId         | string           |                                           |
| profileId       | string \| number |                                           |
| profileName     | string           | snapshot at share time (can go stale)     |
| ownerUserId     | string           |                                           |
| targetUserId    | string           |                                           |
| targetUserEmail | string           |                                           |
| permission      | "read" \| "edit" |                                           |
| sharedAt        | Timestamp        |                                           |
| isActive        | boolean          | always true (hard-delete, no soft-delete) |
| updatedAt       | Timestamp?       | set on permission change                  |

---

## Real-time collaborative editing

1. Recipient with `permission="edit"` saves → `saveProfileWithCollaboration()` writes to `users/{ownerUserId}/profiles/{id}/gpaAndMarks/`
2. `onCollaborativeProfileChange()` listens on `users/{ownerUserId}/profiles/{id}`
3. `onSemestersChangeForUser()` listens on `users/{ownerUserId}/profiles/{id}/gpaAndMarks/`
4. Both users see changes live

---

## `leaderboard/{userId}_{profileId}`

Denormalized top-level collection written by the UMS extension on every sync. Used by the leaderboard feature to rank students without querying subcollections across multiple users.

Document ID: `{userId}_{profileId}` — deterministic, enables idempotent upserts.

| Field | Type | Notes |
|-------|------|-------|
| userId | string | Firebase Auth UID of the profile owner |
| profileId | string | Profile doc ID |
| name | string | Student's full name (from `studentInfo.name`) |
| vid | string | Registration number (e.g. `"12401984"`) |
| programCode | string | Parsed from program string (e.g. `"P132"`, `"P164-NN1"`) |
| programName | string | e.g. `"B.Tech."`, `"MCA"` |
| branch | string \| null | e.g. `"Computer Science and Engineering"`, `null` for no-branch programs |
| batchYear | string | e.g. `"2024"` (derived from `vid` if `studentInfo.batchYear` is null) |
| cgpa | number | Parsed float — used for ordering |
| groupKey | string | `"{batchYear}_{programCode}"` — single field for query filtering + ordering |
| optOut | boolean | `false` by default. `true` = excluded from all leaderboard queries. Written only on first sync; never overwritten by re-sync. Changed only via Settings toggle. |
| updatedAt | Timestamp | `serverTimestamp()` on each sync |

**Write rules:**
- First sync: writes all fields including `optOut: false`
- Re-sync: omits `optOut` (preserves any user-set opt-out)
- Settings opt-out toggle: writes only `{ optOut, updatedAt }` via `setDoc merge`

**Required Firestore indexes:**
| Fields | Order | Used by |
|--------|-------|---------|
| `groupKey` ASC, `optOut` ASC, `cgpa` DESC | Collection | `getTopStudents` |
| `groupKey` ASC, `optOut` ASC, `cgpa` ASC | Collection | `getNearbyAbove` |

**Security rules:**
```
match /leaderboard/{docId} {
  allow read: if true;  // public — required for server-side OG image + rank page
  allow write: if request.auth != null && request.resource.data.userId == request.auth.uid;
}
```

---

## Deleted / legacy (do NOT recreate)

| Collection                       | Reason                                |
| -------------------------------- | ------------------------------------- |
| `users/{userId}/sharedProfiles/` | Legacy public link-share — UI removed |
| `sharedProfiles/` (top-level)    | Same                                  |
| `userShares/{userId}` parent doc | Was `{ exists: true }` — never needed |

---

## Key invariants

- All timestamps must be native Firestore `Timestamp` (not Admin SDK serialized maps)
- `saveSemesters()` diffs subcollection — deletes removed semester docs
- `lastOpened` is never written for shared profiles (would create ghost docs)
- Account deletion cleans: own profiles + subcollections, outgoing + mirror incoming, incoming + mirror outgoing
