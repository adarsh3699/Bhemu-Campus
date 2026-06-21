"use client";

import React from "react";
import Image from "next/image";
import { Mail, Globe, ArrowRight, Zap, Atom, Code, Flame, Database, Shield, Info } from "lucide-react";

// Social Icons
const LinkedInIcon = () => (
	<svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
		<path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
	</svg>
);

const GitHubIcon = () => (
	<svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
		<path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
	</svg>
);

const YouTubeIcon = () => (
	<svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
		<path d="M23.498 6.163c-.272-1.022-1.074-1.825-2.097-2.097C19.56 3.5 12 3.5 12 3.5s-7.56 0-9.402.566c-1.022.272-1.825 1.074-2.097 2.097C0 8.002 0 12 0 12s0 3.998.566 5.837c.272 1.022 1.074 1.825 2.097 2.097C4.44 20.5 12 20.5 12 20.5s7.56 0 9.402-.566c1.022-.272 1.825-1.074 2.097-2.097C24 15.998 24 12 24 12s0-3.998-.566-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
	</svg>
);

const InstagramIcon = () => (
	<svg className="h-5 w-5 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
		<rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
		<path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
		<line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
	</svg>
);

const TelegramIcon = () => (
	<svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
		<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
	</svg>
);

const STATS = [
	{ value: "10+", label: "Projects Built", highlight: false },
	{ value: "3+", label: "Years Coding", highlight: true },
	{ value: "15+", label: "Technologies", highlight: false },
];

const TECH_SKILLS = [
	{ icon: <Atom className="w-5 h-5 text-cyan-400 animate-[spin_8s_linear_infinite]" />, label: "React / Next.js" },
	{ icon: <Zap className="w-5 h-5 text-amber-400" />, label: "TypeScript" },
	{ icon: <Code className="w-5 h-5 text-emerald-400" />, label: "Node.js" },
	{ icon: <Flame className="w-5 h-5 text-orange-500" />, label: "Firebase" },
	{ icon: <Database className="w-5 h-5 text-indigo-400" />, label: "MongoDB / PostgreSQL" },
	{ icon: <Shield className="w-5 h-5 text-teal-400" />, label: "C / C++" },
];

