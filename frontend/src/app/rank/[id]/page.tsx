import Link from "next/link";
import type { Metadata } from "next";
import { fetchLeaderboardEntry } from "@/lib/fetchLeaderboardEntry";
import { formatProgramLabel } from "@/lib/programUtils";

interface Props {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const entry = await fetchLeaderboardEntry(id);

	if (!entry) {
		return {
			title: "Rank Not Found | Bhemu Calculator",
			robots: { index: false, follow: false },
		};
	}

	const programLabel = formatProgramLabel(entry.programName, entry.branch);
	const title = `${entry.name} — Rank #${entry.rank} | Bhemu Calculator`;
	const description = `${entry.name} is ranked #${entry.rank} among ${entry.totalStudents} ${programLabel} students (Batch ${entry.batchYear}) with a CGPA of ${entry.cgpa.toFixed(2)}.`;
	const ogImageUrl = `https://calc.bhemu.in/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}`;

	return {
		title,
		description,
		openGraph: {
			title,
			description,
			url: `https://calc.bhemu.in/rank/${id}`,
			siteName: "Bhemu Calculator",
			images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
			type: "website",
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [ogImageUrl],
		},
	};
}

export default async function RankPage({ params }: Props) {
	const { id } = await params;
	const entry = await fetchLeaderboardEntry(id);

	if (!entry) {
		return (
			<div className="w-full min-h-screen flex flex-col items-center justify-center p-6 bg-transparent">
				<p className="text-2xl font-bold text-white mb-2">Rank not found</p>
				<p className="text-sm text-muted-foreground mb-6">This rank card may have been removed or the link is invalid.</p>
				<Link href="/" className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition-transform">
					Go to Bhemu Calculator
				</Link>
			</div>
		);
	}

	const programLabel = formatProgramLabel(entry.programName, entry.branch);

	return (
		<div className="w-full min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative bg-transparent overflow-hidden">
			{/* Background effects */}
			<div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-hero-glow rounded-full pointer-events-none filter blur-3xl opacity-50" />

			{/* Rank Card */}
			<div className="glass-panel backdrop-blur-xl rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative overflow-hidden z-10 mb-6">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					<div className="w-11 h-11 rounded-xl bg-yellow-400/10 border border-yellow-400/25 flex items-center justify-center text-xl">
						🏆
					</div>
					<div>
						<p className="text-sm font-bold text-white">CGPA Leaderboard</p>
						<p className="text-xs text-muted-foreground">{programLabel}</p>
						<p className="text-xs text-muted-foreground">Batch {entry.batchYear}</p>
					</div>
				</div>

				{/* Rank */}
				<div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center mb-4">
					<p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">My Rank</p>
					<p className="text-6xl font-black text-primary leading-none mb-2">#{entry.rank}</p>
					<p className="text-xs text-muted-foreground">of {entry.totalStudents} students</p>
				</div>

				{/* CGPA */}
				<div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl mb-4">
					<span className="text-sm text-muted-foreground">CGPA</span>
					<span className="text-2xl font-bold text-white">{entry.cgpa.toFixed(2)}</span>
				</div>

				{/* Name */}
				<p className="text-center text-sm font-semibold text-white/80 mb-4">{entry.name}</p>

				{/* Branding */}
				<div className="border-t border-white/8 pt-3 text-center">
					<p className="text-xs text-muted-foreground/50">calc.bhemu.in · Bhemu Calculator</p>
				</div>
			</div>

			{/* CTA */}
			<div className="glass-panel backdrop-blur-xl rounded-2xl p-5 max-w-sm w-full text-center relative overflow-hidden z-10">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
				<p className="text-base font-bold text-white mb-1">See where you stand</p>
				<p className="text-xs text-muted-foreground mb-4 leading-relaxed">
					Sync your LPU UMS data and see your CGPA rank among your batchmates.
				</p>
				<Link
					href="/leaderboard"
					className="relative inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-primary text-white rounded-xl font-semibold text-sm justify-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow overflow-hidden group w-full"
				>
					<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
					<span className="relative">Check Your Rank</span>
				</Link>
			</div>
		</div>
	);
}
