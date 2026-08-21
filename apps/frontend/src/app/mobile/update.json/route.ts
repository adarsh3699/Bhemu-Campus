import { NextResponse } from "next/server";
import { MOBILE_RELEASE } from "@/lib/mobileRelease";

export const dynamic = "force-static";

export function GET(): NextResponse {
	return NextResponse.json(MOBILE_RELEASE, {
		headers: {
			"Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
		},
	});
}
