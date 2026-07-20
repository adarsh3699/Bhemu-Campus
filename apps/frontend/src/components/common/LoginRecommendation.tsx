"use client";

import Link from "next/link";
import { Cloud, Share2, BarChart, Lock, Users, Smartphone, Sparkles, ShieldCheck, Puzzle, ArrowRight } from "lucide-react";

interface LoginRecommendationProps {
	feature?: string;
}

export default function LoginRecommendation({ feature = "Dashboard" }: LoginRecommendationProps) {
	return (
		<div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 md:p-6 relative bg-transparent overflow-hidden">
			{/* Grid Overlay */}
			<div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

			{/* Hero glow */}
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-hero-glow rounded-full pointer-events-none filter blur-3xl opacity-50" />

			{/* Main Card */}
			<div className="glass-panel backdrop-blur-xl rounded-3xl p-6 md:p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden z-10 mb-6">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

				{/* Header */}
				<div className="text-center mb-8">
					<h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-3 tracking-tight">
						Unlock Full {feature} Features
					</h2>
					<p className="text-sm md:text-base text-muted-foreground font-normal leading-relaxed max-w-md mx-auto">
						Sign in to sync across devices, get insights, and never lose your academic data.
					</p>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
					{[
						{ icon: Cloud, text: "Cloud sync", color: "text-blue-400" },
						{ icon: Share2, text: "Share profiles", color: "text-teal-400" },
						{ icon: BarChart, text: "Analytics", color: "text-indigo-400" },
						{ icon: Lock, text: "Auto backup", color: "text-amber-400" },
						{ icon: Users, text: "Multi-workspace", color: "text-purple-400" },
						{ icon: Smartphone, text: "Access anywhere", color: "text-pink-400" },
					].map((item, index) => {
						const IconComponent = item.icon;
						return (
							<div
								key={index}
								className="flex items-center gap-2.5 p-3 bg-white/5 rounded-xl border border-white/5 transition-all duration-200 hover:bg-white/8"
							>
								<IconComponent className={`w-4 h-4 shrink-0 ${item.color}`} />
								<span className="text-foreground/90 font-medium text-xs md:text-sm">{item.text}</span>
							</div>
						);
					})}
				</div>

				{/* Action Buttons */}
				<div className="flex gap-3 justify-center flex-wrap">
					<Link
						href="/login"
						className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-semibold text-sm tracking-wide uppercase justify-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow overflow-hidden group"
					>
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
						<Lock className="w-4 h-4" />
						<span className="relative">Sign In</span>
					</Link>
					<Link
						href="/register"
						className="relative inline-flex items-center gap-2 px-6 py-3 bg-white/5 text-foreground border border-white/10 hover:border-primary/30 rounded-xl font-semibold text-sm tracking-wide uppercase justify-center transition-all duration-300 hover:bg-white/10 hover:-translate-y-0.5 overflow-hidden group"
					>
						<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
						<Sparkles className="w-4 h-4 text-secondary" />
						<span className="relative">Create Free Account</span>
					</Link>
				</div>

				{/* Footer */}
				<div className="mt-6 pt-5 border-t border-white/5 text-center">
					<p className="flex justify-center items-center gap-2 text-muted-foreground/80 text-xs">
						<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Your data is fully encrypted and secure
					</p>
				</div>
			</div>

			{/* Extension Promo Card */}
			<div className="glass-panel backdrop-blur-xl rounded-2xl p-5 md:p-6 max-w-2xl w-full shadow-xl relative overflow-hidden z-10 border border-indigo-500/10">
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>

				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
					<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 shrink-0">
						<Puzzle className="w-5 h-5 text-indigo-400" />
					</div>

					<div className="flex-1 min-w-0">
						<h3 className="text-sm font-bold text-white mb-1">
							UMS Sync Extension
						</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Auto-import your grades, marks & attendance directly from UMS — no manual entry needed.
						</p>
					</div>

					<Link
						href="/about#extension"
						className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg text-indigo-400 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 shrink-0 group"
					>
						Learn more
						<ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</div>
		</div>
	);
}
