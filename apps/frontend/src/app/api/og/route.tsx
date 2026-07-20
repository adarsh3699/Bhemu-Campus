import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { fetchLeaderboardEntry } from "@/lib/fetchLeaderboardEntry";
import { formatProgramLabel } from "@bhemu/shared";

export const runtime = "edge";

const CACHE_HEADERS = {
	"Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
};

async function loadAssets(reqUrl: string) {
	const [logoRes, interBoldRes, interRegularRes] = await Promise.all([
		fetch(new URL("/newLogo512.png", reqUrl)),
		fetch(new URL("/Inter-Bold.ttf", reqUrl)),
		fetch(new URL("/Inter-Regular.ttf", reqUrl)),
	]);
	if (!logoRes.ok || !interBoldRes.ok || !interRegularRes.ok) {
		throw new Error("Asset fetch failed");
	}
	const logoBase64 = `data:image/png;base64,${Buffer.from(await logoRes.arrayBuffer()).toString("base64")}`;
	const interBold = await interBoldRes.arrayBuffer();
	const interRegular = await interRegularRes.arrayBuffer();
	return { logoBase64, interBold, interRegular };
}

function renderImage(title: string, description: string, assets: Awaited<ReturnType<typeof loadAssets>> | null) {
	const bg = [
		"radial-gradient(ellipse 45% 55% at 15% 82%, rgba(90,105,180,0.55) 40%, transparent 100%)",
		"radial-gradient(ellipse 45% 55% at 85% 82%, rgba(90,105,180,0.55) 40%, transparent 100%)",
		"#ffffff",
	].join(", ");

	return new ImageResponse(
		<div
			style={{
				width: "1200px",
				height: "630px",
				display: "flex",
				flexDirection: "column",
				backgroundImage: bg,
				fontFamily: assets ? "Inter, Arial, sans-serif" : "sans-serif",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					paddingTop: "40px",
					height: "326px",
				}}
			>
				<div
					style={{
						display: "flex",
						padding: "6px 17px",
						borderRadius: "30px",
						background: "rgba(1,1,1,0.14)",
						color: "#4d4d4d",
						fontSize: "20px",
						fontWeight: 400,
						marginBottom: "22px",
					}}
				>
					calc.bhemu.in
				</div>
				<div
					style={{
						display: "flex",
						fontSize: "45px",
						fontWeight: 700,
						color: "#000000",
						textAlign: "center",
						lineHeight: "1.2",
						marginBottom: "18px",
						maxWidth: "700px",
					}}
				>
					{title}
				</div>
				<div
					style={{
						display: "flex",
						fontSize: "26px",
						fontWeight: 400,
						color: "#424242",
						textAlign: "center",
						lineHeight: "1.2",
						maxWidth: "820px",
					}}
				>
					{description}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flex: 1,
					marginLeft: "138px",
					marginRight: "138px",
					borderRadius: "24px 24px 0 0",
					border: "7px solid #ffffff",
					borderBottom: "none",
					overflow: "hidden",
				}}
			>
				<div
					style={{
						width: "100%",
						height: "100%",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "flex-end",
						background: "linear-gradient(135deg, #1e1b4b 0%, #1a1a3a 50%, #172554 100%)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "24px" }}>
						{assets && (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={assets.logoBase64} width={65} height={65} alt="" style={{ borderRadius: "18px" }} />
						)}
						<div style={{ display: "flex", fontSize: "35px", fontWeight: 700, color: "#ffffff" }}>
							Bhemu Calculator
						</div>
					</div>
					<div style={{ display: "flex", gap: "12px", marginTop: "8px", marginBottom: "40px" }}>
						<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 400 }}>
							CGPA Calculator
						</div>
						<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 400 }}>
							Goal Planner
						</div>
						<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 400 }}>
							Leaderboard
						</div>
						<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 400 }}>
							UMS Sync
						</div>
					</div>
				</div>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			...(assets && {
				fonts: [
					{ name: "Inter", data: assets.interRegular, weight: 400 as const, style: "normal" as const },
					{ name: "Inter", data: assets.interBold, weight: 700 as const, style: "normal" as const },
				],
			}),
			headers: CACHE_HEADERS,
		}
	);
}

export async function GET(req: NextRequest) {
	const id = req.nextUrl.searchParams.get("id");
	let title = req.nextUrl.searchParams.get("title") ?? "";
	let description = req.nextUrl.searchParams.get("description") ?? "";

	if (!title && id) {
		try {
			const entry = await fetchLeaderboardEntry(id);
			if (entry) {
				const programLabel = formatProgramLabel(entry.programName, entry.branch);
				title = `${entry.name} — Rank #${entry.rank}`;
				description = `${entry.name} is ranked #${entry.rank} among ${entry.totalStudents} ${programLabel} students (Batch ${entry.batchYear}) with a CGPA of ${entry.cgpa.toFixed(2)}.`;
			}
		} catch {
			// Firestore fetch failed — fall through to defaults
		}
	}

	if (!title) title = "Bhemu Calculator";
	if (!description) description = "Track your academic progress, calculate SGPA & CGPA, plan future GPA goals.";

	let assets: Awaited<ReturnType<typeof loadAssets>> | null = null;
	try {
		assets = await loadAssets(req.url);
	} catch {
		// Asset fetch failed — render without custom fonts/logo
	}

	return renderImage(title, description, assets);
}
