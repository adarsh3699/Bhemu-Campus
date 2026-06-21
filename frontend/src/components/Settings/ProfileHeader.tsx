"use client";

import React from "react";
import { Settings } from "lucide-react";
export default function ProfileHeader() {
	return (
		<div className="flex items-center gap-4 mb-8">
			<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
				<Settings className="w-6 h-6" />
			</div>
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Settings</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Manage your personal information, security preferences, and account options
				</p>
			</div>
		</div>
	);
}
