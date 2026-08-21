import Image from "next/image";
import Link from "next/link";
import {
	ArrowRight,
	BarChart2,
	BookOpen,
	CalendarCheck2,
	Check,
	Download,
	Globe2,
	GraduationCap,
	RefreshCw,
	ShieldCheck,
	Smartphone,
	Sparkles,
	Target,
} from "lucide-react";
import { generatePageMetadata } from "@/lib/seo";
import { MOBILE_RELEASE } from "@/lib/mobileRelease";

export const metadata = generatePageMetadata({
	title: "Your Academic Progress, In One Place",
	description:
		"bCampus helps students track GPA, understand marks, monitor attendance, plan goals, and sync LPU UMS data across web and mobile.",
	path: "/",
	keywords: ["student productivity app", "LPU academic tracker", "mobile GPA tracker"],
});

const features = [
	{
		icon: BarChart2,
		title: "Know your numbers",
		copy: "See semester GPA, CGPA, marks breakdowns, and trends without spreadsheet juggling.",
		accent: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
	},
	{
		icon: CalendarCheck2,
		title: "Stay ahead of attendance",
		copy: "Know exactly how many classes you can miss or need to attend to reach your target.",
		accent: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
	},
	{
		icon: Target,
		title: "Plan the next milestone",
		copy: "Set a CGPA goal and turn it into a clear, achievable plan for every semester ahead.",
		accent: "text-amber-300 bg-amber-400/10 border-amber-400/20",
	},
	{
		icon: RefreshCw,
		title: "Sync once, stay current",
		copy: "Bring grades, marks, and attendance from UMS into your workspace with one quick sync.",
		accent: "text-violet-300 bg-violet-400/10 border-violet-400/20",
	},
];

const workflow = [
	"Create a workspace for your course or semester",
	"Add your grades manually or sync from UMS",
	"Use the insights to plan your next move",
];

