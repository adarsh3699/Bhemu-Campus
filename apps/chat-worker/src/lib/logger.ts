// ============================================================
// bCampus Chat Worker — Structured Logger
// ============================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
	requestId?: string;
	userUid?: string;
	roomId?: string;
	endpoint?: string;
	method?: string;
	statusCode?: number;
	durationMs?: number;
	dbDurationMs?: number;
	doDurationMs?: number;
	[key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, ctx: LogContext = {}): string {
	return JSON.stringify({
		level,
		message,
		timestamp: new Date().toISOString(),
		...ctx,
	});
}

export const logger = {
	debug(message: string, ctx?: LogContext): void {
		console.debug(formatLog("debug", message, ctx));
	},
	info(message: string, ctx?: LogContext): void {
		console.log(formatLog("info", message, ctx));
	},
	warn(message: string, ctx?: LogContext): void {
		console.warn(formatLog("warn", message, ctx));
	},
	error(message: string, ctx?: LogContext): void {
		console.error(formatLog("error", message, ctx));
	},
};

// ---- Request timing helper ----

export function createTimer(): () => number {
	const start = Date.now();
	return () => Date.now() - start;
}
