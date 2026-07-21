export interface ParsedProgram {
	programName: string;
	branch: string | null;
	programCode: string;
}

export interface LeaderboardEntry {
	userId: string;
	profileId: string;
	name: string;
	realName?: string;
	vid: string;
	programCode: string;
	programName: string;
	branch: string | null;
	batchYear: string;
	cgpa: number;
	groupKey: string;
	optOut?: boolean;
	updatedAt: unknown;
}

export interface LeaderboardData {
	topEntries: LeaderboardEntry[];
	userEntry: LeaderboardEntry | null;
	userRank: number | null;
	nearbyEntries: LeaderboardEntry[];
	totalStudents: number;
}
