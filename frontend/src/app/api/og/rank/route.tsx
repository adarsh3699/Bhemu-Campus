import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { fetchLeaderboardEntry } from "@/lib/fetchLeaderboardEntry";
import { formatProgramLabel } from "@/lib/programUtils";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const id = req.nextUrl.searchParams.get("id");
	if (!id) return new Response("Missing id", { status: 400 });

	const entry = await fetchLeaderboardEntry(id);
	if (!entry) return new Response("Not found", { status: 404 });

	const programLine = formatProgramLabel(entry.programName, entry.branch);

	return new ImageResponse(
		(
			<div
				style={{
					width: "1200px",
					height: "630px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					background: "linear-gradient(135deg, #1e1b4b 0%, #1a1a3a 50%, #172554 100%)",
					fontFamily: "Arial, sans-serif",
					position: "relative",
				}}
			>
				{/* Grid */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage:
							"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
						backgroundSize: "50px 50px",
					}}
				/>
				{/* Glow */}
				<div
					style={{
						position: "absolute",
						top: "10%",
						left: "50%",
						width: "700px",
						height: "350px",
						background: "radial-gradient(ellipse, rgba(99,102,241,0.3) 0%, transparent 70%)",
						filter: "blur(60px)",
						transform: "translateX(-50%)",
					}}
				/>

				{/* Main content */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "0px",
						position: "relative",
						zIndex: 1,
					}}
				>
					{/* Header */}
					<div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
						<div
							style={{
								width: "56px",
								height: "56px",
								borderRadius: "14px",
								background: "rgba(250,204,21,0.15)",
								border: "2px solid rgba(250,204,21,0.5)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: "28px",
							}}
						>
							🏆
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
							<div style={{ fontSize: "22px", fontWeight: "bold", color: "#ffffff" }}>
								CGPA Leaderboard
							</div>
							<div style={{ fontSize: "14px", color: "#94a3b8" }}>
								{programLine} · Batch {entry.batchYear}
							</div>
						</div>
					</div>

					{/* Rank */}
					<div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
						<div style={{ fontSize: "18px", color: "#94a3b8", letterSpacing: "3px", marginBottom: "8px" }}>
							RANK
						</div>
						<div style={{ fontSize: "120px", fontWeight: "bold", color: "#818cf8", lineHeight: "1" }}>
							#{entry.rank}
						</div>
						<div style={{ fontSize: "20px", color: "#64748b", marginTop: "8px" }}>
							of {entry.totalStudents} students
						</div>
					</div>

					{/* Name + CGPA row */}
					<div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
						<div
							style={{
								padding: "12px 28px",
								background: "rgba(255,255,255,0.07)",
								border: "1px solid rgba(255,255,255,0.12)",
								borderRadius: "12px",
								fontSize: "24px",
								fontWeight: "bold",
								color: "#ffffff",
							}}
						>
							{entry.name}
						</div>
						<div
							style={{
								padding: "12px 28px",
								background: "rgba(99,102,241,0.15)",
								border: "1px solid rgba(99,102,241,0.4)",
								borderRadius: "12px",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "2px",
							}}
						>
							<div style={{ fontSize: "13px", color: "#94a3b8" }}>CGPA</div>
							<div style={{ fontSize: "28px", fontWeight: "bold", color: "#a5b4fc" }}>
								{entry.cgpa.toFixed(2)}
							</div>
						</div>
					</div>
				</div>

				{/* Branding */}
				<div
					style={{
						position: "absolute",
						bottom: "28px",
						fontSize: "16px",
						color: "rgba(255,255,255,0.25)",
					}}
				>
					calc.bhemu.in · Bhemu Calculator
				</div>
			</div>
		),
		{ width: 1200, height: 630 }
	);
}
