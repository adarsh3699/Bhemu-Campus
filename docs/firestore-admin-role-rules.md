# Admin role-management rules

The web admin page uses the Firebase client SDK for user search and role
changes. UI checks are only for user experience; these rules are the security
boundary and must be merged into the project's deployed Firestore rules.

```rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return signedIn()
        && get(
          /databases/$(database)/documents/users/$(request.auth.uid)
        ).data.role == "admin";
    }

    match /users/{userId} {
      // Existing app behavior: users are readable.
      allow read: if true;

      // New users can only create their own student profile.
      allow create: if signedIn()
        && userId == request.auth.uid
        && request.resource.data.role == "student";

      // User can update own profile, but cannot change own role.
      allow update: if signedIn()
        && userId == request.auth.uid
        && (
          (
            !("role" in resource.data)
            && !("role" in request.resource.data)
          )
          ||
          (
            "role" in resource.data
            && "role" in request.resource.data
            && request.resource.data.role == resource.data.role
          )
        );

      // Admin can change only student/moderator roles.
      // Existing users without a role are treated as non-admin.
      allow update: if isAdmin()
        && userId != request.auth.uid
        && (
          !("role" in resource.data)
          || resource.data.role != "admin"
        )
        && request.resource.data.role in ["student", "moderator"]
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
          "role",
          "roleUpdatedBy",
          "roleUpdatedAt",
          "updatedAt"
        ])
        && request.resource.data.roleUpdatedBy == request.auth.uid
        && request.resource.data.roleUpdatedAt == request.time
        && request.resource.data.updatedAt == request.time;

      // Users can delete their own account document.
      allow delete: if signedIn()
        && userId == request.auth.uid;
    }

    // Preserve existing app access for other documents,
    // while preventing role changes through the wildcard rule.
    match /{document=**} {
      allow read: if true;

      allow create: if signedIn()
        && !("role" in request.resource.data);

      allow update: if signedIn()
        && (
          (
            !("role" in resource.data)
            && !("role" in request.resource.data)
          )
          ||
          (
            "role" in resource.data
            && "role" in request.resource.data
            && request.resource.data.role == resource.data.role
          )
        );

      allow delete: if signedIn();
    }
  }
}
```

Replace the current starter rules with this complete block, or merge its logic
into the project's existing rules. Do not append it below a broad wildcard rule
such as `allow write: if request.auth != null`; overlapping `allow` statements
are additive, so that broad rule would bypass the role restrictions.

This preserves the current app's broad read/delete behavior. In particular,
`allow read: if true` means Firestore data remains publicly readable; tighten
those collection rules separately when the existing app access requirements are
mapped.
