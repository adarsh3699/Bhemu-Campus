"use client";

import Link from "next/link";
import { Check, Cloud, Share2, BarChart, Lock, Users, Smartphone, Sparkles, ShieldCheck } from "lucide-react";

interface LoginRecommendationProps {
	feature?: string;
}

export default function LoginRecommendation({ feature = "GPA Calculator" }: LoginRecommendationProps) {
	return (
		<div className="w-full min-h-screen flex items-center justify-center p-4 md:p-6 relative bg-transparent overflow-hidden">
			{/* Grid Overlay */}
			<div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

			{/* Hero glow behind the card */}
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-hero-glow rounded-full pointer-events-none filter blur-3xl opacity-60" />

			<div className="glass-panel backdrop-blur-xl rounded-3xl p-6 md:p-10 max-w-2xl w-full shadow-2xl relative text-center overflow-hidden z-10">
				{/* Top gradient line */}
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent z-10"></div>

				{/* Icon */}
				<div className="w-20 h-20 mx-auto mb-8 bg-gradient-primary rounded-full flex items-center justify-center animate-pulse duration-[3000ms] shadow-glow">
					<Check className="w-10 h-10 text-white" />
				</div>

				{/* Content */}
				<div>
					<h2 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4 tracking-tight">
						Unlock Full {feature} Features
					</h2>
					<p className="text-base md:text-lg text-muted-foreground mb-8 md:mb-10 font-normal leading-relaxed">
						Get access to advanced features, sync dynamically across all your devices, and never lose your academic calculations!
					</p>

					{/* Features Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
						{[
							{ icon: Cloud, text: "Cloud sync across all devices", color: "text-blue-400" },
							{ icon: Share2, text: "Share profiles with classmates", color: "text-teal-400" },
							{ icon: BarChart, text: "Advanced analytics & insights", color: "text-indigo-400" },
							{ icon: Lock, text: "Secure automatic backup", color: "text-amber-400" },
							{ icon: Users, text: "Multiple workspace management", color: "text-purple-400" },
							{ icon: Smartphone, text: "Access from anywhere", color: "text-pink-400" },
						].map((item, index) => {
							const IconComponent = item.icon;
							return (
								<div
									key={index}
									className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
								>
									<IconComponent className={`w-5 h-5 ${item.color}`} />
									<span className="text-foreground/90 font-medium text-sm">
										{item.text}
									</span>
								</div>
							);
						})}
					</div>

					{/* Action Buttons */}
					<div className="flex gap-4 md:gap-5 justify-center mb-8 flex-wrap">
						<Link
							href="/login"
							className="relative inline-flex items-center gap-2 px-6 py-3.5 md:px-8 md:py-4 bg-gradient-primary text-white rounded-2xl font-semibold text-base md:text-lg tracking-wide uppercase min-w-[160px] md:min-w-[180px] justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-glow overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
							<Lock className="w-5 h-5" />
							<span className="relative">Login to Continue</span>
						</Link>
						<Link
							href="/register"
							className="relative inline-flex items-center gap-2 px-6 py-3.5 md:px-8 md:py-4 bg-white/5 text-foreground border border-white/10 hover:border-primary/30 rounded-2xl font-semibold text-base md:text-lg tracking-wide uppercase min-w-[160px] md:min-w-[180px] justify-center transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-glow overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
							<Sparkles className="w-5 h-5 text-secondary" />
							<span className="relative">Create Free Account</span>
						</Link>
					</div>

					{/* Note Section */}
					<div className="mt-8 pt-8 border-t border-white/5">
						<p className="text-muted-foreground mb-3 text-sm">
							Already have an account?{" "}
							<Link
								href="/login"
								className="text-secondary font-semibold hover:text-primary transition-colors duration-200"
							>
								Sign in here
							</Link>
						</p>
						<p className="flex justify-center items-center gap-2 text-muted-foreground/80 text-sm">
							<ShieldCheck className="w-4 h-4 text-emerald-400" /> Your data is fully encrypted and secure with us
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
