import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Trophy, Star, Medal } from "lucide-react";
import { fetchLeaderboardEntry } from "@/lib/fetchLeaderboardEntry";
import { formatProgramLabel } from "@/lib/programUtils";
import { SITE_CONFIG } from "@/lib/seo";

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
	const ogTitle = `${entry.name} — Rank #${entry.rank}`;
	const ogImageUrl = `${SITE_CONFIG.url}/api/og?id=${encodeURIComponent(id)}&title=${encodeURIComponent(ogTitle)}&description=${encodeURIComponent(description)}`;

	return {
		title,
		description,
		metadataBase: new URL(SITE_CONFIG.url),
		openGraph: {
			title,
			description,
			url: `${SITE_CONFIG.url}/rank/${id}`,
			siteName: SITE_CONFIG.openGraph.siteName,
			images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
			type: "website",
		},
		twitter: {
			card: SITE_CONFIG.twitter.card,
			title,
			description,
			images: [ogImageUrl],
		},
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

function getRankTier(rank: number): "gold" | "silver" | "bronze" | "default" {
	if (rank === 1) return "gold";
	if (rank === 2) return "silver";
	if (rank === 3) return "bronze";
	return "default";
}

export default async function RankPage({ params }: Props) {
	const { id } = await params;
	const entry = await fetchLeaderboardEntry(id);

	if (!entry) {
		return (
			<>
				<style>{`
					@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
					.anim-in { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
					@media (prefers-reduced-motion: reduce) { .anim-in { animation: none !important; } }
				`}</style>
				<div
					className="w-full min-h-screen flex flex-col items-center justify-center p-6"
					style={{ background: "linear-gradient(160deg, #06070E 0%, #0B0E1A 60%, #06070E 100%)" }}
				>
					<div className="anim-in flex flex-col items-center text-center" style={{ animationDelay: "0ms" }}>
						<div
							className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
							style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
						>
							<Trophy className="w-7 h-7 text-muted-foreground" />
						</div>
						<p className="text-2xl font-bold text-white mb-2">Rank not found</p>
						<p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
							This rank card may have been removed or the link is invalid.
						</p>
						<Link
							href="/"
							className="px-6 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
							style={{
								background: "linear-gradient(135deg, #0398ac 0%, #004eeb 100%)",
								boxShadow: "0 4px 24px rgba(3,152,172,0.35)",
								minHeight: "44px",
								display: "flex",
								alignItems: "center",
							}}
						>
							Go to Bhemu Calculator
						</Link>
					</div>
				</div>
			</>
		);
	}

	const programLabel = formatProgramLabel(entry.programName, entry.branch);
	const percentile = getPercentile(entry.rank, entry.totalStudents);
	const achievementLabel = getAchievementLabel(entry.rank, entry.totalStudents);
	const tier = getRankTier(entry.rank);

	const tierStyles = {
		gold: {
			stripe: "linear-gradient(90deg, #D97706 0%, #FDE68A 40%, #F59E0B 60%, #D97706 100%)",
			rankGradient: "linear-gradient(180deg, #FDE68A 0%, #FBBF24 40%, #F59E0B 80%, #D97706 100%)",
			badgeBg: "rgba(245,158,11,0.1)",
			badgeBorder: "rgba(245,158,11,0.25)",
			badgeText: "#FCD34D",
			glowColor: "rgba(245,158,11,0.18)",
			iconBg: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)",
			iconBorder: "rgba(245,158,11,0.3)",
		},
		silver: {
			stripe: "linear-gradient(90deg, #64748B 0%, #CBD5E1 40%, #94A3B8 60%, #64748B 100%)",
			rankGradient: "linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 40%, #94A3B8 80%, #64748B 100%)",
			badgeBg: "rgba(148,163,184,0.1)",
			badgeBorder: "rgba(148,163,184,0.25)",
			badgeText: "#CBD5E1",
			glowColor: "rgba(148,163,184,0.15)",
			iconBg: "linear-gradient(135deg, rgba(148,163,184,0.2) 0%, rgba(100,116,139,0.1) 100%)",
			iconBorder: "rgba(148,163,184,0.3)",
		},
		bronze: {
			stripe: "linear-gradient(90deg, #92400E 0%, #FED7AA 40%, #F97316 60%, #92400E 100%)",
			rankGradient: "linear-gradient(180deg, #FED7AA 0%, #FB923C 40%, #F97316 80%, #C2410C 100%)",
			badgeBg: "rgba(249,115,22,0.1)",
			badgeBorder: "rgba(249,115,22,0.25)",
			badgeText: "#FDBA74",
			glowColor: "rgba(249,115,22,0.15)",
			iconBg: "linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(194,65,12,0.1) 100%)",
			iconBorder: "rgba(249,115,22,0.3)",
		},
		default: {
			stripe: "linear-gradient(90deg, #0398ac 0%, #22d3ee 40%, #0398ac 60%, #004eeb 100%)",
			rankGradient: "linear-gradient(180deg, #67E8F9 0%, #22D3EE 30%, #0398ac 70%, #004eeb 100%)",
			badgeBg: "rgba(3,152,172,0.1)",
			badgeBorder: "rgba(3,152,172,0.25)",
			badgeText: "#22D3EE",
			glowColor: "rgba(3,152,172,0.15)",
			iconBg: "linear-gradient(135deg, rgba(3,152,172,0.2) 0%, rgba(0,78,235,0.1) 100%)",
			iconBorder: "rgba(3,152,172,0.3)",
		},
	};
	const t = tierStyles[tier];

	return (
		<>
			<style>{`
				@keyframes fadeUp {
					from { opacity: 0; transform: translateY(28px); }
					to { opacity: 1; transform: translateY(0); }
				}
				@keyframes scaleIn {
					from { opacity: 0; transform: scale(0.88); }
					to { opacity: 1; transform: scale(1); }
				}
				@keyframes glowPulse {
					0%, 100% { opacity: 0.6; }
					50% { opacity: 1; }
				}
				@keyframes shimmer {
					0% { transform: translateX(-100%); }
					100% { transform: translateX(200%); }
				}
				.anim-fadein { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
				.anim-scalein { animation: scaleIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
				.anim-glow { animation: glowPulse 3s ease-in-out infinite; }
				.shimmer-once { overflow: hidden; position: relative; }
				.shimmer-once::after {
					content: '';
					position: absolute; inset: 0;
					background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%);
					animation: shimmer 1.2s 0.6s ease-out forwards;
				}
				@media (prefers-reduced-motion: reduce) {
					.anim-fadein, .anim-scalein { animation: none !important; }
					.anim-glow { animation: none !important; }
					.shimmer-once::after { animation: none !important; }
				}
			`}</style>

			<div
				className="w-full min-h-screen flex flex-col items-center justify-center p-4 py-8 relative overflow-hidden"
				style={{ background: "linear-gradient(160deg, #06070E 0%, #0B0E1A 60%, #06070E 100%)" }}
			>
				{/* Ambient background glows */}
				<div
					className="absolute pointer-events-none anim-glow"
					style={{
						top: "-5%",
						left: "50%",
						transform: "translateX(-50%)",
						width: "600px",
						height: "320px",
						background: `radial-gradient(ellipse, ${t.glowColor} 0%, transparent 70%)`,
						filter: "blur(48px)",
					}}
				/>
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "10%",
						right: "5%",
						width: "350px",
						height: "250px",
						background: "radial-gradient(ellipse, rgba(139,92,246,0.07) 0%, transparent 70%)",
						filter: "blur(60px)",
					}}
				/>

				{/* Grid pattern */}
				<div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

				<div className="relative z-10 w-full max-w-md flex flex-col items-center gap-3">
					{/* Top branding pill */}
					<Link
						href="/"
						className="anim-fadein flex items-center gap-2 px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 hover:scale-105"
						style={{
							animationDelay: "0ms",
							background: "rgba(255,255,255,0.04)",
							border: "1px solid rgba(255,255,255,0.1)",
							backdropFilter: "blur(8px)",
							minHeight: "44px",
						}}
					>
						<Image
							src="/newLogo512.png"
							alt="Bhemu Calculator"
							width={22}
							height={22}
							className="rounded-md"
						/>
						<span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
							Bhemu Calculator
						</span>
					</Link>

					{/* Main achievement card */}
					<div
						className="anim-scalein shimmer-once w-full rounded-2xl overflow-hidden"
						style={{
							animationDelay: "80ms",
							background: "linear-gradient(160deg, #111827 0%, #0F172A 100%)",
							border: "1px solid rgba(255,255,255,0.08)",
							boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${t.glowColor}`,
						}}
					>
						{/* Accent stripe */}
						<div style={{ height: "4px", background: t.stripe }} />

						<div className="p-6">
							{/* Card header */}
							<div className="flex items-start justify-between mb-6">
								<div className="flex items-center gap-3">
									<div
										className="flex items-center justify-center rounded-xl"
										style={{
											width: "44px",
											height: "44px",
											background: t.iconBg,
											border: `1px solid ${t.iconBorder}`,
											flexShrink: 0,
										}}
									>
										{tier === "gold" ? (
											<Medal className="w-5 h-5" style={{ color: "#FCD34D" }} />
										) : tier === "silver" ? (
											<Medal className="w-5 h-5" style={{ color: "#CBD5E1" }} />
										) : tier === "bronze" ? (
											<Medal className="w-5 h-5" style={{ color: "#FDBA74" }} />
										) : (
											<Trophy className="w-5 h-5" style={{ color: "#22D3EE" }} />
										)}
									</div>
									<div>
										<p className="text-xs font-bold text-white uppercase tracking-widest leading-none mb-1">
											CGPA Leaderboard
										</p>
										<p
											className="text-xs leading-tight"
											style={{ color: "rgba(255,255,255,0.55)" }}
										>
											{programLabel}
										</p>
										<p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
											Batch {entry.batchYear}
										</p>
									</div>
								</div>
							</div>

							{/* Rank hero section */}
							<div className="relative text-center mb-5">
								{/* Glow ring behind number */}
								<div
									className="anim-glow absolute pointer-events-none"
									style={{
										top: "50%",
										left: "50%",
										transform: "translate(-50%, -50%)",
										width: "200px",
										height: "200px",
										background: `radial-gradient(ellipse, ${t.glowColor} 0%, transparent 70%)`,
										filter: "blur(32px)",
										zIndex: 0,
									}}
								/>

								<p
									className="relative text-xs uppercase tracking-[0.2em] mb-2 z-10"
									style={{ color: "rgba(255,255,255,0.35)" }}
								>
									My Rank
								</p>
								<p
									className="relative font-black z-10 leading-none"
									style={{
										fontSize: "clamp(72px, 22vw, 100px)",
										letterSpacing: "-4px",
										background: t.rankGradient,
										WebkitBackgroundClip: "text",
										WebkitTextFillColor: "transparent",
										backgroundClip: "text",
										textShadow: "none",
									}}
								>
									#{entry.rank}
								</p>
								<p className="relative text-sm z-10 mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
									of {entry.totalStudents} students
								</p>
							</div>

							{/* Stats grid */}
							<div className="grid grid-cols-2 gap-3 mb-4">
								<div
									className="rounded-xl p-4 text-center"
									style={{
										background: "rgba(255,255,255,0.03)",
										border: "1px solid rgba(255,255,255,0.07)",
									}}
								>
									<p
										className="text-xs mb-1.5 uppercase tracking-widest"
										style={{ color: "rgba(255,255,255,0.35)" }}
									>
										CGPA
									</p>
									<p className="text-3xl font-black text-white leading-none">
										{entry.cgpa.toFixed(2)}
									</p>
								</div>
								<div
									className="rounded-xl p-4 text-center"
									style={{
										background: "rgba(255,255,255,0.03)",
										border: "1px solid rgba(255,255,255,0.07)",
									}}
								>
									<p
										className="text-xs mb-1.5 uppercase tracking-widest"
										style={{ color: "rgba(255,255,255,0.35)" }}
									>
										Percentile
									</p>
									<p
										className="text-3xl font-black leading-none"
										style={{
											background: t.rankGradient,
											WebkitBackgroundClip: "text",
											WebkitTextFillColor: "transparent",
											backgroundClip: "text",
										}}
									>
										{percentile}
									</p>
								</div>
							</div>

							{/* Achievement label */}
							<div
								className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl mb-5"
								style={{
									background: t.badgeBg,
									border: `1px solid ${t.badgeBorder}`,
								}}
							>
								<Star
									className="w-3.5 h-3.5 flex-shrink-0"
									style={{ color: t.badgeText }}
									fill="currentColor"
								/>
								<span className="text-sm font-semibold" style={{ color: t.badgeText }}>
									{achievementLabel}
								</span>
							</div>

							{/* Name */}
							<p className="text-center text-xl font-black text-white tracking-tight">{entry.name}</p>
						</div>

						{/* Card footer branding */}
						<div
							className="px-6 py-3 flex items-center justify-center gap-2"
							style={{
								borderTop: "1px solid rgba(255,255,255,0.05)",
								background: "rgba(0,0,0,0.25)",
							}}
						>
							<Image
								src="/newLogo512.png"
								alt=""
								width={13}
								height={13}
								className="rounded-sm"
								style={{ opacity: 0.4 }}
							/>
							<span className="text-xs" style={{ color: "rgba(255,255,255,0.28)" }}>
								calc.bhemu.in · Bhemu Calculator
							</span>
						</div>
					</div>

					{/* CTA section */}
					<div
						className="anim-fadein w-full rounded-2xl p-5"
						style={{
							animationDelay: "180ms",
							background: "rgba(255,255,255,0.025)",
							border: "1px solid rgba(255,255,255,0.07)",
						}}
					>
						<p className="text-center text-sm font-bold text-white mb-1">Where do you rank?</p>
						<p
							className="text-center text-xs mb-4 leading-relaxed"
							style={{ color: "rgba(255,255,255,0.4)" }}
						>
							Sync with your LPU UMS and see your CGPA rank among your batchmates.
						</p>
						<Link
							href="/leaderboard"
							className="relative flex items-center justify-center gap-2 w-full rounded-xl font-semibold text-sm text-white overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group"
							style={{
								minHeight: "48px",
								background: "linear-gradient(135deg, #0398ac 0%, #004eeb 100%)",
								boxShadow: "0 4px 24px rgba(3,152,172,0.3)",
							}}
						>
							<div
								className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500"
								style={{
									background:
										"linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
								}}
							/>
							<span className="relative">Check My Rank</span>
							<span className="relative text-lg font-light" aria-hidden="true">
								→
							</span>
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}
