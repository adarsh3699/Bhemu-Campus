export interface AuthReadyState<User> {
	currentUser: User | null;
	authLoading: boolean;
}

/** Firebase auth restoration is complete as soon as its observer publishes a user. */
export function authStateAfterRestore<User>(user: User | null): AuthReadyState<User> {
	return { currentUser: user, authLoading: false };
}
