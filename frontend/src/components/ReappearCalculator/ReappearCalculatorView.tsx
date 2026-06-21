"use client";

import React, { useState } from "react";
import {
	RotateCw,
	BookOpen,
	GraduationCap,
	Beaker,
	BarChart3,
	PartyPopper,
	AlertTriangle,
	Frown,
	FileText,
} from "lucide-react";

interface MarkDetail {
	obt: string;
	max: number;
}

interface TheoryMarks {
	ca: MarkDetail;
	mte: MarkDetail;
	ete: MarkDetail;
}
interface HybridMarks {
	ca: MarkDetail;
	theoryMte: MarkDetail;
	theoryEte: MarkDetail;
	practicalEte: MarkDetail;
}
interface PracticalMarks {
	ca: MarkDetail;
	ete: MarkDetail;
}
interface ResultType {
	status: "PASS" | "FAIL" | "ATTENTION";
	message: string;
	score?: string;
	required?: string;
}

// ─── Mark Input ────────────────────────────────────────────────────────────────
interface MarkInputProps {
	label: string;
	value: MarkDetail;
	onChange: (v: MarkDetail) => void;
	fullWidth?: boolean;
}

const MarkInput: React.FC<MarkInputProps> = ({ label, value, onChange, fullWidth }) => (
	<div className={`flex flex-col gap-1.5 ${fullWidth ? "col-span-1 sm:col-span-2" : ""}`}>
		<label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
		<div className="flex gap-2 items-center">
			<input
				type="number"
				value={value.obt}
				onChange={(e) => onChange({ ...value, obt: e.target.value })}
				placeholder="Obtained"
				min="0"
				max={value.max}
				step="0.5"
				className="flex-1 px-3 py-2.5 border border-border rounded-lg bg-surface-elevated text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground transition-all"
			/>
			<span className="text-muted-foreground font-bold">/</span>
			<input
				type="number"
				value={value.max}
				onChange={(e) => onChange({ ...value, max: parseFloat(e.target.value) || 0 })}
				placeholder="Max"
				min="1"
				className="w-16 px-2 py-2.5 border border-border rounded-lg bg-surface-elevated text-white text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-center placeholder:text-muted-foreground transition-all"
			/>
		</div>
	</div>
);

