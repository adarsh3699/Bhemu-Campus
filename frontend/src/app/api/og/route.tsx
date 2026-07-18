import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const title = req.nextUrl.searchParams.get("title") ?? "Bhemu Calculator";
	const description =
		req.nextUrl.searchParams.get("description") ??
		"Track your academic progress, calculate SGPA & CGPA, plan future GPA goals.";

	const [logoRes, interBoldRes, interRegularRes] = await Promise.all([
		fetch(new URL("/newLogo512.png", req.url)),
		fetch(new URL("/Inter-Bold.ttf", req.url)),
		fetch(new URL("/Inter-Regular.ttf", req.url)),
	]);
	const logoBase64 = `data:image/png;base64,${Buffer.from(await logoRes.arrayBuffer()).toString("base64")}`;
	const interBold = await interBoldRes.arrayBuffer();
	const interRegular = await interRegularRes.arrayBuffer();

	const bg = [
		"radial-gradient(ellipse 45% 55% at 15% 82%, rgba(90,105,180,0.55) 40%, transparent 100%)",
		"radial-gradient(ellipse 45% 55% at 85% 82%, rgba(90,105,180,0.55) 40%, transparent 100%)",
		"#ffffff",
	].join(", ");

	// Dark card JSX — same content as the old opengraph-image.tsx
	const cardContent = (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "flex-end",
				background: "linear-gradient(135deg, #1e1b4b 0%, #1a1a3a 50%, #172554 100%)",
				fontFamily: "Inter, Arial, sans-serif",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "24px" }}>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={logoBase64} width={65} height={65} alt="Bhemu Calculator" style={{ borderRadius: "18px" }} />
				<div style={{ display: "flex", fontSize: "35px", fontWeight: 700, color: "#ffffff" }}>
					Bhemu Calculator
				</div>
			</div>
			<div style={{ display: "flex", gap: "12px", marginTop: "8px", marginBottom: "40px" }}>
				<div
					style={{
						display: "flex",
						padding: "8px 18px",
						borderRadius: "999px",
						background: "rgba(255,255,255,0.07)",
						border: "1px solid rgba(255,255,255,0.2)",
						color: "rgba(255,255,255,0.7)",
						fontSize: "13px",
						fontWeight: 400,
					}}
				>
					CGPA Calculator
				</div>
				<div
					style={{
						display: "flex",
						padding: "8px 18px",
						borderRadius: "999px",
						background: "rgba(255,255,255,0.07)",
						border: "1px solid rgba(255,255,255,0.2)",
						color: "rgba(255,255,255,0.7)",
						fontSize: "13px",
						fontWeight: 400,
					}}
				>
					Goal Planner
				</div>
				<div
					style={{
						display: "flex",
						padding: "8px 18px",
						borderRadius: "999px",
						background: "rgba(255,255,255,0.07)",
						border: "1px solid rgba(255,255,255,0.2)",
						color: "rgba(255,255,255,0.7)",
						fontSize: "13px",
						fontWeight: 400,
					}}
				>
					Leaderboard
				</div>
				<div
					style={{
						display: "flex",
						padding: "8px 18px",
						borderRadius: "999px",
						background: "rgba(255,255,255,0.07)",
						border: "1px solid rgba(255,255,255,0.2)",
						color: "rgba(255,255,255,0.7)",
						fontSize: "13px",
						fontWeight: 400,
					}}
				>
					UMS Sync
				</div>
			</div>
		</div>
	);

	return new ImageResponse(
		<div
			style={{
				width: "1200px",
				height: "630px",
				display: "flex",
				flexDirection: "column",
				backgroundImage: bg,
				fontFamily: "Inter, Arial, sans-serif",
			}}
		>
			{/* Text section */}
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
						fontSize: "47px",
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

			{/* Dark card with app branding */}
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
				{cardContent}
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{ name: "Inter", data: interRegular, weight: 400, style: "normal" },
				{ name: "Inter", data: interBold, weight: 700, style: "normal" },
			],
		}
	);
}
