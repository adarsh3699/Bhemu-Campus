import React from "react";

interface InputGroupProps {
	label: string;
	value: string;
	onChange: (val: string) => void;
	placeholder: string;
	min?: string;
	max?: string;
	step?: string;
}

export default function InputGroup({ label, value, onChange, placeholder, min, max, step = "0.01" }: InputGroupProps) {
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
}