// ─── Result Panel ──────────────────────────────────────────────────────────────
const ResultPanel = ({ result }: { result: ResultType | null }) => {
	if (!result) {
		return (
			<div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
				<BarChart3 className="w-12 h-12 mb-4 opacity-30 text-muted-foreground" />
				<p className="text-sm">
					Enter your marks to <strong className="text-white">Calculate</strong> your result
				</p>
			</div>
		);
	}

	const isPass = result.status === "PASS";
	const isAttn = result.status === "ATTENTION";

	return (
		<div className="h-full flex flex-col">
			{/* Status Banner */}
			<div
				className={`p-8 flex flex-col items-center justify-center text-center relative overflow-hidden border-b border-border ${
					isPass ? "bg-success/5" : isAttn ? "bg-warning/5" : "bg-destructive/5"
				}`}
			>
				<div
					className={`absolute inset-0 bg-gradient-to-b ${isPass ? "from-success/10" : isAttn ? "from-warning/10" : "from-destructive/10"} to-transparent pointer-events-none`}
				/>
				<div className="mb-3 relative z-10">
					{isPass ? (
						<PartyPopper className="w-12 h-12 text-success" />
					) : isAttn ? (
						<AlertTriangle className="w-12 h-12 text-warning" />
					) : (
						<Frown className="w-12 h-12 text-destructive" />
					)}
				</div>
				<span
					className={`text-xs font-bold uppercase tracking-widest mb-2 relative z-10 ${isPass ? "text-success" : isAttn ? "text-warning" : "text-destructive"}`}
				>
					Reappear Status
				</span>
				<div
					className={`text-4xl font-bold font-mono tracking-tight relative z-10 ${isPass ? "text-success" : isAttn ? "text-warning" : "text-destructive"}`}
					style={{
						textShadow: `0 0 20px ${isPass ? "rgba(16,185,129,0.3)" : isAttn ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
					}}
				>
					{isPass ? "PASSED" : isAttn ? "ATTENTION" : "FAILED"}
				</div>
				{result.score && <p className="text-sm text-muted-foreground mt-3 relative z-10">{result.score}</p>}
			</div>

			{/* Breakdown */}
			<div className="p-5 flex-1 flex flex-col gap-4">
				<h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Result Details</h4>
				<p className="text-sm text-white/80 leading-relaxed">{result.message}</p>

				{result.required && (
					<div
						className={`mt-auto p-5 rounded-xl border relative ${isPass ? "border-success/30 bg-success/5" : isAttn ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"}`}
					>
						<div
							className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-1 h-10 ${isPass ? "bg-success" : isAttn ? "bg-warning" : "bg-destructive"} rounded-r-md`}
						/>
						<div className="text-center">
							<span
								className={`text-xs font-bold uppercase tracking-wider block mb-1 ${isPass ? "text-success" : isAttn ? "text-warning" : "text-destructive"}`}
							>
								{isPass ? "Your Score" : "Required to Pass"}
							</span>
							<div className="text-3xl font-bold font-mono text-white">{result.required}</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

// ─── Theory Section ────────────────────────────────────────────────────────────
const TheorySection = ({
	marks,
	setMarks,
	setResult,
	onReset,
}: {
	marks: TheoryMarks;
	setMarks: React.Dispatch<React.SetStateAction<TheoryMarks>>;
	result?: ResultType | null;
	setResult: React.Dispatch<React.SetStateAction<ResultType | null>>;
	onReset: () => void;
}) => {
	const calculate = () => {
		const caObt = parseFloat(marks.ca.obt) || 0;
		const mteObt = parseFloat(marks.mte.obt) || 0;
		const eteObt = parseFloat(marks.ete.obt) || 0;
		const totalObt = caObt + mteObt + eteObt;
		const totalMax = marks.ca.max + marks.mte.max + marks.ete.max;
		const eteP = (eteObt / marks.ete.max) * 100;
		const combinedP = ((mteObt + eteObt) / (marks.mte.max + marks.ete.max)) * 100;
		const overallP = (totalObt / totalMax) * 100;
		const cond1 = eteP >= 30 || combinedP >= 30;
		const cond2 = overallP >= 40;
		if (cond1 && cond2) {
			setResult({
				status: "PASS",
				message: `Congratulations! You have passed all the required criteria.`,
				score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
				required: `${totalObt} / ${totalMax}`,
			});
		} else {
			const msgs = [];
			if (!cond1) msgs.push("Minimum 30% in ETE or combined theory required");
			if (!cond2) msgs.push(`Overall ${overallP.toFixed(1)}% is below the 40% passing threshold`);
			setResult({
				status: "FAIL",
				message: msgs.join(". "),
				required: `Need ${Math.ceil(totalMax * 0.4 - totalObt)} more marks`,
			});
		}
	};

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<MarkInput
					label="Continuous Assessment (CA)"
					value={marks.ca}
					onChange={(v) => setMarks({ ...marks, ca: v })}
				/>
				<MarkInput
					label="Mid Term Exam (MTE)"
					value={marks.mte}
					onChange={(v) => setMarks({ ...marks, mte: v })}
				/>
				<MarkInput
					label="End Term Theory Exam (ETE)"
					value={marks.ete}
					onChange={(v) => setMarks({ ...marks, ete: v })}
					fullWidth
				/>
			</div>
			<div className="flex gap-3">
				<button
					onClick={calculate}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm"
				>
					Calculate Result
				</button>
				<button
					onClick={onReset}
					className="px-5 py-3.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
				>
					<RotateCw className="w-4 h-4" /> Reset
				</button>
			</div>
		</div>
	);
};

// ─── Hybrid Section ────────────────────────────────────────────────────────────
const HybridSection = ({
	marks,
	setMarks,
	setResult,
	onReset,
}: {
	marks: HybridMarks;
	setMarks: React.Dispatch<React.SetStateAction<HybridMarks>>;
	result?: ResultType | null;
	setResult: React.Dispatch<React.SetStateAction<ResultType | null>>;
	onReset: () => void;
}) => {
	const calculate = () => {
		const caObt = parseFloat(marks.ca.obt) || 0;
		const tMteObt = parseFloat(marks.theoryMte.obt) || 0;
		const tEteObt = parseFloat(marks.theoryEte.obt) || 0;
		const pEteObt = parseFloat(marks.practicalEte.obt) || 0;
		const tEteP = (tEteObt / marks.theoryEte.max) * 100;
		const tCombP = ((tMteObt + tEteObt) / (marks.theoryMte.max + marks.theoryEte.max)) * 100;
		const pEteP = (pEteObt / marks.practicalEte.max) * 100;
		const totalObt = caObt + tMteObt + tEteObt + pEteObt;
		const totalMax = marks.ca.max + marks.theoryMte.max + marks.theoryEte.max + marks.practicalEte.max;
		const overallP = (totalObt / totalMax) * 100;
		const cond1 = tEteP >= 30 || tCombP >= 30;
		const cond2 = pEteP >= 30;
		const cond3 = overallP >= 40;
		if (cond1 && cond2 && cond3) {
			setResult({
				status: "PASS",
				message: "All criteria met! You have passed this subject.",
				score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
				required: `${totalObt} / ${totalMax}`,
			});
		} else {
			const msgs = [];
			if (!cond1) msgs.push("Theory ETE/MTE threshold not met (min 30%)");
			if (!cond2) msgs.push("Practical ETE threshold not met (min 30%)");
			if (!cond3) msgs.push(`Overall ${overallP.toFixed(1)}% below 40%`);
			setResult({ status: "FAIL", message: msgs.join(". ") });
		}
	};
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<MarkInput
					label="Continuous Assessment (CA)"
					value={marks.ca}
					onChange={(v) => setMarks({ ...marks, ca: v })}
				/>
				<MarkInput
					label="Theory MTE"
					value={marks.theoryMte}
					onChange={(v) => setMarks({ ...marks, theoryMte: v })}
				/>
				<MarkInput
					label="Theory ETE"
					value={marks.theoryEte}
					onChange={(v) => setMarks({ ...marks, theoryEte: v })}
				/>
				<MarkInput
					label="Practical ETE"
					value={marks.practicalEte}
					onChange={(v) => setMarks({ ...marks, practicalEte: v })}
				/>
			</div>
			<div className="flex gap-3">
				<button
					onClick={calculate}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm"
				>
					Calculate Result
				</button>
				<button
					onClick={onReset}
					className="px-5 py-3.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
				>
					<RotateCw className="w-4 h-4" /> Reset
				</button>
			</div>
		</div>
	);
};

// ─── Practical Section ─────────────────────────────────────────────────────────
const PracticalSection = ({
	marks,
	setMarks,
	setResult,
	onReset,
}: {
	marks: PracticalMarks;
	setMarks: React.Dispatch<React.SetStateAction<PracticalMarks>>;
	result?: ResultType | null;
	setResult: React.Dispatch<React.SetStateAction<ResultType | null>>;
	onReset: () => void;
}) => {
	const calculate = () => {
		const caObt = parseFloat(marks.ca.obt) || 0;
		const eteObt = parseFloat(marks.ete.obt) || 0;
		const eteP = (eteObt / marks.ete.max) * 100;
		const totalObt = caObt + eteObt;
		const totalMax = marks.ca.max + marks.ete.max;
		const overallP = (totalObt / totalMax) * 100;
		const cond1 = eteP >= 30;
		const cond2 = overallP >= 40;
		if (cond1 && cond2) {
			setResult({
				status: "PASS",
				message: "All practical criteria met! You have passed.",
				score: `Score: ${totalObt}/${totalMax} (${overallP.toFixed(1)}%)`,
				required: `${totalObt} / ${totalMax}`,
			});
		} else {
			const msgs = [];
			if (!cond1) msgs.push("Practical ETE minimum 30% not met");
			if (!cond2) msgs.push(`Overall ${overallP.toFixed(1)}% below 40%`);
			setResult({ status: "FAIL", message: msgs.join(". ") });
		}
	};
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<MarkInput label="Practical CA" value={marks.ca} onChange={(v) => setMarks({ ...marks, ca: v })} />
				<MarkInput
					label="End Term Practical Exam"
					value={marks.ete}
					onChange={(v) => setMarks({ ...marks, ete: v })}
				/>
			</div>
			<div className="flex gap-3">
				<button
					onClick={calculate}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm"
				>
					Calculate Result
				</button>
				<button
					onClick={onReset}
					className="px-5 py-3.5 rounded-xl border border-border text-muted-foreground hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 text-sm"
				>
					<RotateCw className="w-4 h-4" /> Reset
				</button>
			</div>
		</div>
	);
};

// ─── Main View ─────────────────────────────────────────────────────────────────
export default function ReappearCalculatorView() {
	const [activeTab, setActiveTab] = useState<"theory" | "hybrid" | "practical">("theory");

	const [theoryMarks, setTheoryMarks] = useState<TheoryMarks>({
		ca: { obt: "", max: 25 },
		mte: { obt: "", max: 20 },
		ete: { obt: "", max: 50 },
	});
	const [theoryResult, setTheoryResult] = useState<ResultType | null>(null);
	const [hybridMarks, setHybridMarks] = useState<HybridMarks>({
		ca: { obt: "", max: 30 },
		theoryMte: { obt: "", max: 20 },
		theoryEte: { obt: "", max: 30 },
		practicalEte: { obt: "", max: 20 },
	});
	const [hybridResult, setHybridResult] = useState<ResultType | null>(null);
	const [practicalMarks, setPracticalMarks] = useState<PracticalMarks>({
		ca: { obt: "", max: 50 },
		ete: { obt: "", max: 50 },
	});
	const [practicalResult, setPracticalResult] = useState<ResultType | null>(null);

	const reset = () => {
		if (activeTab === "theory") {
			setTheoryMarks({ ca: { obt: "", max: 25 }, mte: { obt: "", max: 20 }, ete: { obt: "", max: 50 } });
			setTheoryResult(null);
		} else if (activeTab === "hybrid") {
			setHybridMarks({
				ca: { obt: "", max: 30 },
				theoryMte: { obt: "", max: 20 },
				theoryEte: { obt: "", max: 30 },
				practicalEte: { obt: "", max: 20 },
			});
			setHybridResult(null);
		} else {
			setPracticalMarks({ ca: { obt: "", max: 50 }, ete: { obt: "", max: 50 } });
			setPracticalResult(null);
		}
	};

	const currentResult =
		activeTab === "theory" ? theoryResult : activeTab === "hybrid" ? hybridResult : practicalResult;

	const TABS = [
		{ id: "theory" as const, label: "Theory Only", icon: BookOpen },
		{ id: "hybrid" as const, label: "Theory + Practical", icon: GraduationCap },
		{ id: "practical" as const, label: "Practical Only", icon: Beaker },
	];

	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			{/* Page Header */}
			<div className="flex items-center gap-4 mb-8">
				<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
					<GraduationCap className="w-6 h-6" />
				</div>
				<div>
					<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Reappear Calculator</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Determine the exact marks needed to clear your backlogs
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left Column — Inputs */}
				<div className="lg:col-span-7 space-y-5">
					{/* Mode Selector */}
					<div className="bg-surface-dark border border-border p-1.5 rounded-xl flex gap-1 overflow-x-auto">
						{TABS.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								onClick={() => setActiveTab(id)}
								className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
									activeTab === id
										? "bg-surface-elevated text-primary shadow-sm border border-primary/20"
										: "text-muted-foreground hover:text-white hover:bg-white/5"
								}`}
							>
								<Icon className="w-4 h-4 shrink-0" />
								{label}
							</button>
						))}
					</div>

					{/* Input Card */}
					<div
						className="bg-surface-dark border border-border rounded-xl p-6 relative overflow-hidden"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
						<h3 className="text-base font-bold text-white mb-5 flex items-center gap-2 relative z-10">
							<FileText className="w-5 h-5 text-primary shrink-0" />
							Enter Current Marks
						</h3>
						<div className="relative z-10">
							{activeTab === "theory" && (
								<TheorySection
									marks={theoryMarks}
									setMarks={setTheoryMarks}
									result={theoryResult}
									setResult={setTheoryResult}
									onReset={reset}
								/>
							)}
							{activeTab === "hybrid" && (
								<HybridSection
									marks={hybridMarks}
									setMarks={setHybridMarks}
									result={hybridResult}
									setResult={setHybridResult}
									onReset={reset}
								/>
							)}
							{activeTab === "practical" && (
								<PracticalSection
									marks={practicalMarks}
									setMarks={setPracticalMarks}
									result={practicalResult}
									setResult={setPracticalResult}
									onReset={reset}
								/>
							)}
						</div>
					</div>
				</div>

				{/* Right Column — Result */}
				<div className="lg:col-span-5">
					<div
						className="bg-surface-dark border border-border rounded-xl overflow-hidden h-full min-h-[360px]"
						style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
					>
						<ResultPanel result={currentResult} />
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="mt-12 pt-6 border-t border-white/5 flex justify-between items-center text-sm text-muted-foreground">
				<span>© {new Date().getFullYear()} Bhemu Calculator</span>
				<div className="flex gap-4">
					<a
						href="https://www.bhemu.in/about"
						target="_blank"
						rel="noreferrer"
						className="hover:text-primary transition-colors"
					>
						Portfolio
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
