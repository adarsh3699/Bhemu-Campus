"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
	icon: LucideIcon;
	title: string;
	description?: string;
	iconColor?: string;
	iconBg?: string;
	iconBorder?: string;
	className?: string;
}

export default function PageHeader({
	icon: Icon,
	title,
	description,
	iconColor = "text-primary",
	iconBg = "bg-primary/10",
	iconBorder = "border-primary/20",
	className = "",
}: PageHeaderProps) {
	return (
		<div className={`flex w-full items-center gap-4 mb-8 ${className}`}>
			<div
				className={`p-3 ${iconBg} border ${iconBorder} rounded-xl flex items-center justify-center ${iconColor} shrink-0 shadow-sm`}
			>
				<Icon className="w-6 h-6" />
			</div>
			<div>
				<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{title}</h1>
				{description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
			</div>
		</div>
	);
}