export default function AboutView() {
	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			{/* Page Header */}
			<div className="flex items-center gap-4 mb-8">
				<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
					<Info className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">About Developer</h1>
					<p className="text-sm text-muted-foreground mt-1">The architect behind Bhemu Calculator</p>
				</div>
			</div>

			{/* Hero Section */}
			<section className="mb-10">
				<div className="flex flex-col md:flex-row items-center gap-10">
					{/* Avatar */}
					<div className="relative group shrink-0">
						<div className="absolute -inset-1 bg-gradient-to-tr from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-700" />
						<div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/10 bg-surface-elevated">
							<Image
								src="/myPhoto.png"
								alt="Adarsh Suman"
								fill
								className="object-cover"
								unoptimized
							/>
						</div>
					</div>

					{/* Info */}
					<div className="flex-1 space-y-4 text-center md:text-left">
						<div>
							<span className="text-primary font-medium tracking-widest text-xs uppercase">The Architect</span>
							<h2 className="text-3xl md:text-4xl font-bold text-white mt-1">Adarsh Suman</h2>
						</div>
						<p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
							Full-Stack Developer currently pursuing B.Tech in Computer Science at Lovely Professional University.
							Passionate about creating innovative solutions and building amazing user experiences.
							I specialize in modern web technologies including React, Next.js, Node.js, and Firebase.
						</p>
						<div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
							{["Full-Stack Developer", "B.Tech CSE @ LPU", "Open Source"].map((tag) => (
								<span
									key={tag}
									className="px-3 py-1 rounded-full bg-surface-elevated border border-white/8 text-primary text-xs font-medium"
								>
									{tag}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Stats Row */}
			<section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
				{STATS.map(({ value, label, highlight }) => (
					<div
						key={label}
						className="bg-surface-dark border border-border rounded-xl p-6 flex flex-col items-center text-center hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<span className={`text-4xl font-bold mb-1 ${highlight ? "text-primary" : "text-white"}`}>{value}</span>
						<span className="text-sm text-muted-foreground">{label}</span>
					</div>
				))}
			</section>

			{/* Tech Skills */}
			<section className="mb-10">
				<div className="flex items-center gap-4 mb-6">
					<h3 className="text-lg font-bold text-white whitespace-nowrap">Technical Proficiency</h3>
					<div className="h-px flex-1 bg-white/5" />
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
					{TECH_SKILLS.map(({ icon, label }) => (
						<div
							key={label}
							className="bg-surface-dark border border-border rounded-xl p-4 flex flex-col items-center gap-3 group hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
							style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)" }}
						>
							<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
								{icon}
							</div>
							<span className="text-xs text-muted-foreground font-medium text-center">{label}</span>
						</div>
					))}
				</div>
			</section>

			{/* Contact & Follow Grid */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Contact */}
				<div>
					<div className="flex items-center gap-4 mb-5">
						<h3 className="text-lg font-bold text-white whitespace-nowrap">Contact Me</h3>
						<div className="h-px flex-1 bg-white/5" />
					</div>
					<div className="space-y-3">
						{[
							{
								href: "mailto:adarsh3699@gmail.com",
								icon: <Mail className="w-5 h-5" />,
								label: "Email Address",
								value: "adarsh3699@gmail.com",
							},
							{
								href: "https://www.adarshsuman.in",
								icon: <Globe className="w-5 h-5" />,
								label: "Personal Portfolio",
								value: "adarshsuman.in",
								external: true,
							},
							{
								href: "https://t.me/adarsh3699",
								icon: <TelegramIcon />,
								label: "Telegram",
								value: "@adarsh3699",
								external: true,
							},
						].map(({ href, icon, label, value, external }) => (
							<a
								key={href}
								href={href}
								target={external ? "_blank" : undefined}
								rel={external ? "noreferrer" : undefined}
								className="flex items-center gap-4 p-4 rounded-xl group hover:-translate-y-0.5 transition-all duration-300"
								style={{
									background: "rgba(18, 18, 18, 0.8)",
									border: "1px solid rgba(38, 38, 38, 0.5)",
								}}
								onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(3, 152, 172, 0.4)")}
								onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(38, 38, 38, 0.5)")}
							>
								<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
									{icon}
								</div>
								<div className="flex-1 min-w-0">
									<span className="text-xs text-muted-foreground uppercase tracking-wider font-bold block">{label}</span>
									<span className="text-sm text-white/80 group-hover:text-primary transition-colors truncate block">{value}</span>
								</div>
								<ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
							</a>
						))}
					</div>
				</div>

				{/* Follow Me */}
				<div>
					<div className="flex items-center gap-4 mb-5">
						<h3 className="text-lg font-bold text-white whitespace-nowrap">Follow Me</h3>
						<div className="h-px flex-1 bg-white/5" />
					</div>
					<div className="grid grid-cols-2 gap-3">
						{[
							{ href: "https://www.linkedin.com/in/adarsh3699/", icon: <LinkedInIcon />, label: "LinkedIn", iconBg: "bg-[#0077b5]/10", iconColor: "text-[#0077b5]" },
							{ href: "https://github.com/adarsh3699", icon: <GitHubIcon />, label: "GitHub", iconBg: "bg-white/10", iconColor: "text-white" },
							{ href: "https://www.youtube.com/@CodingWithBhemu", icon: <YouTubeIcon />, label: "YouTube", iconBg: "bg-[#FF0000]/10", iconColor: "text-[#FF0000]" },
							{ href: "https://www.instagram.com/_adarsh.s/", icon: <InstagramIcon />, label: "Instagram", iconBg: "bg-gradient-to-br from-purple-500/20 to-pink-500/20", iconColor: "text-pink-400" },
						].map(({ href, icon, label, iconBg, iconColor }) => (
							<a
								key={href}
								href={href}
								target="_blank"
								rel="noreferrer"
								className="flex items-center gap-3 p-4 rounded-xl group hover:-translate-y-0.5 transition-all duration-300"
								style={{
									background: "rgba(18, 18, 18, 0.8)",
									border: "1px solid rgba(38, 38, 38, 0.5)",
								}}
								onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(3, 152, 172, 0.3)")}
								onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(38, 38, 38, 0.5)")}
							>
								<div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}>
									{icon}
								</div>
								<span className="text-sm text-muted-foreground group-hover:text-white transition-colors font-medium">{label}</span>
							</a>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-3">
				<p>© {new Date().getFullYear()} Bhemu Calculator. Designed with precision.</p>
				<div className="flex gap-6">
					<a href="https://www.adarshsuman.in" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Portfolio</a>
					<a href="https://www.linkedin.com/in/adarsh3699/" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
					<a href="https://github.com/adarsh3699" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">GitHub</a>
				</div>
			</footer>
		</div>
	);
}
