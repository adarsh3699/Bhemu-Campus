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
					position: "relative",
				}}
			>
				{/* Subtle grid overlay */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage:
							"linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>

				{/* Glow */}
				<div
					style={{
						position: "absolute",
						top: "20%",
						left: "50%",
						transform: "translateX(-50%)",
						width: "600px",
						height: "300px",
						background: "radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%)",
						filter: "blur(40px)",
					}}
				/>

				{/* Logo + title row */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "20px",
						marginBottom: "24px",
						position: "relative",
					}}
				>
					<div
						style={{
							width: "72px",
							height: "72px",
							borderRadius: "18px",
							background: "rgba(99,102,241,0.2)",
							border: "2px solid rgba(99,102,241,0.5)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							fontSize: "36px",
						}}
					>
						🎓
					</div>
					<div
						style={{
							fontSize: "52px",
							fontWeight: "bold",
							color: "#ffffff",
							letterSpacing: "-1px",
						}}
					>
						Bhemu Calculator
					</div>
				</div>

				{/* Tagline */}
				<div
					style={{
						fontSize: "26px",
						color: "rgba(255,255,255,0.6)",
						textAlign: "center",
						maxWidth: "700px",
						lineHeight: "1.4",
						position: "relative",
					}}
				>
					GPA Tracker · SGPA & CGPA Planning · Goal Planner
				</div>

				{/* Feature pills */}
				<div
					style={{
						display: "flex",
						gap: "12px",
						marginTop: "40px",
						position: "relative",
					}}
				>
					{["CGPA Calculator", "Goal Planner", "Leaderboard", "UMS Sync"].map((label) => (
						<div
							key={label}
							style={{
								padding: "8px 18px",
								borderRadius: "999px",
								background: "rgba(255,255,255,0.08)",
								border: "1px solid rgba(255,255,255,0.15)",
								color: "rgba(255,255,255,0.75)",
								fontSize: "16px",
							}}
						>
							{label}
						</div>
					))}
				</div>

				{/* URL */}
				<div
					style={{
						position: "absolute",
						bottom: "32px",
						fontSize: "18px",
						color: "rgba(255,255,255,0.3)",
					}}
				>
					calc.bhemu.in
				</div>
			</div>
		),
		{ ...size }
	);
}
