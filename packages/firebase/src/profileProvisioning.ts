import {
	 doc,
	 runTransaction,
	 serverTimestamp,
	 type Firestore,
} from "firebase/firestore";

export interface NewUserProfileInput {
	uid: string;
	email: string | null;
	displayName: string | null;
	photoURL: string | null;
}

function defaultProfileName(input: NewUserProfileInput): string {
	return input.displayName?.trim() || input.email?.split("@")[0] || "User";
}

/**
 * Creates a user document, their default profile, and its initial semester in
 * one Firestore transaction. This function is intentionally called only by an
 * explicit new-user signup flow. It never repairs a partially provisioned or
 * existing account, because doing so could silently create unexpected data.
 */
export async function provisionNewUserProfile(
	db: Firestore,
	input: NewUserProfileInput
): Promise<void> {
	const userRef = doc(db, "users", input.uid);
	const profileId = Date.now().toString();
	const semesterId = Date.now().toString();
	const profileRef = doc(userRef, "profiles", profileId);
	const semesterRef = doc(profileRef, "gpaAndMarks", semesterId);
	const name = defaultProfileName(input);

	await runTransaction(db, async (transaction) => {
		const userSnapshot = await transaction.get(userRef);

		if (userSnapshot.exists()) {
			// If the user document already exists, it means the provisioning was
			// already completed (e.g. client retried a successful signup).
			// Since profileId is generated dynamically, we can't fetch it directly,
			// so we just return gracefully.
			return;
		}

		transaction.set(userRef, {
			email: input.email,
			displayName: name,
			photoURL: input.photoURL,
			createdAt: serverTimestamp(),
			lastLoginAt: serverTimestamp(),
		});
		transaction.set(profileRef, {
			name,
			isDefault: true,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
		transaction.set(semesterRef, {
			id: semesterId,
			name: "Semester 1",
			subjects: [],
		});
	});
}
