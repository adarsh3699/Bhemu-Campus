"use client";

import Link from "next/link";
import { Puzzle, ArrowRight, BarChart3, Users, Trophy, Shield } from "lucide-react";

export default function UMSSyncPrompt() {
	return (
		<div className="w-full min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 md:p-6 relative bg-transparent overflow-hidden">
			<div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
			<div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-100 bg-hero-glow rounded-full pointer-events-none filter blur-3xl opacity-50" />

			<div className="glass-panel backdrop-blur-xl rounded-3xl p-6 md:p-8  max-w-2xl w-full shadow-2xl relative overflow-hidden z-10">
				<div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent"></div>

				<div className="text-center mb-8">
					<div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mx-auto mb-4">
						<Trophy className="w-8 h-8 text-indigo-400" />
					</div>
					<h2 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent mb-3 tracking-tight">
						See Where You Stand
					</h2>
					<p className="text-sm md:text-base text-muted-foreground font-normal leading-relaxed max-w-md mx-auto">
						Sync your UMS data to see your CGPA rank among your batchmates. Connect with the Bhemu
						Calculator - UMS Sync extension to get started.
					</p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
					{[
						{ icon: BarChart3, text: "Your CGPA rank", color: "text-blue-400" },
						{ icon: Users, text: "Among batchmates", color: "text-teal-400" },
						{ icon: Trophy, text: "Top 10 toppers", color: "text-yellow-400" },
					].map((item, index) => {
						const IconComponent = item.icon;
						return (
							<div
								key={index}
								className="flex items-center gap-2.5 p-3 bg-white/5 rounded-xl border border-white/5"
							>
								<IconComponent className={`w-4 h-4 shrink-0 ${item.color}`} />
								<span className="text-foreground/90 font-medium text-xs md:text-sm">{item.text}</span>
							</div>
						);
					})}
				</div>

				<div className="flex justify-center mb-6">
					<Link
						href="https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp"
						target="_blank"
						rel="noopener noreferrer"
						className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-semibold text-sm tracking-wide uppercase justify-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow overflow-hidden group"
					>
						<div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500"></div>
						<Puzzle className="w-4 h-4" />
						<span className="relative">Connect UMS Extension</span>
						<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>

				<div className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/6">
					<Shield className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
					<p className="text-xs text-muted-foreground/80 leading-relaxed">
						Only your profile name and CGPA are shown publicly. You can change your display name anytime.
						Opt out from Settings whenever you want.
					</p>
				</div>
			</div>
		</div>
	);
}
