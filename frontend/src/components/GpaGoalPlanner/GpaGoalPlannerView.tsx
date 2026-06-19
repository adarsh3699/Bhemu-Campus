"use client";

import React, { useState, useEffect, useCallback } from "react";
import { RotateCw, Flag, Flame, AlertTriangle, CheckCircle, Target, BarChart3, Settings } from "lucide-react";

interface InputGroupProps {
	label: string;
	value: string;
	onChange: (val: string) => void;
	placeholder: string;
	min?: string;
	max?: string;
	step?: string;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, onChange, placeholder, min, max, step = "0.01" }) => {
	const id = React.useId();
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
				{label}
			</label>
			<input
				id={id}
				type="number"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full px-4 py-3 border border-border rounded-lg bg-surface-elevated text-white text-base transition-all focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
				placeholder={placeholder}
				min={min}
				max={max}
				step={step}
			/>
		</div>
	);
};

export default function GpaGoalPlannerView() {
	const [currentCgpa, setCurrentCgpa] = useState("");
	const [completedSemesters, setCompletedSemesters] = useState("");
	const [totalSemesters, setTotalSemesters] = useState("8");
	const [targetCgpa, setTargetCgpa] = useState("8.50");
	const [result, setResult] = useState<{ required: number; possible: boolean; remaining: number } | null>(null);

	const calculateGoal = useCallback(() => {
		const current = parseFloat(currentCgpa);
		const completed = parseInt(completedSemesters);
		const total = parseInt(totalSemesters);
		const target = parseFloat(targetCgpa);

		if (isNaN(current) || isNaN(completed) || isNaN(total) || isNaN(target)) {
			setResult(null);
			return;
		}
		if (completed >= total) { setResult(null); return; }

		const remaining = total - completed;
		const requiredSgpa = (target * total - current * completed) / remaining;

		setResult({ required: requiredSgpa, possible: requiredSgpa <= 10 && requiredSgpa >= 0, remaining });
	}, [currentCgpa, completedSemesters, totalSemesters, targetCgpa]);

	const handleReset = () => {
		setCurrentCgpa("");
		setCompletedSemesters("");
		setTargetCgpa("8.50");
		setResult(null);
	};

	useEffect(() => {
		if (currentCgpa && completedSemesters && totalSemesters && targetCgpa) {
			Promise.resolve().then(calculateGoal);
		} else {
			Promise.resolve().then(() => setResult(null));
		}
	}, [currentCgpa, completedSemesters, totalSemesters, targetCgpa, calculateGoal]);

	const getResultBanner = () => {
		if (!result) return null;
		if (!result.possible) {
			return { type: "destructive", title: "Not Achievable", desc: `Reaching ${targetCgpa} is not possible within the remaining semesters.` };
		}
		if (result.required > 9) {
			return { type: "warning", title: "Challenging", desc: `Reaching ${targetCgpa} will require significant effort in the remaining ${result.remaining} semesters.` };
		}
		return { type: "success", title: "Achievable!", desc: `You're on a good track to reach ${targetCgpa} with consistent effort.` };
	};

	const banner = getResultBanner();

	const bannerStyles = {
		warning: { border: "border-warning/30", bg: "from-warning/10 to-transparent", bar: "bg-warning", title: "text-warning", icon: <Flame className="w-5 h-5 inline-block mr-1 text-warning shrink-0" /> },
		destructive: { border: "border-destructive/30", bg: "from-destructive/10 to-transparent", bar: "bg-destructive", title: "text-destructive", icon: <AlertTriangle className="w-5 h-5 inline-block mr-1 text-destructive shrink-0" /> },
		success: { border: "border-success/30", bg: "from-success/10 to-transparent", bar: "bg-success", title: "text-success", icon: <CheckCircle className="w-5 h-5 inline-block mr-1 text-success shrink-0" /> },
	};

	// Build semester forecast
	const pastSemesters = completedSemesters ? parseInt(completedSemesters) : 0;
	const total = parseInt(totalSemesters) || 8;
	const futureSemesters = total - pastSemesters;

	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			{/* Page Header */}
			<div className="flex items-center gap-4 mb-8">
				<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
					<Flag className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">GPA Goal Planner</h1>
					<p className="text-sm text-muted-foreground mt-1">Strategize your academic trajectory and plan your target CGPA</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left Column — Inputs */}
				<div className="lg:col-span-5 space-y-5">
					{/* Current Status Card */}
					<div
						className="bg-surface-dark border border-border rounded-xl p-6 relative overflow-hidden"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl pointer-events-none" />
						<h2 className="text-base font-bold text-white mb-5 flex items-center gap-2">
							<Settings className="w-5 h-5 text-primary shrink-0" />
							Current Status
						</h2>
						<div className="space-y-4 relative z-10">
							<InputGroup label="Current CGPA" value={currentCgpa} onChange={setCurrentCgpa} placeholder="e.g. 7.54" max="10" />
							<InputGroup label="Completed Semesters" value={completedSemesters} onChange={setCompletedSemesters} placeholder="e.g. 3" max={(total - 1).toString()} step="1" />

							{/* Duration Selector */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Semesters</span>
									<span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
										{totalSemesters} Sem
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2">
									{["4", "6", "8"].map((sem) => (
										<button
											key={sem}
											onClick={() => setTotalSemesters(sem)}
											className={`py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 border ${
												totalSemesters === sem
													? "bg-primary/10 border-primary text-primary"
													: "bg-surface-elevated border-border text-muted-foreground hover:text-white hover:bg-white/5"
											}`}
										>
											{sem}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Target Card */}
					<div
						className="bg-surface-dark border border-border rounded-xl p-6"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
							<Target className="w-5 h-5 text-yellow-400 shrink-0" />
							Target
						</h2>
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target CGPA</label>
								<span className="text-lg font-bold text-yellow-400 font-mono">{parseFloat(targetCgpa || "0").toFixed(2)}</span>
							</div>
							<input
								type="range"
								min="0"
								max="10"
								step="0.01"
								value={targetCgpa}
								onChange={(e) => setTargetCgpa(e.target.value)}
								className="w-full cursor-pointer"
								style={{
									"--range-fill": `${(parseFloat(targetCgpa || "0") / 10) * 100}%`,
								} as React.CSSProperties}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>Current: {currentCgpa || "—"}</span>
								<span>Max Possible: 10.00</span>
							</div>
						</div>
					</div>

					{/* Reset button */}
					<button
						onClick={handleReset}
						className="w-full flex items-center justify-center gap-2 py-3 border border-border text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-medium"
					>
						<RotateCw className="w-4 h-4" />
						Reset Planner
					</button>
				</div>

				{/* Right Column — Results */}
				<div className="lg:col-span-7 space-y-5 flex flex-col">
					{/* Result Banner */}
					{banner && (
						<div
							className={`bg-gradient-to-r ${bannerStyles[banner.type as keyof typeof bannerStyles].bg} border ${bannerStyles[banner.type as keyof typeof bannerStyles].border} rounded-xl p-5 relative overflow-hidden flex items-start gap-4`}
						>
							<div className={`absolute top-0 left-0 w-1 h-full ${bannerStyles[banner.type as keyof typeof bannerStyles].bar}`} />
							<div className="pl-2">
								<h3 className={`text-lg font-bold ${bannerStyles[banner.type as keyof typeof bannerStyles].title} mb-1`}>
									{bannerStyles[banner.type as keyof typeof bannerStyles].icon} {banner.title}
								</h3>
								<p className="text-sm text-muted-foreground">{banner.desc}</p>
							</div>
						</div>
					)}

					{/* Forecast Dashboard */}
					<div
						className="bg-surface-dark border border-border rounded-xl p-6 flex-1 flex flex-col"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-base font-bold text-white flex items-center gap-2">
								<BarChart3 className="w-5 h-5 text-secondary shrink-0" />
								Forecast Summary
							</h2>
							<div className="flex gap-2">
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-elevated border border-border text-muted-foreground">
									<span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> Past
								</span>
								<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 border border-primary/30 text-primary">
									<span className="w-2 h-2 rounded-full bg-primary inline-block" /> Required
								</span>
							</div>
						</div>

						{/* Big Metric */}
						{result ? (
							<div className="flex items-end gap-4 mb-8 pb-6 border-b border-white/5">
								<div>
									<p className="text-muted-foreground text-xs font-medium mb-1 uppercase tracking-wide">Required Avg. SGPA</p>
									<div
										className="text-5xl font-bold text-primary font-mono"
										style={{ textShadow: "0 0 20px rgba(3, 152, 172, 0.4)" }}
									>
										{result.required.toFixed(2)}
									</div>
								</div>
								<div className="mb-2 text-muted-foreground text-sm">
									per semester for next {result.remaining} semesters
								</div>
							</div>
						) : (
							<div className="flex items-center justify-center h-24 mb-6 border-b border-white/5">
								<p className="text-muted-foreground text-sm">Fill in your details to see the forecast</p>
							</div>
						)}

						{/* Semester Timeline */}
						<div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
							{/* Past semesters pill */}
							{pastSemesters > 0 && (
								<div className="bg-surface-elevated rounded-lg p-3 border border-border opacity-60 col-span-1">
									<div className="text-xs text-muted-foreground mb-1">Sem 1–{pastSemesters}</div>
									<div className="text-base font-bold text-white font-mono">{parseFloat(currentCgpa || "0").toFixed(2)}</div>
									<div className="text-xs text-muted-foreground">avg</div>
								</div>
							)}
							{/* Future semesters */}
							{Array.from({ length: Math.min(futureSemesters, 7) }, (_, i) => (
								<div
									key={i}
									className="bg-primary/5 rounded-lg p-3 border border-primary/20 relative group hover:bg-primary/10 transition-all"
								>
									<div className="text-xs text-primary/70 mb-1">Sem {pastSemesters + i + 1}</div>
									<div className="text-base font-bold text-primary font-mono">
										{result ? result.required.toFixed(2) : "—"}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-sm text-muted-foreground">
				<span>© {new Date().getFullYear()} Bhemu Calculator</span>
				<div className="flex gap-4">
					<a href="https://www.bhemu.in/about" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">Portfolio</a>
					<a href="https://www.linkedin.com/in/adarsh3699/" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">LinkedIn</a>
					<a href="https://github.com/adarsh3699" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">GitHub</a>
				</div>
			</footer>
		</div>
	);
}
