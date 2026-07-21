"use client";

import { useState, useCallback } from "react";
import { Download, FileText, MessageCircle, Link2, Check } from "lucide-react";
import BaseModal from "@/components/modal/BaseModal";
import LeaderboardShareCard from "./LeaderboardShareCard";
import { drawLeaderboardCard } from "@/lib/drawLeaderboardCard";
import { formatProgramLabel } from "@bhemu/shared";
import type { LeaderboardData } from "@/types";

interface ShareLeaderboardModalProps {
	isOpen: boolean;
	onClose: () => void;
	leaderboardData: LeaderboardData;
}

function buildShareMessage(data: LeaderboardData, withEmoji: boolean): string {
	const { userEntry, userRank, totalStudents } = data;
	if (!userEntry || !userRank) return "";
	const programLabel = formatProgramLabel(userEntry.programName, userEntry.branch, "my program");
	const trophy = withEmoji ? " 🏆" : "";
	const rankUrl = `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}`;
	return `I'm ranked #${userRank} among ${totalStudents} ${programLabel} students (Batch ${userEntry.batchYear}) with a CGPA of ${userEntry.cgpa.toFixed(2)}!${trophy}\n\nTrack your CGPA, plan your goals, and see where you stand — sync your LPU UMS data with Bhemu Calculator.\n${rankUrl}`;
}

export default function ShareLeaderboardModal({
	isOpen,
	onClose,
	leaderboardData,
}: ShareLeaderboardModalProps) {
	const [exporting, setExporting] = useState(false);
	const [copied, setCopied] = useState(false);
	const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

	const { userEntry } = leaderboardData;
	const shareUrl = userEntry ? `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}` : null;

	const handleCopyLink = async () => {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};
	const shareMessage = buildShareMessage(leaderboardData, isMobile);

	const buildCanvas = useCallback((): HTMLCanvasElement | null => {
		const { userEntry, userRank, totalStudents } = leaderboardData;
		if (!userEntry || !userRank) return null;
		return drawLeaderboardCard({
			rank: userRank,
			totalStudents,
			cgpa: userEntry.cgpa.toFixed(2),
			name: userEntry.name,
			programLine: formatProgramLabel(userEntry.programName, userEntry.branch),
			batchYear: userEntry.batchYear,
		});
	}, [leaderboardData]);

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
			await new Promise((resolve, reject) => {
				img.onload = resolve;
				img.onerror = reject;
			});
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
			window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
			return;
		}
		setExporting(true);
		try {
			const blob = await getBlob();
			const file = blob ? new File([blob], "leaderboard-rank.png", { type: "image/png" }) : null;
			if (file && navigator.canShare?.({ files: [file] })) {
				await navigator.share({ text: shareMessage, files: [file] });
			} else {
				window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank");
			}
		} catch {
			// user cancelled
		} finally {
			setExporting(false);
		}
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="Share Your Rank" maxWidth="560px">
			<div className="p-4 space-y-4">
				{/* Preview card */}
				<div className="flex justify-center overflow-hidden" style={{ height: "398px" }}>
					<div className="transform scale-[0.88] origin-top shrink-0">
						<LeaderboardShareCard leaderboardData={leaderboardData} />
					</div>
				</div>

				{/* Share */}
				<div className="space-y-2">
					<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest px-0.5">
						Share
					</p>
					{isMobile ? (
						<button
							onClick={handleWhatsApp}
							disabled={exporting}
							className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-primary text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer"
						>
							<MessageCircle className="w-4 h-4" />
							Share My Rank
						</button>
					) : (
						<div className="grid grid-cols-2 gap-2">
							<button
								onClick={handleWhatsApp}
								className="flex items-center gap-2.5 px-4 py-2.5 bg-green-500/8 hover:bg-green-500/15 border border-green-500/20 rounded-xl text-sm font-medium text-green-400 transition-all duration-150 cursor-pointer"
							>
								<MessageCircle className="w-4 h-4 shrink-0" />
								WhatsApp
							</button>
							<button
								onClick={() =>
									window.open(
										`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl ?? "https://calc.bhemu.in/")}&text=${encodeURIComponent(shareMessage)}`,
										"_blank"
									)
								}
								className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-500/8 hover:bg-blue-500/15 border border-blue-500/20 rounded-xl text-sm font-medium text-blue-400 transition-all duration-150 cursor-pointer"
							>
								<svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
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
								className="flex items-center gap-2.5 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-sm font-medium text-foreground/70 transition-all duration-150 cursor-pointer col-span-2"
							>
								<svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
								X (Twitter)
							</button>
						</div>
					)}
				</div>

				{/* Copy link + Download */}
				{shareUrl && (
					<div className="space-y-2">
						<p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest px-0.5">
							Link & Download
						</p>
						<div className="flex items-center gap-2 px-3 py-2.5 bg-white/3 border border-white/8 rounded-xl">
							<Link2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
							<span className="text-xs text-muted-foreground/80 truncate flex-1 font-mono">
								{shareUrl}
							</span>
							<button
								onClick={handleCopyLink}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
									copied
										? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
										: "bg-primary/12 hover:bg-primary/20 text-primary border border-primary/25"
								}`}
							>
								{copied ? (
									<>
										<Check className="w-3 h-3" />
										Copied
									</>
								) : (
									<>
										<Link2 className="w-3 h-3" />
										Copy
									</>
								)}
							</button>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<button
								onClick={handleDownloadImage}
								disabled={exporting}
								className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-sm font-medium text-foreground/70 transition-all duration-150 disabled:opacity-40 cursor-pointer"
							>
								<Download className="w-4 h-4 text-blue-400 shrink-0" />
								Download PNG
							</button>
							<button
								onClick={handleDownloadPDF}
								disabled={exporting}
								className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl text-sm font-medium text-foreground/70 transition-all duration-150 disabled:opacity-40 cursor-pointer"
							>
								<FileText className="w-4 h-4 text-red-400 shrink-0" />
								Download PDF
							</button>
						</div>
					</div>
				)}
			</div>
		</BaseModal>
	);
}
