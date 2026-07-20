import type { MarkDetail } from "./types";

interface MarkInputProps {
	label: string;
	value: MarkDetail;
	onChange: (v: MarkDetail) => void;
	fullWidth?: boolean;
}

export default function MarkInput({ label, value, onChange, fullWidth }: MarkInputProps) {
	return (
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
}
