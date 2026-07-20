"use client";

import React from "react";
import PageHeader from "@/components/common/PageHeader";
import Image from "next/image";
import {
	Mail,
	Globe,
	ArrowRight,
	Zap,
	Atom,
	Code,
	Flame,
	Database,
	Coffee,
	Info,
	Calculator,
	BarChart3,
	Users,
	Download,
	RefreshCw,
	ClipboardList,
	Target,
	Puzzle,
} from "lucide-react";
import { LinkedInIcon, GitHubIcon, YouTubeIcon, XIcon, TelegramIcon } from "./icons";

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
	{ icon: <Coffee className="w-5 h-5 text-orange-400" />, label: "Java" },
];

export default function AboutView() {
	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			<PageHeader
				icon={Info}
				title="About"
				description="Bhemu Calculator — your complete academic companion"
			/>

			{/* ═══════ About the App ═══════ */}
			<section className="mb-12">
				<div className="flex items-center gap-4 mb-6">
					<h3 className="text-lg font-bold text-white whitespace-nowrap">Bhemu Calculator</h3>
					<div className="h-px flex-1 bg-white/5" />
				</div>

				<p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-3xl">
					An all-in-one academic toolkit for LPU students — track GPA, analyze marks, monitor attendance, and
					plan reappear strategies. Cloud-synced, shareable, and always up to date.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
					{[
						{
							icon: Calculator,
							text: "GPA & CGPA Calculator",
							desc: "Semester-wise grade tracking with auto-computed cumulative GPA",
							color: "text-teal-400",
						},
						{
							icon: BarChart3,
							text: "Marks Analysis",
							desc: "Detailed CA, Mid, End & attendance breakdowns with grade predictions",
							color: "text-indigo-400",
						},
						{
							icon: ClipboardList,
							text: "Attendance Tracker",
							desc: "Know exactly how many classes you can miss or need to attend",
							color: "text-amber-400",
						},
						{
							icon: Target,
							text: "Goal Planner",
							desc: "Set a target CGPA and see what grades you need each semester",
							color: "text-purple-400",
						},
						{
							icon: RefreshCw,
							text: "Reappear Calculator",
							desc: "Simulate reappear outcomes and plan your improvement strategy",
							color: "text-pink-400",
						},
						{
							icon: Users,
							text: "Profile Sharing",
							desc: "Share your academic profile with classmates for collaboration",
							color: "text-emerald-400",
						},
					].map(({ icon: Icon, text, desc, color }) => (
						<div
							key={text}
							className="bg-surface-dark border border-border rounded-xl p-4 group hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
							style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)" }}
						>
							<div className="flex items-center gap-3 mb-2">
								<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
									<Icon className={`w-4 h-4 ${color}`} />
								</div>
								<span className="text-sm font-semibold text-white">{text}</span>
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed pl-11">{desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ═══════ Extension Section ═══════ */}
			<section id="extension" className="mb-12 scroll-mt-24">
				<div className="flex items-center gap-4 mb-6">
					<h3 className="text-lg font-bold text-white whitespace-nowrap">UMS Sync Extension</h3>
					<div className="h-px flex-1 bg-white/5" />
				</div>

				<p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-3xl">
					Auto-import your grades, marks & attendance directly from the LPU UMS portal — no manual entry
					needed. One click and your data is synced.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
					{[
						{
							icon: Download,
							text: "One-Click Sync",
							desc: "Fetches all your grades & marks from UMS instantly",
							color: "text-blue-400",
						},
						{
							icon: RefreshCw,
							text: "Always Fresh",
							desc: "Sync anytime to get latest marks as results are declared",
							color: "text-cyan-400",
						},
						{
							icon: Puzzle,
							text: "Lightweight",
							desc: "Minimal permissions, runs only when you click — no background drain",
							color: "text-indigo-400",
						},
					].map(({ icon: Icon, text, desc, color }) => (
						<div
							key={text}
							className="bg-surface-dark border border-border rounded-xl p-4 group hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300"
							style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)" }}
						>
							<div className="flex items-center gap-3 mb-2">
								<div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
									<Icon className={`w-4 h-4 ${color}`} />
								</div>
								<span className="text-sm font-semibold text-white">{text}</span>
							</div>
							<p className="text-xs text-muted-foreground leading-relaxed pl-11">{desc}</p>
						</div>
					))}
				</div>

				{/* How it works */}
				<div
					className="bg-surface-dark border border-border rounded-xl p-5 mb-5"
					style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)" }}
				>
					<h5 className="text-xs font-bold text-white uppercase tracking-wider mb-4">How it works</h5>
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0">
						{[
							{ step: "1", text: "Install from Chrome Web Store" },
							{ step: "2", text: "Sign in with your Bhemu account" },
							{ step: "3", text: "Click 'Sync Everything' — done!" },
						].map(({ step, text }, i) => (
							<React.Fragment key={step}>
								<div className="flex items-center gap-3">
									<span className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
										{step}
									</span>
									<span className="text-sm text-muted-foreground">{text}</span>
								</div>
								{i < 2 && (
									<ArrowRight className="hidden sm:block w-4 h-4 text-white/15 mx-4 shrink-0" />
								)}
							</React.Fragment>
						))}
					</div>
				</div>

				{/* Install Button */}
				<a
					href="https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp"
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-400 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 group"
				>
					<Globe className="w-4 h-4" />
					Install from Chrome Web Store
					<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
				</a>
			</section>

			{/* ═══════ About Developer ═══════ */}
			<section className="mb-10">
				<div className="flex items-center gap-4 mb-6">
					<h3 className="text-lg font-bold text-white whitespace-nowrap">About Developer</h3>
					<div className="h-px flex-1 bg-white/5" />
				</div>
			</section>

			{/* Hero Section */}
			<section className="mb-10">
				<div className="flex flex-col md:flex-row items-center gap-10">
					{/* Avatar */}
					<div className="relative group shrink-0">
						<div className="absolute -inset-1 bg-gradient-to-tr from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-700" />
						<div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/10 bg-surface-elevated">
							<Image src="/myPhoto.png" alt="Adarsh Suman" fill className="object-cover" unoptimized />
						</div>
					</div>

					{/* Info */}
					<div className="flex-1 space-y-4 text-center md:text-left">
						<div>
							<span className="text-primary font-medium tracking-widest text-xs uppercase">
								The Architect
							</span>
							<h2 className="text-3xl md:text-4xl font-bold text-white mt-1">Adarsh Suman</h2>
						</div>
						<p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
							Full-Stack Developer currently pursuing B.Tech in Computer Science at Lovely Professional
							University. Passionate about creating innovative solutions and building amazing user
							experiences. I specialize in modern web technologies including React, Next.js, Node.js, and
							Firebase.
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
						<span className={`text-4xl font-bold mb-1 ${highlight ? "text-primary" : "text-white"}`}>
							{value}
						</span>
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
								onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(3, 152, 172, 0.4)")}
								onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(38, 38, 38, 0.5)")}
							>
								<div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
									{icon}
								</div>
								<div className="flex-1 min-w-0">
									<span className="text-xs text-muted-foreground uppercase tracking-wider font-bold block">
										{label}
									</span>
									<span className="text-sm text-white/80 group-hover:text-primary transition-colors truncate block">
										{value}
									</span>
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
							{
								href: "https://www.linkedin.com/in/adarsh3699/",
								icon: <LinkedInIcon />,
								label: "LinkedIn",
								iconBg: "bg-[#0077b5]/10",
								iconColor: "text-[#0077b5]",
							},
							{
								href: "https://github.com/adarsh3699",
								icon: <GitHubIcon />,
								label: "GitHub",
								iconBg: "bg-white/10",
								iconColor: "text-white",
							},
							{
								href: "https://www.youtube.com/@CodingWithBhemu",
								icon: <YouTubeIcon />,
								label: "YouTube",
								iconBg: "bg-[#FF0000]/10",
								iconColor: "text-[#FF0000]",
							},
							{
								href: "https://x.com/adarsh3699",
								icon: <XIcon />,
								label: "X (Twitter)",
								iconBg: "bg-white/10",
								iconColor: "text-white",
							},
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
								onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(3, 152, 172, 0.3)")}
								onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(38, 38, 38, 0.5)")}
							>
								<div
									className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center ${iconColor} shrink-0`}
								>
									{icon}
								</div>
								<span className="text-sm text-muted-foreground group-hover:text-white transition-colors font-medium">
									{label}
								</span>
							</a>
						))}
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="mt-16 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-3">
				<p>© {new Date().getFullYear()} Bhemu Calculator. Designed with precision.</p>
				<div className="flex gap-6">
					<a
						href="https://calc.bhemu.in/privacy-policy.html"
						target="_blank"
						rel="noreferrer"
						className="hover:text-primary transition-colors"
					>
						Privacy Policy
					</a>
					<a
						href="https://www.adarshsuman.in"
						target="_blank"
						rel="noreferrer"
						className="hover:text-primary transition-colors"
					>
						Portfolio
					</a>
					<a
						href="https://www.linkedin.com/in/adarsh3699/"
						target="_blank"
						rel="noreferrer"
						className="hover:text-primary transition-colors"
					>
						LinkedIn
					</a>
					<a
						href="https://github.com/adarsh3699"
						target="_blank"
						rel="noreferrer"
						className="hover:text-primary transition-colors"
					>
						GitHub
					</a>
				</div>
			</footer>
		</div>
	);
}
