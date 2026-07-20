import { BarChart3, PartyPopper, AlertTriangle, Frown } from "lucide-react";
import type { ResultType } from "./types";

interface ResultPanelProps {
	result: ResultType | null;
}

export default function ResultPanel({ result }: ResultPanelProps) {
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
}
