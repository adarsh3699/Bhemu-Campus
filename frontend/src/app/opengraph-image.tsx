import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Bhemu Calculator - GPA Tracker, SGPA & CGPA Planning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
	const logoData = await readFile(join(process.cwd(), "public/newLogo512.png"));
	const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: "linear-gradient(135deg, #1e1b4b 0%, #1a1a3a 50%, #172554 100%)",
				fontFamily: "Arial, sans-serif",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={logoSrc} width={72} height={72} style={{ borderRadius: "18px" }} />
				<div style={{ display: "flex", fontSize: "52px", fontWeight: "bold", color: "#ffffff" }}>
					Bhemu Calculator
				</div>
			</div>
			<div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
				<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>CGPA Calculator</div>
				<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>Goal Planner</div>
				<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>Leaderboard</div>
				<div style={{ display: "flex", padding: "8px 18px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", fontSize: "18px" }}>UMS Sync</div>
			</div>
			<div style={{ display: "flex", fontSize: "18px", color: "rgba(255,255,255,0.5)", marginTop: "40px" }}>
				calc.bhemu.in
			</div>
		</div>,
		{ ...size }
	);
}
