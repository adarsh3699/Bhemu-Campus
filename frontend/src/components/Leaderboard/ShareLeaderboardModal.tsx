"use client";

import { useState, useCallback } from "react";
import { Download, FileText, MessageCircle, Link2, Check } from "lucide-react";
import BaseModal from "@/components/modal/BaseModal";
import LeaderboardShareCard from "./LeaderboardShareCard";
import { drawLeaderboardCard } from "@/lib/drawLeaderboardCard";
import { formatProgramLabel } from "@/lib/programUtils";
import type { LeaderboardData, ParsedProgram } from "@/types";

interface ShareLeaderboardModalProps {
	isOpen: boolean;
	onClose: () => void;
	leaderboardData: LeaderboardData;
	parsedProgram: ParsedProgram | null;
}

function buildShareMessage(data: LeaderboardData, parsedProgram: ParsedProgram | null, withEmoji: boolean): string {
	const { userEntry, userRank, totalStudents } = data;
	if (!userEntry || !userRank) return "";
	const programLabel = formatProgramLabel(parsedProgram?.programName, parsedProgram?.branch, "my program");
	const trophy = withEmoji ? " 🏆" : "";
	const rankUrl = `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}`;
	return `I'm ranked #${userRank} among ${totalStudents} ${programLabel} students (Batch ${userEntry.batchYear}) with a CGPA of ${userEntry.cgpa.toFixed(2)}!${trophy}\n\nTrack your CGPA, plan your goals, and see where you stand — sync your LPU UMS data with Bhemu Calculator.\n${rankUrl}`;
}

export default function ShareLeaderboardModal({
	isOpen,
	onClose,
	leaderboardData,
	parsedProgram,
}: ShareLeaderboardModalProps) {
	const [exporting, setExporting] = useState(false);
	const [copied, setCopied] = useState(false);
	const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

	const { userEntry } = leaderboardData;
	const shareUrl = userEntry
		? `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}`
		: null;

	const handleCopyLink = async () => {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};
	const shareMessage = buildShareMessage(leaderboardData, parsedProgram, isMobile);

	const buildCanvas = useCallback((): HTMLCanvasElement | null => {
		const { userEntry, userRank, totalStudents } = leaderboardData;
		if (!userEntry || !userRank) return null;
		return drawLeaderboardCard({
			rank: userRank,
			totalStudents,
			cgpa: userEntry.cgpa.toFixed(2),
			name: userEntry.name,
			programLine: formatProgramLabel(parsedProgram?.programName, parsedProgram?.branch),
			batchYear: userEntry.batchYear,
		});
	}, [leaderboardData, parsedProgram]);

	const getBlob = useCallback((): Promise<Blob | null> => {
		const canvas = buildCanvas();
		if (!canvas) return Promise.resolve(null);
		return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
	}, [buildCanvas]);

	const handleDownloadImage = async () => {
		setExporting(true);
		try {
			const blob = await getBlob();
			if (!blob) return;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "leaderboard-rank.png";
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	};

	const handleDownloadPDF = async () => {
		setExporting(true);
		try {
			const blob = await getBlob();
			if (!blob) return;
			const { default: jsPDF } = await import("jspdf");
			const canvas = buildCanvas()!;
			const W = canvas.width / 2;
			const H = canvas.height / 2;
			const url = URL.createObjectURL(blob);
			const img = new Image();
			img.src = url;
			await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
			const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [W, H] });
			pdf.addImage(img, "PNG", 0, 0, W, H);
			pdf.save("leaderboard-rank.pdf");
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	};

	const handleWhatsApp = async () => {
		if (!isMobile) {
			// Desktop: open WhatsApp web with text directly — system share sheet is useless on desktop
			window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
			return;
		}
		// Mobile: use native share sheet with image so user can pick WhatsApp
		setExporting(true);
		try {
			const blob = await getBlob();
			const file = blob ? new File([blob], "leaderboard-rank.png", { type: "image/png" }) : null;
			if (file && navigator.canShare?.({ files: [file] })) {
				await navigator.share({ text: shareMessage, files: [file] });
			} else {
				// HTTP or unsupported — fall back to text-only
				window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
			}
		} catch {
			// user cancelled
		} finally {
			setExporting(false);
		}
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="Share Your Rank" maxWidth="480px">
			<div className="p-5 space-y-5">
				{/* Preview — Tailwind is fine here, only used for display not capture */}
				<div className="flex justify-center overflow-hidden rounded-xl">
					<div className="transform scale-[0.75] origin-top" style={{ height: "368px" }}>
						<LeaderboardShareCard leaderboardData={leaderboardData} parsedProgram={parsedProgram} />
					</div>
				</div>

				{/* Share */}
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Share</p>
					{isMobile ? (
						// Mobile: one button opens native share sheet with image
						<button
							onClick={handleWhatsApp}
							disabled={exporting}
							className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-primary text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 hover:-translate-y-0.5"
						>
							<MessageCircle className="w-4 h-4" />
							Share My Rank
						</button>
					) : (
						// Desktop: individual platform buttons (no native share sheet)
						<div className="grid grid-cols-2 gap-2">
							<button
								onClick={handleWhatsApp}
								className="flex items-center gap-2 px-4 py-3 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-xl text-sm font-medium text-green-400 transition-all duration-200"
							>
								<MessageCircle className="w-4 h-4" />
								WhatsApp
							</button>
							<button
								onClick={() => {
									window.open(
										`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl ?? "https://calc.bhemu.in/")}&text=${encodeURIComponent(shareMessage)}`,
										"_blank"
									);
								}}
								className="flex items-center gap-2 px-4 py-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm font-medium text-blue-400 transition-all duration-200"
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
								</svg>
								LinkedIn
							</button>
							<button
								onClick={() =>
									window.open(
										`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
										"_blank"
									)
								}
								className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-foreground/80 transition-all duration-200 col-span-2"
							>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
								X (Twitter)
							</button>
						</div>
					)}
				</div>

				{/* Copy Link */}
				{shareUrl && (
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Shareable Link</p>
						<div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
							<Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
							<span className="text-xs text-muted-foreground truncate flex-1">{shareUrl}</span>
							<button
								onClick={handleCopyLink}
								className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 rounded-lg text-xs font-semibold text-primary transition-all duration-200 shrink-0"
							>
								{copied ? (
									<><Check className="w-3.5 h-3.5" />Copied!</>
								) : (
									<><Link2 className="w-3.5 h-3.5" />Copy</>
								)}
							</button>
						</div>
					</div>
				)}

				{/* Download */}
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Download</p>
					<div className="grid grid-cols-2 gap-2">
						<button
							onClick={handleDownloadImage}
							disabled={exporting}
							className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-foreground/80 transition-all duration-200 disabled:opacity-50"
						>
							<Download className="w-4 h-4 text-blue-400" />
							Image
						</button>
						<button
							onClick={handleDownloadPDF}
							disabled={exporting}
							className="flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-foreground/80 transition-all duration-200 disabled:opacity-50"
						>
							<FileText className="w-4 h-4 text-red-400" />
							PDF
						</button>
					</div>
				</div>
			</div>
		</BaseModal>
	);
}
