# Firestore Schema — Bhemu Calculator

Last audited & cleaned: 2026-06-23. 124 profiles verified clean.

---

## `users/{userId}`

| Field | Type | Notes |
|---|---|---|
| email | string | |
| displayName | string | |
| photoURL | string \| null | |
| createdAt | Timestamp | |
| lastLoginAt | Timestamp | |
| updatedAt | Timestamp | |
| hasPassword | boolean | true if email/password linked |
| passwordUpdatedAt | Timestamp? | set when password changed |

---

## `users/{userId}/profiles/{profileId}`

| Field | Type | Notes |
|---|---|---|
| id | string | same as doc ID |
| name | string | |
| isDefault | boolean | |
| createdAt | Timestamp | |
| updatedAt | Timestamp | |
| lastOpened | Timestamp? | only written for own profiles — never for shared |
| studentInfo | object? | from UMS fetch |
| allTermIds | array? | from UMS fetch |
| umsVerified | boolean? | from UMS fetch |
| lastUMSSync | Timestamp? | from UMS fetch |
| isShared | boolean? | true on shared profile copies in memory |
| ownerUserId | string? | UID of the original profile owner |
| copiedFrom | object? | `{ shareId, originalUserId, copiedAt }` |

**Never stored (runtime-only — stripped before every write):**
- `permission` — sourced from `userShares/incoming` at runtime
- `shareId`, `sharedAt` — already in `userShares/incoming`
- `userId`, `lastModified`, `collaborators`, `permissions` — removed

---

## `users/{userId}/profiles/{profileId}/gpaAndMarks/{semesterId}`

| Field | Type | Notes |
|---|---|---|
| id | string \| number | same as doc ID |
| name | string | e.g. "Semester 1" |
| subjects | Subject[] | see below |

**Subject:**
```json
{
  "id": 1234567890,
  "subjectName": "Mathematics",
  "subjectCode": "MA101",
  "credit": 4,
  "grade": 9,
  "marks": {
    "ca": 23, "midTerm": 18, "endTerm": 40, "attendanceMarks": 5,
    "total": 86,
    "source": "ums | manual | partial",
    "umsGradePoint": 9,
    "customCutoff": { "gradePoint": 9, "cutoffMarks": 80 }
  }
}
```

---

## `users/{userId}/profiles/{profileId}/attendanceData/main`

Single flat doc per profile — no semester grouping.

| Field | Type | Notes |
|---|---|---|
| defaultThreshold | number | e.g. 75 |
| updatedAt | Timestamp | |
| subjects | Record\<id, Subject\> | keyed by subject ID |

**AttendanceSubject:**
```json
{ "id": "s1", "name": "Physics", "totalClasses": 40, "attended": 32, "threshold": 75 }
```

---

## `userShares/{userId}/outgoing/{shareId}`
## `userShares/{userId}/incoming/{shareId}`

Both are identical mirrored copies. Outgoing = owner's record. Incoming = recipient's record.

| Field | Type | Notes |
|---|---|---|
| shareId | string | |
| profileId | string \| number | |
| profileName | string | snapshot at share time (can go stale) |
| ownerUserId | string | |
| targetUserId | string | |
| targetUserEmail | string | |
| permission | "read" \| "edit" | |
| sharedAt | Timestamp | |
| isActive | boolean | always true (hard-delete, no soft-delete) |
| updatedAt | Timestamp? | set on permission change |

---

## Real-time collaborative editing

1. Recipient with `permission="edit"` saves → `saveProfileWithCollaboration()` writes to `users/{ownerUserId}/profiles/{id}/gpaAndMarks/`
2. `onCollaborativeProfileChange()` listens on `users/{ownerUserId}/profiles/{id}`
3. `onSemestersChangeForUser()` listens on `users/{ownerUserId}/profiles/{id}/gpaAndMarks/`
4. Both users see changes live

---

## Deleted / legacy (do NOT recreate)

| Collection | Reason |
|---|---|
| `users/{userId}/sharedProfiles/` | Legacy public link-share — UI removed |
| `sharedProfiles/` (top-level) | Same |
| `userShares/{userId}` parent doc | Was `{ exists: true }` — never needed |

---

## Key invariants

- All timestamps must be native Firestore `Timestamp` (not Admin SDK serialized maps)
- `saveSemesters()` diffs subcollection — deletes removed semester docs
- `lastOpened` is never written for shared profiles (would create ghost docs)
- Account deletion cleans: own profiles + subcollections, outgoing + mirror incoming, incoming + mirror outgoing
