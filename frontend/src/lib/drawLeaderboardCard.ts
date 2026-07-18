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

export function drawLeaderboardCard(data: DrawCardData): HTMLCanvasElement {
	const scale = 2;
	const W = 400;
	const H = 490;
	const px = 24;

	const canvas = document.createElement("canvas");
	canvas.width = W * scale;
	canvas.height = H * scale;

	const ctx = canvas.getContext("2d")!;
	ctx.scale(scale, scale);

	// Background
	const bg = ctx.createLinearGradient(0, 0, W, H);
	bg.addColorStop(0, "#1e1b4b");
	bg.addColorStop(0.5, "#1a1a3a");
	bg.addColorStop(1, "#172554");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	let y = 28;

	// Icon box — solid background so emoji renders at full color
	ctx.fillStyle = "#2a2560";
	roundRect(ctx, px, y, 44, 44, 11);
	ctx.fill();
	ctx.strokeStyle = "rgba(250,204,21,0.7)";
	ctx.lineWidth = 1.5;
	roundRect(ctx, px, y, 44, 44, 11);
	ctx.stroke();

	ctx.font = "24px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Arial";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("🏆", px + 22, y + 23);

	// Header text
	const textX = px + 54;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";

	ctx.font = "bold 17px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.fillText("CGPA Leaderboard", textX, y + 2);

	ctx.font = "11px Arial";
	ctx.fillStyle = "#94a3b8";
	ctx.fillText(data.programLine, textX, y + 24);
	ctx.fillText("Batch " + data.batchYear, textX, y + 40);

	y += 64;

	// Rank card
	const rankH = 118;
	ctx.fillStyle = "rgba(255,255,255,0.06)";
	roundRect(ctx, px, y, W - px * 2, rankH, 12);
	ctx.fill();
	ctx.strokeStyle = "rgba(255,255,255,0.10)";
	ctx.lineWidth = 1;
	roundRect(ctx, px, y, W - px * 2, rankH, 12);
	ctx.stroke();

	ctx.textAlign = "center";
	ctx.textBaseline = "top";

	ctx.font = "bold 10px Arial";
	ctx.fillStyle = "#94a3b8";
	ctx.fillText("MY RANK", W / 2, y + 14);

	ctx.font = "bold 54px Arial";
	ctx.fillStyle = "#818cf8";
	ctx.fillText("#" + data.rank, W / 2, y + 32);

	ctx.font = "12px Arial";
	ctx.fillStyle = "#64748b";
	ctx.fillText("of " + data.totalStudents + " students", W / 2, y + 96);

	y += rankH + 12;

	// CGPA row
	const cgpaH = 48;
	ctx.fillStyle = "rgba(255,255,255,0.05)";
	roundRect(ctx, px, y, W - px * 2, cgpaH, 10);
	ctx.fill();
	ctx.strokeStyle = "rgba(255,255,255,0.10)";
	ctx.lineWidth = 1;
	roundRect(ctx, px, y, W - px * 2, cgpaH, 10);
	ctx.stroke();

	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	ctx.font = "13px Arial";
	ctx.fillStyle = "#94a3b8";
	ctx.fillText("CGPA", px + 16, y + cgpaH / 2);

	ctx.textAlign = "right";
	ctx.font = "bold 22px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(data.cgpa, W - px - 16, y + cgpaH / 2);

	y += cgpaH + 16;

	// Name
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "bold 14px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.8)";
	ctx.fillText(data.name, W / 2, y);

	y += 28;

	// Divider
	ctx.beginPath();
	ctx.strokeStyle = "rgba(255,255,255,0.08)";
	ctx.lineWidth = 1;
	ctx.moveTo(px, y);
	ctx.lineTo(W - px, y);
	ctx.stroke();

	y += 14;

	// Branding
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = "10px Arial";
	ctx.fillStyle = "#475569";
	ctx.fillText("calc.bhemu.in  -  Bhemu Calculator", W / 2, y);

	return canvas;
}
