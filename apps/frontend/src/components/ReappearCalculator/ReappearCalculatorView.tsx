"use client";

import React, { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import { RotateCw, BookOpen, GraduationCap, Beaker, FileText } from "lucide-react";
import type { TheoryMarks, HybridMarks, PracticalMarks, ResultType } from "./types";
import MarkInput from "./MarkInput";
import ResultPanel from "./ResultPanel";

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
	const totalMaxWeight = marks.att.max + marks.ca.max + marks.mte.max + marks.ete.max;
	const maxExceeded = totalMaxWeight !== 100;

	const calculate = () => {
		if (maxExceeded) return;
		const attObt = parseFloat(marks.att.obt) || 0;
		const caObt = parseFloat(marks.ca.obt) || 0;
		const mteObt = parseFloat(marks.mte.obt) || 0;
		const eteObt = parseFloat(marks.ete.obt) || 0;
		const totalObt = attObt + caObt + mteObt + eteObt;
		const totalMax = marks.att.max + marks.ca.max + marks.mte.max + marks.ete.max;
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
			if (!cond1) msgs.push("Minimum 30% in ETE or combined (MTE + ETE) required");
			if (!cond2) msgs.push(`Overall ${overallP.toFixed(1)}% is below the 40% passing threshold`);

			const eteForCond1 = Math.min(
				Math.ceil(marks.ete.max * 0.3),
				Math.ceil((marks.mte.max + marks.ete.max) * 0.3 - mteObt)
			);
			const eteForCond2 = Math.ceil(totalMax * 0.4 - attObt - caObt - mteObt);
			const eteNeeded = Math.max(eteForCond1, eteForCond2);
			const moreNeeded = Math.max(0, eteNeeded - eteObt);

			setResult({
				status: "FAIL",
				message: msgs.join(". "),
				required: `Need ${moreNeeded} more marks in ETE`,
			});
		}
	};

	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<MarkInput
					label="Attendance"
					value={marks.att}
					onChange={(v) => setMarks({ ...marks, att: v })}
					fullWidth
				/>
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
			{maxExceeded && (
				<p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
					Total max marks must equal 100 (currently {totalMaxWeight}) — adjust the max values above
				</p>
			)}
			<div className="flex gap-3">
				<button
					onClick={calculate}
					disabled={maxExceeded}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
	const totalMaxWeight = marks.att.max + marks.ca.max + marks.theoryMte.max + marks.theoryEte.max + marks.practicalEte.max;
	const maxExceeded = totalMaxWeight !== 100;

	const calculate = () => {
		if (maxExceeded) return;
		const attObt = parseFloat(marks.att.obt) || 0;
		const caObt = parseFloat(marks.ca.obt) || 0;
		const tMteObt = parseFloat(marks.theoryMte.obt) || 0;
		const tEteObt = parseFloat(marks.theoryEte.obt) || 0;
		const pEteObt = parseFloat(marks.practicalEte.obt) || 0;
		const tEteP = (tEteObt / marks.theoryEte.max) * 100;
		const tCombP = ((tMteObt + tEteObt) / (marks.theoryMte.max + marks.theoryEte.max)) * 100;
		const pEteP = (pEteObt / marks.practicalEte.max) * 100;
		const totalObt = attObt + caObt + tMteObt + tEteObt + pEteObt;
		const totalMax = marks.att.max + marks.ca.max + marks.theoryMte.max + marks.theoryEte.max + marks.practicalEte.max;
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
					label="Attendance"
					value={marks.att}
					onChange={(v) => setMarks({ ...marks, att: v })}
					fullWidth
				/>
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
			{maxExceeded && (
				<p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
					Total max marks must equal 100 (currently {totalMaxWeight}) — adjust the max values above
				</p>
			)}
			<div className="flex gap-3">
				<button
					onClick={calculate}
					disabled={maxExceeded}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
	const totalMaxWeight = marks.att.max + marks.ca.max + marks.ete.max;
	const maxExceeded = totalMaxWeight !== 100;

	const calculate = () => {
		if (maxExceeded) return;
		const attObt = parseFloat(marks.att.obt) || 0;
		const caObt = parseFloat(marks.ca.obt) || 0;
		const eteObt = parseFloat(marks.ete.obt) || 0;
		const eteP = (eteObt / marks.ete.max) * 100;
		const totalObt = attObt + caObt + eteObt;
		const totalMax = marks.att.max + marks.ca.max + marks.ete.max;
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
				<MarkInput
					label="Attendance"
					value={marks.att}
					onChange={(v) => setMarks({ ...marks, att: v })}
					fullWidth
				/>
				<MarkInput label="Practical CA" value={marks.ca} onChange={(v) => setMarks({ ...marks, ca: v })} />
				<MarkInput
					label="End Term Practical Exam"
					value={marks.ete}
					onChange={(v) => setMarks({ ...marks, ete: v })}
				/>
			</div>
			{maxExceeded && (
				<p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
					Total max marks must equal 100 (currently {totalMaxWeight}) — adjust the max values above
				</p>
			)}
			<div className="flex gap-3">
				<button
					onClick={calculate}
					disabled={maxExceeded}
					className="flex-1 py-3.5 bg-gradient-to-r from-primary-dark to-primary text-white font-bold rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 hover:shadow-glow text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
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
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 25 },
		mte: { obt: "", max: 20 },
		ete: { obt: "", max: 50 },
	});
	const [theoryResult, setTheoryResult] = useState<ResultType | null>(null);
	const [hybridMarks, setHybridMarks] = useState<HybridMarks>({
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 25 },
		theoryMte: { obt: "", max: 20 },
		theoryEte: { obt: "", max: 25 },
		practicalEte: { obt: "", max: 25 },
	});
	const [hybridResult, setHybridResult] = useState<ResultType | null>(null);
	const [practicalMarks, setPracticalMarks] = useState<PracticalMarks>({
		att: { obt: "", max: 5 },
		ca: { obt: "", max: 50 },
		ete: { obt: "", max: 45 },
	});
	const [practicalResult, setPracticalResult] = useState<ResultType | null>(null);

	const reset = () => {
		if (activeTab === "theory") {
			setTheoryMarks({ att: { obt: "", max: 5 }, ca: { obt: "", max: 25 }, mte: { obt: "", max: 20 }, ete: { obt: "", max: 50 } });
			setTheoryResult(null);
		} else if (activeTab === "hybrid") {
			setHybridMarks({
				att: { obt: "", max: 5 },
				ca: { obt: "", max: 25 },
				theoryMte: { obt: "", max: 20 },
				theoryEte: { obt: "", max: 25 },
				practicalEte: { obt: "", max: 25 },
			});
			setHybridResult(null);
		} else {
			setPracticalMarks({ att: { obt: "", max: 5 }, ca: { obt: "", max: 50 }, ete: { obt: "", max: 45 } });
			setPracticalResult(null);
		}
	};

	const currentResult =
		activeTab === "theory" ? theoryResult : activeTab === "hybrid" ? hybridResult : practicalResult;

	const TABS = [
		{ id: "theory" as const, label: "Theory Only", icon: BookOpen },
		{ id: "practical" as const, label: "Practical Only", icon: Beaker },
		{ id: "hybrid" as const, label: "Theory + Practical", icon: GraduationCap },
	];

	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			<PageHeader
				icon={GraduationCap}
				title="Reappear Calculator"
				description="Determine the exact marks needed to clear your backlogs"
			/>

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
				<span>© {new Date().getFullYear()} bCampus</span>
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
