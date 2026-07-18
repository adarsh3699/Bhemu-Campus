import { ImageResponse } from "next/og";

export const alt = "Bhemu Calculator - GPA Tracker, SGPA & CGPA Planning";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
	return new ImageResponse(
		(
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
				{/* Logo + title */}
				<div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px" }}>
					<div
						style={{
							width: "72px",
							height: "72px",
							borderRadius: "18px",
							background: "rgba(99,102,241,0.25)",
							border: "2px solid rgba(99,102,241,0.5)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "36px",
						}}
					>
						🎓
					</div>
					<div style={{ display: "flex", fontSize: "52px", fontWeight: "bold", color: "#ffffff" }}>
						Bhemu Calculator
					</div>
				</div>

				{/* Tagline */}
				<div style={{ display: "flex", fontSize: "24px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>
					GPA Tracker · SGPA & CGPA Planning · Goal Planner
				</div>

				{/* Feature pills */}
				<div style={{ display: "flex", gap: "12px", marginBottom: "40px" }}>
					{["CGPA Calculator", "Goal Planner", "Leaderboard", "UMS Sync"].map((label) => (
						<div
							key={label}
							style={{
								display: "flex",
								padding: "8px 18px",
								borderRadius: "999px",
								background: "rgba(255,255,255,0.07)",
								border: "1px solid rgba(255,255,255,0.12)",
								color: "rgba(255,255,255,0.7)",
								fontSize: "16px",
							}}
						>
							{label}
						</div>
					))}
				</div>

				{/* URL */}
				<div style={{ display: "flex", fontSize: "18px", color: "rgba(255,255,255,0.25)" }}>
					calc.bhemu.in
				</div>
			</div>
		),
		{ ...size }
	);
}
