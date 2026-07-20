"use client";

export default function LeaderboardSeparator() {
	return (
		<div className="flex items-center gap-3 py-1 px-4">
			<div className="flex-1 border-t border-dashed border-white/10" />
			<span className="text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest select-none">
				···
			</span>
			<div className="flex-1 border-t border-dashed border-white/10" />
		</div>
	);
}
