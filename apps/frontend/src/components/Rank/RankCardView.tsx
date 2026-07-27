import Link from "next/link";
import Image from "next/image";
import { Trophy, Star, Medal } from "lucide-react";
import { tierStyles } from "./lib/rankUtils";
import type { LeaderboardEntryPublic } from "@/lib/fetchLeaderboardEntry";

interface RankCardViewProps {
	entry: LeaderboardEntryPublic;
	programLabel: string;
	percentile: number;
	achievementLabel: string;
	tier: "gold" | "silver" | "bronze" | "default";
}

export default function RankCardView({
	entry,
	programLabel,
	percentile,
	achievementLabel,
	tier,
}: RankCardViewProps) {
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
							alt="bCampus"
							width={22}
							height={22}
							className="rounded-md"
						/>
						<span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
							bCampus
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
										<p className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.55)" }}>
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
									<p className="text-3xl font-black text-white leading-none">{entry.cgpa.toFixed(2)}</p>
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
								<Star className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.badgeText }} fill="currentColor" />
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
								campus.bhemu.in · bCampus
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
									background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
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
