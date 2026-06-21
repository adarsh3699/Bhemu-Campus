"use client";

import React from "react";
import type { CustomCutoff } from "@/types/marks";

interface CutoffIndicatorProps {
	cutoff: CustomCutoff;
}

export default function CutoffIndicator({ cutoff }: CutoffIndicatorProps) {
	return (
		<span
			className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-[10px] font-bold"
			title={`Relative grading: ${cutoff.gradePoint} grade point set at ${cutoff.cutoffMarks} marks`}
		>
			✦ Relative
		</span>
	);
}
