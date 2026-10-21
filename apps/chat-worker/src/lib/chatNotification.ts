import type { Env } from "../types";

const DEFAULT_WEB_APP_URL = "https://campus.bhemu.in";

/** Build the canonical web URL opened by a chat notification click. */
export function buildChatWebLink(env: Env, roomId: string, messageId: string, roomType: string): string {
	const baseUrl = (env.WEB_APP_URL || DEFAULT_WEB_APP_URL).trim() || DEFAULT_WEB_APP_URL;
	const url = new URL("/chat", baseUrl);
	url.searchParams.set("roomId", roomId);
	url.searchParams.set("messageId", messageId);
	url.searchParams.set("roomType", roomType);
	return url.toString();
}