export default function RootPage() {
	return (
		<div className="min-h-dvh bg-[#080d0f] text-white selection:bg-primary/30">
			<a
				href="#main-content"
				className="sr-only z-[100] rounded-lg bg-white px-4 py-3 text-sm font-semibold text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
			>
				Skip to content
			</a>

			<header
				className="sticky top-0 z-20 bg-[#080d0f]/80 backdrop-blur-2xl"
				style={{
					borderBottom: "1px solid rgba(255,255,255,0.06)",
					boxShadow: "0 1px 0 0 rgba(3,152,172,0.08), 0 4px 24px 0 rgba(0,0,0,0.4)",
				}}
			>
				<div className="mx-auto flex min-h-[68px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
					{/* Brand */}
					<a
						href="#"
						className="group flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					>
						<Image
							src="/text_only.png"
							alt="bCampus"
							width={300}
							height={100}
							className="h-auto w-[118px]"
							priority
						/>
					</a>

					{/* Nav links */}
					<nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
						{[
							{ href: "#features", label: "Features" },
							{ href: "#how-it-works", label: "How it works" },
							{ href: "#mobile", label: "Mobile app" },
						].map(({ href, label }) => (
							<a
								key={href}
								href={href}
								className="group relative inline-flex min-h-10 items-center rounded-lg px-3.5 py-2 text-sm font-medium text-white/55 transition-all duration-200 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							>
								{label}
								<span
									className="absolute bottom-1.5 left-1/2 h-px w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-4/5"
									aria-hidden="true"
								/>
							</a>
						))}
					</nav>

					{/* Actions */}
					<div className="flex items-center gap-2 sm:gap-2.5">
						<Link
							href="/login"
							className="hidden min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-white/60 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex"
						>
							Sign in
						</Link>
						<Link
							href="/dashboard"
							className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#0277ff] px-4 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-px hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d0f]"
							style={{
								boxShadow:
									"0 0 20px rgba(3,152,172,0.35), 0 4px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
							}}
						>
							Open bCampus <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
						</Link>
					</div>
				</div>
			</header>

			<main id="main-content">
				<section className="relative isolate overflow-hidden" aria-labelledby="hero-heading">
					<div
						className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute left-1/2 top-[-18rem] h-[38rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
						aria-hidden="true"
					/>
					<div
						className="pointer-events-none absolute right-[-10rem] top-48 h-72 w-72 rounded-full bg-accent/10 blur-[100px]"
						aria-hidden="true"
					/>

					<div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.94fr_1.06fr] lg:gap-12 lg:px-10 lg:pb-28 lg:pt-28">
						<div className="max-w-2xl">
							<div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-3.5 py-2 text-xs font-semibold tracking-wide text-cyan-100/90">
								<Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-secondary" />
								Built for students who want clarity
							</div>
							<h1
								id="hero-heading"
								className="max-w-xl text-pretty text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl lg:text-[4.65rem]"
							>
								Make your academic progress feel{" "}
								<span className="text-gradient-brand">effortless.</span>
							</h1>
							<p className="mt-7 max-w-xl text-pretty text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
								bCampus brings your GPA, marks, attendance, goals, and UMS sync into one calm, focused
								workspace — on the web and in your pocket.
							</p>

							<div className="mt-9 flex flex-col gap-3 sm:flex-row">
								<Link
									href="/register"
									className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(3,152,172,0.22)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_16px_38px_rgba(3,152,172,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d0f]"
								>
									Start for free <ArrowRight aria-hidden="true" className="h-4 w-4" />
								</Link>
								<a
									href={MOBILE_RELEASE.apkUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 text-sm font-bold text-white/90 transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d0f]"
								>
									<Smartphone aria-hidden="true" className="h-4 w-4 text-secondary" />
									Download Android app{" "}
									<Download aria-hidden="true" className="h-3.5 w-3.5 text-white/45" />
								</a>
							</div>

							<div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-white/45">
								<span className="inline-flex items-center gap-2">
									<Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Free to start
								</span>
								<span className="inline-flex items-center gap-2">
									<Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Sync across
									devices
								</span>
								<span className="inline-flex items-center gap-2">
									<Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> Made for LPU
									students
								</span>
							</div>
						</div>

						<div className="relative mx-auto w-full max-w-[560px] lg:justify-self-end">
							<div
								className="absolute -inset-5 rounded-[2.5rem] bg-primary/10 blur-3xl"
								aria-hidden="true"
							/>
							<div
								role="img"
								aria-label="Preview of the bCampus academic dashboard"
								className="relative overflow-hidden rounded-[1.65rem] border border-white/15 bg-[#11181a]/95 p-2 shadow-2xl shadow-black/50"
							>
								<div className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#0c1214]">
									<div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
										<span className="h-2 w-2 rounded-full bg-red-400/80" />
										<span className="h-2 w-2 rounded-full bg-amber-300/80" />
										<span className="h-2 w-2 rounded-full bg-emerald-400/80" />
										<div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-white/[0.05] px-3 text-[10px] text-white/35">
											campus.bhemu.in/dashboard
										</div>
									</div>
									<div className="grid gap-4 p-4 sm:grid-cols-[0.7fr_1fr] sm:p-5">
										<div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
											<div className="flex items-start justify-between">
												<div>
													<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
														Current CGPA
													</p>
													<p className="mt-3 text-4xl font-black tracking-tight text-white">
														8.42
													</p>
												</div>
												<div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300">
													<BarChart2 aria-hidden="true" className="h-4 w-4" />
												</div>
											</div>
											<div className="mt-7 flex items-end gap-1.5" aria-hidden="true">
												{[38, 52, 46, 62, 72, 86].map((height, index) => (
													<span
														key={index}
														className={`w-full rounded-t-sm ${index === 5 ? "bg-gradient-to-t from-primary to-secondary" : "bg-white/15"}`}
														style={{ height: `${height}px` }}
													/>
												))}
											</div>
											<div className="mt-2 flex justify-between text-[9px] text-white/35">
												<span>S1</span>
												<span>S2</span>
												<span>S3</span>
												<span>S4</span>
												<span>S5</span>
												<span>S6</span>
											</div>
										</div>
										<div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
											<div className="flex items-center justify-between">
												<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
													This semester
												</p>
												<span className="text-[10px] font-semibold text-emerald-300">
													On track
												</span>
											</div>
											<div className="mt-5 space-y-4">
												{[
													["Operating Systems", "A", "92%"],
													["Database Systems", "A-", "86%"],
													["Computer Networks", "B+", "78%"],
												].map(([subject, grade, score]) => (
													<div key={subject} className="flex items-center gap-3">
														<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-cyan-200">
															{grade}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex justify-between gap-2 text-[10px]">
																<span className="truncate text-white/80">
																	{subject}
																</span>
																<span className="text-white/40">{score}</span>
															</div>
															<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
																<div
																	className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
																	style={{ width: score }}
																/>
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									</div>
									<div className="grid gap-3 px-4 pb-4 sm:grid-cols-3 sm:px-5 sm:pb-5">
										{[
											["Attendance", "86%", "text-emerald-300"],
											["Credits", "118", "text-cyan-300"],
											["Goal", "9.0", "text-amber-300"],
										].map(([label, value, color]) => (
											<div
												key={label}
												className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-3"
											>
												<p className="text-[9px] uppercase tracking-wider text-white/35">
													{label}
												</p>
												<p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
											</div>
										))}
									</div>
								</div>
							</div>
							<div className="absolute -bottom-4 -left-4 hidden items-center gap-3 rounded-xl border border-white/10 bg-[#121b1d]/95 px-4 py-3 shadow-xl sm:flex">
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
									<ShieldCheck aria-hidden="true" className="h-4 w-4" />
								</div>
								<div>
									<p className="text-xs font-bold text-white">Everything in sync</p>
									<p className="mt-0.5 text-[10px] text-white/45">Updated from UMS just now</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="border-y border-white/[0.07] bg-white/[0.02]" aria-label="bCampus benefits">
					<div className="mx-auto grid max-w-6xl gap-6 px-5 py-7 sm:grid-cols-3 sm:px-8 lg:px-10">
						{[
							[Globe2, "Web + mobile", "Your workspace follows you"],
							[BookOpen, "One academic home", "Everything important, together"],
							[GraduationCap, "Built for students", "Less admin, more progress"],
						].map(([Icon, title, copy]) => (
							<div key={title as string} className="flex items-center gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-secondary">
									<Icon aria-hidden="true" className="h-4 w-4" />
								</div>
								<div>
									<p className="text-sm font-bold text-white/85">{title as string}</p>
									<p className="mt-0.5 text-xs text-white/45">{copy as string}</p>
								</div>
							</div>
						))}
					</div>
				</section>

				<section
					id="features"
					className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28"
					aria-labelledby="features-heading"
				>
					<div className="max-w-2xl">
						<p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
							Less guesswork. More momentum.
						</p>
						<h2
							id="features-heading"
							className="mt-4 text-pretty text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl"
						>
							The tools you need for the semester you want.
						</h2>
						<p className="mt-5 text-base leading-7 text-white/55">
							From the first class to the final result, bCampus turns scattered academic data into
							decisions you can act on.
						</p>
					</div>
					<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{features.map(({ icon: Icon, title, copy, accent }) => (
							<article
								key={title}
								className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.045]"
							>
								<div
									className={`flex h-11 w-11 items-center justify-center rounded-xl border ${accent}`}
								>
									<Icon aria-hidden="true" className="h-5 w-5" />
								</div>
								<h3 className="mt-5 text-base font-bold text-white">{title}</h3>
								<p className="mt-2 text-sm leading-6 text-white/50">{copy}</p>
							</article>
						))}
					</div>
				</section>

				<section
					id="how-it-works"
					className="scroll-mt-20 border-y border-white/[0.07] bg-[#0c1416]"
					aria-labelledby="workflow-heading"
				>
					<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24 lg:px-10 lg:py-28">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
								A calmer academic workflow
							</p>
							<h2
								id="workflow-heading"
								className="mt-4 text-pretty text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl"
							>
								Start anywhere. Keep moving.
							</h2>
							<p className="mt-5 max-w-lg text-base leading-7 text-white/55">
								Use the quick tools without an account, then sign in when you’re ready to keep your
								progress across devices.
							</p>
							<Link
								href="/gpa-calculator"
								className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-secondary transition-[color,gap] duration-200 hover:gap-3 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
							>
								Try the GPA calculator <ArrowRight aria-hidden="true" className="h-4 w-4" />
							</Link>
						</div>
						<div className="space-y-4">
							{workflow.map((step, index) => (
								<div
									key={step}
									className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5"
								>
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-cyan-200">
										0{index + 1}
									</div>
									<div>
										<h3 className="text-sm font-bold text-white">{step}</h3>
										<p className="mt-1 text-sm leading-6 text-white/45">
											{index === 0
												? "Keep separate profiles for different programs, scenarios, or study groups."
												: index === 1
													? "Your data stays available wherever you open bCampus."
													: "Get a clear next step instead of another tab full of numbers."}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				<section id="mobile" className="scroll-mt-20 relative overflow-hidden" aria-labelledby="mobile-heading">
					<div
						className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-transparent to-accent/[0.08]"
						aria-hidden="true"
					/>
					<div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-28">
						<div className="order-2 lg:order-1">
							<div className="relative mx-auto w-full max-w-[300px] rounded-[2.5rem] border-4 border-white/15 bg-[#0c1214] p-2 shadow-2xl shadow-primary/10">
								<div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#10191b] px-4 pb-6 pt-8">
									<div className="mx-auto mb-8 h-1.5 w-16 rounded-full bg-white/15" />
									<div className="flex items-center gap-3">
										<Image
											src="/myLogo.webp"
											alt=""
											width={38}
											height={38}
											className="rounded-xl"
										/>
										<div>
											<p className="text-xs font-bold text-white">Good morning</p>
											<p className="mt-0.5 text-[10px] text-white/45">
												Here’s your progress at a glance
											</p>
										</div>
									</div>
									<div className="mt-6 rounded-2xl bg-gradient-to-br from-primary to-[#006578] p-4">
										<p className="text-[10px] uppercase tracking-widest text-white/70">
											Current CGPA
										</p>
										<p className="mt-2 text-4xl font-black text-white">8.42</p>
										<div className="mt-4 h-1.5 rounded-full bg-white/20">
											<div className="h-full w-[84%] rounded-full bg-white" />
										</div>
									</div>
									<div className="mt-4 grid grid-cols-2 gap-3">
										<div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
											<p className="text-[9px] uppercase tracking-wider text-white/40">
												Attendance
											</p>
											<p className="mt-2 text-lg font-bold text-emerald-300">86%</p>
										</div>
										<div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
											<p className="text-[9px] uppercase tracking-wider text-white/40">Goal</p>
											<p className="mt-2 text-lg font-bold text-amber-300">9.0</p>
										</div>
									</div>
									<div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3">
										<div className="flex items-center justify-between">
											<p className="text-[10px] font-bold text-white/75">Next milestone</p>
											<Target aria-hidden="true" className="h-4 w-4 text-secondary" />
										</div>
										<p className="mt-2 text-xs leading-5 text-white/45">
											Keep your next semester above 9.0 to reach your goal.
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="order-1 max-w-xl lg:order-2">
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">
								Your campus, in your pocket
							</p>
							<h2
								id="mobile-heading"
								className="mt-4 text-pretty text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl"
							>
								Pick up where you left off, anywhere.
							</h2>
							<p className="mt-5 text-base leading-7 text-white/55">
								The mobile experience keeps the essentials close: quick calculators, live progress,
								attendance checks, and reminders when it matters.
							</p>
							<ul className="mt-7 space-y-3">
								{[
									"A focused dashboard for busy days",
									"Fast calculations without a login",
									"One account across web and mobile",
								].map((item) => (
									<li key={item} className="flex items-center gap-3 text-sm text-white/75">
										<span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
											<Check aria-hidden="true" className="h-3.5 w-3.5" />
										</span>
										{item}
									</li>
								))}
							</ul>
							<a
								href={MOBILE_RELEASE.apkUrl}
								target="_blank"
								rel="noreferrer"
								className="mt-9 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c1416]"
							>
								<Download aria-hidden="true" className="h-4 w-4" /> Download Android app
							</a>
							<p className="mt-3 text-xs text-white/35">
								Android APK v{MOBILE_RELEASE.version} · Free direct download
							</p>
						</div>
					</div>
				</section>

				<section className="px-5 py-20 sm:px-8 lg:px-10 lg:py-28" aria-labelledby="cta-heading">
					<div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-[#102d33] via-[#0e1e22] to-[#11171a] px-6 py-12 text-center sm:px-12 sm:py-16">
						<div
							className="pointer-events-none absolute left-1/2 top-0 h-56 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[90px]"
							aria-hidden="true"
						/>
						<div className="relative">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-cyan-200">
								<GraduationCap aria-hidden="true" className="h-6 w-6" />
							</div>
							<h2
								id="cta-heading"
								className="mx-auto mt-6 max-w-2xl text-pretty text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl"
							>
								Your next semester starts with a clearer picture.
							</h2>
							<p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/55">
								Open bCampus on the web, or take it with you on mobile. Your progress is ready when you
								are.
							</p>
							<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
								<Link
									href="/dashboard"
									className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#102d33]"
								>
									Open the web app <Globe2 aria-hidden="true" className="h-4 w-4" />
								</Link>
								<a
									href={MOBILE_RELEASE.apkUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-5 text-sm font-bold text-white transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#102d33]"
								>
									<Download aria-hidden="true" className="h-4 w-4" /> Download Android app
								</a>
							</div>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-white/[0.07] bg-[#070b0d]">
				<div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
					<div className="flex items-center gap-2.5">
						<Image src="/myLogo.webp" alt="bCampus" width={28} height={28} className="rounded-lg" />
						<span className="text-sm font-bold text-white">bCampus</span>
						<span className="ml-2 text-xs text-white/35">Academic clarity, everywhere.</span>
					</div>
					<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45">
						<Link
							href="/about"
							className="inline-flex min-h-11 items-center rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							About
						</Link>
						<Link
							href="/privacy-policy.html"
							className="inline-flex min-h-11 items-center rounded-md transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
						>
							Privacy
						</Link>
						<span>© 2026 bCampus</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
