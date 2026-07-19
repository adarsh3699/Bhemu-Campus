interface DrawCardData {
	rank: number;
	totalStudents: number;
	cgpa: string;
	name: string;
	programLine: string;
	batchYear: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function getTierColors(rank: number) {
	if (rank === 1) return {
		stripe: ["#D97706", "#FDE68A", "#F59E0B", "#D97706"],
		rankGradient: ["#FDE68A", "#FBBF24", "#F59E0B", "#D97706"],
		badgeBg: "rgba(245,158,11,0.12)",
		badgeBorder: "rgba(245,158,11,0.3)",
		badgeText: "#FCD34D",
		glowColor: "rgba(245,158,11,0.2)",
		iconBg: "rgba(245,158,11,0.15)",
		iconBorder: "rgba(245,158,11,0.4)",
	};
	if (rank === 2) return {
		stripe: ["#64748B", "#CBD5E1", "#94A3B8", "#64748B"],
		rankGradient: ["#F1F5F9", "#CBD5E1", "#94A3B8", "#64748B"],
		badgeBg: "rgba(148,163,184,0.12)",
		badgeBorder: "rgba(148,163,184,0.3)",
		badgeText: "#CBD5E1",
		glowColor: "rgba(148,163,184,0.15)",
		iconBg: "rgba(148,163,184,0.15)",
		iconBorder: "rgba(148,163,184,0.4)",
	};
	if (rank === 3) return {
		stripe: ["#92400E", "#FED7AA", "#F97316", "#92400E"],
		rankGradient: ["#FED7AA", "#FB923C", "#F97316", "#C2410C"],
		badgeBg: "rgba(249,115,22,0.12)",
		badgeBorder: "rgba(249,115,22,0.3)",
		badgeText: "#FDBA74",
		glowColor: "rgba(249,115,22,0.15)",
		iconBg: "rgba(249,115,22,0.15)",
		iconBorder: "rgba(249,115,22,0.4)",
	};
	return {
		stripe: ["#0398ac", "#22d3ee", "#0398ac", "#004eeb"],
		rankGradient: ["#67E8F9", "#22D3EE", "#0398ac", "#004eeb"],
		badgeBg: "rgba(3,152,172,0.12)",
		badgeBorder: "rgba(3,152,172,0.3)",
		badgeText: "#22D3EE",
		glowColor: "rgba(3,152,172,0.15)",
		iconBg: "rgba(3,152,172,0.15)",
		iconBorder: "rgba(3,152,172,0.4)",
	};
}

function getPercentile(rank: number, total: number) {
	if (total <= 1) return 100;
	return Math.round(((total - rank) / (total - 1)) * 100);
}

function getAchievementLabel(rank: number, total: number) {
	if (rank === 1) return "Batch Topper!";
	if (rank <= 3) return "Top 3";
	if (rank <= 10) return "Top 10";
	const percentile = getPercentile(rank, total);
	if (percentile >= 80) return `Top ${100 - percentile}% of the class`;
	return `Ranked #${rank} of ${total}`;
}

export function drawLeaderboardCard(data: DrawCardData): HTMLCanvasElement {
	const scale = 2;
	const W = 440;
	const H = 560;
	const px = 28;

	const canvas = document.createElement("canvas");
	canvas.width = W * scale;
	canvas.height = H * scale;

	const ctx = canvas.getContext("2d")!;
	ctx.scale(scale, scale);

	const t = getTierColors(data.rank);
	const percentile = getPercentile(data.rank, data.totalStudents);
	const achievementLabel = getAchievementLabel(data.rank, data.totalStudents);

	// Background — no rounded corners, full bleed
	const bg = ctx.createLinearGradient(0, 0, W * 0.6, H);
	bg.addColorStop(0, "#111827");
	bg.addColorStop(1, "#0F172A");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	// Accent stripe at top
	const stripe = ctx.createLinearGradient(0, 0, W, 0);
	stripe.addColorStop(0, t.stripe[0]);
	stripe.addColorStop(0.4, t.stripe[1]);
	stripe.addColorStop(0.6, t.stripe[2]);
	stripe.addColorStop(1, t.stripe[3]);
	ctx.fillStyle = stripe;
	ctx.fillRect(0, 0, W, 4);

	let y = 28;

	// Icon box — border only, no background fill
	ctx.strokeStyle = t.iconBorder;
	ctx.lineWidth = 1;
	roundRect(ctx, px, y, 44, 44, 12);
	ctx.stroke();

	ctx.font = "22px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(data.rank <= 3 ? "🏅" : "🏆", px + 22, y + 23);

	// Header text
	const textX = px + 56;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	ctx.font = "bold 12px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.letterSpacing = "1.5px";
	ctx.fillText("CGPA LEADERBOARD", textX, y + 4);

	ctx.font = "12px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.55)";
	ctx.fillText(data.programLine, textX, y + 22);
	ctx.fillStyle = "rgba(255,255,255,0.35)";
	ctx.fillText("Batch " + data.batchYear, textX, y + 38);

	// Rank badge pill (top right)
	const pillText = "#" + data.rank;
	ctx.font = "bold 12px Arial";
	const pillW = ctx.measureText(pillText).width + 20;
	const pillX = W - px - pillW;
	const pillY = y + 6;
	ctx.fillStyle = t.badgeBg;
	roundRect(ctx, pillX, pillY, pillW, 28, 14);
	ctx.fill();
	ctx.strokeStyle = t.badgeBorder;
	ctx.lineWidth = 1;
	roundRect(ctx, pillX, pillY, pillW, 28, 14);
	ctx.stroke();
	ctx.fillStyle = t.badgeText;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(pillText, pillX + pillW / 2, pillY + 14);

	y += 72;

	// MY RANK label
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "bold 10px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.35)";
	ctx.fillText("MY RANK", W / 2, y);

	y += 18;

	// Big rank number with gradient
	const rankText = "#" + data.rank;
	ctx.font = "bold 80px Arial";
	ctx.textBaseline = "top";
	const rankGrad = ctx.createLinearGradient(0, y, 0, y + 80);
	rankGrad.addColorStop(0, t.rankGradient[0]);
	rankGrad.addColorStop(0.35, t.rankGradient[1]);
	rankGrad.addColorStop(0.7, t.rankGradient[2]);
	rankGrad.addColorStop(1, t.rankGradient[3]);
	ctx.fillStyle = rankGrad;
	ctx.fillText(rankText, W / 2, y);

	y += 90;

	// "of X students"
	ctx.font = "13px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.35)";
	ctx.fillText("of " + data.totalStudents + " students", W / 2, y);

	y += 30;

	// Stats grid (CGPA + Percentile)
	const statW = (W - px * 2 - 12) / 2;
	const statH = 72;

	// CGPA box
	ctx.fillStyle = "rgba(255,255,255,0.03)";
	roundRect(ctx, px, y, statW, statH, 12);
	ctx.fill();
	ctx.strokeStyle = "rgba(255,255,255,0.07)";
	ctx.lineWidth = 1;
	roundRect(ctx, px, y, statW, statH, 12);
	ctx.stroke();

	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "bold 10px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.35)";
	ctx.fillText("CGPA", px + statW / 2, y + 14);
	ctx.font = "bold 28px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(data.cgpa, px + statW / 2, y + 32);

	// Percentile box
	const statX2 = px + statW + 12;
	ctx.fillStyle = "rgba(255,255,255,0.03)";
	roundRect(ctx, statX2, y, statW, statH, 12);
	ctx.fill();
	ctx.strokeStyle = "rgba(255,255,255,0.07)";
	ctx.lineWidth = 1;
	roundRect(ctx, statX2, y, statW, statH, 12);
	ctx.stroke();

	ctx.font = "bold 10px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.35)";
	ctx.fillText("PERCENTILE", statX2 + statW / 2, y + 14);
	ctx.font = "bold 28px Arial";
	const percGrad = ctx.createLinearGradient(0, y + 32, 0, y + 60);
	percGrad.addColorStop(0, t.rankGradient[0]);
	percGrad.addColorStop(1, t.rankGradient[2]);
	ctx.fillStyle = percGrad;
	ctx.fillText(String(percentile), statX2 + statW / 2, y + 32);

	y += statH + 12;

	// Achievement badge
	const badgeH = 36;
	ctx.fillStyle = t.badgeBg;
	roundRect(ctx, px, y, W - px * 2, badgeH, 10);
	ctx.fill();
	ctx.strokeStyle = t.badgeBorder;
	ctx.lineWidth = 1;
	roundRect(ctx, px, y, W - px * 2, badgeH, 10);
	ctx.stroke();

	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 13px Arial";
	ctx.fillStyle = t.badgeText;
	ctx.fillText("★  " + achievementLabel, W / 2, y + badgeH / 2);

	y += badgeH + 16;

	// Name
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "bold 18px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(data.name, W / 2, y);

	y += 34;

	// Footer separator
	ctx.beginPath();
	ctx.strokeStyle = "rgba(255,255,255,0.05)";
	ctx.lineWidth = 1;
	ctx.moveTo(px, y);
	ctx.lineTo(W - px, y);
	ctx.stroke();

	y += 14;

	// Branding
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "10px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.28)";
	ctx.fillText("calc.bhemu.in  ·  Bhemu Calculator", W / 2, y);

	return canvas;
}
