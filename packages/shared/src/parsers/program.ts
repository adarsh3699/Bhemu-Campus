import type { ParsedProgram } from "../types/leaderboard";

export function parseProgram(program: string | null | undefined): ParsedProgram | null {
	if (!program) return null;

	const parenGroups: string[] = [];
	const regex = /\(([^)]+)\)/g;
	let match;
	while ((match = regex.exec(program)) !== null) {
		parenGroups.push(match[1].trim());
	}

	if (parenGroups.length === 0) return null;

	const programCode = parenGroups[parenGroups.length - 1];
	const programName = program.split("(")[0].trim();
	const branch = parenGroups.length >= 2 ? parenGroups[parenGroups.length - 2] : null;

	if (!programName || !programCode) return null;

	return { programName, branch, programCode };
}

export function shortenName(fullName: string): string {
	if (!fullName) return "";
	const parts = fullName.trim().split(/\s+/);
	if (parts.length <= 1) return parts[0];
	const lastName = parts[parts.length - 1];
	return `${parts[0]} ${lastName[0]}.`;
}

export function buildGroupKey(batchYear: string, programCode: string): string {
	return `${batchYear}_${programCode}`;
}

export function formatProgramLabel(
	programName: string | null | undefined,
	branch: string | null | undefined,
	fallback = "Program"
): string {
	if (!programName) return fallback;
	return branch ? `${programName} ${branch}` : programName;
}

export function deriveBatchYear(
	vid: string | null | undefined,
	batchYear: string | null | undefined
): string | null {
	if (batchYear) return batchYear;
	if (!vid || vid.length < 3) return null;
	const suffix = vid.slice(1, 3);
	if (!/^\d{2}$/.test(suffix)) return null;
	return `20${suffix}`;
}
