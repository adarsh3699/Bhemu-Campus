// Shared share/collaboration domain types

export interface ShareItem {
	shareId: string;
	targetUserEmail: string;
	permission: "read" | "edit";
	isActive: boolean;
	sharedAt?: unknown;
}
