"use client";

import { MoreVertical } from "lucide-react";

export default function LeaderboardSeparator() {
	return (
		<div className="flex items-center justify-center py-2">
			<div className="flex flex-col items-center gap-0.5 text-muted-foreground/50">
				<MoreVertical className="w-4 h-4" />
			</div>
		</div>
	);
}
