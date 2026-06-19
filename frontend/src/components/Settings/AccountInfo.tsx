"use client";

import React from "react";
import Link from "next/link";
import { User } from "firebase/auth";
import {
	ShieldCheck,
	AlertTriangle,
	CheckCircle2,
	XCircle,
	Pencil,
	RotateCw,
	Calculator,
} from "lucide-react";

interface AccountInfoProps {
	currentUser: User | null;
	isEditingName: boolean;
	setIsEditingName: (editing: boolean) => void;
	newDisplayName: string;
	setNewDisplayName: (name: string) => void;
	isUpdatingName: boolean;
	handleUpdateDisplayName: () => Promise<void>;
	handleCancelEdit: () => void;
	isGoogleUser: boolean;
}

export default function AccountInfo({
	currentUser,
	isEditingName,
	setIsEditingName,
	newDisplayName,
	setNewDisplayName,
	isUpdatingName,
	handleUpdateDisplayName,
	handleCancelEdit,
	isGoogleUser,
}: AccountInfoProps) {
	const memberSince = currentUser?.metadata?.creationTime
		? new Date(currentUser.metadata.creationTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })
		: "—";

	const getUserInitial = () => {
		const name = currentUser?.displayName || currentUser?.email;
		return name ? name.charAt(0).toUpperCase() : "U";
	};

	return (
		<div
			className="bg-surface-dark border border-border rounded-xl p-6 relative overflow-hidden group flex flex-col gap-6 h-full"
			style={{ boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
		>
			{/* Decorative blob */}
			<div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all duration-500 pointer-events-none" />

			{/* Avatar + Name/Email */}
			<div className="flex items-center gap-4 relative z-10">
				<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold border-2 border-white/10 shrink-0">
					{getUserInitial()}
				</div>
				<div className="min-w-0">
					{isEditingName ? (
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={newDisplayName}
								onChange={(e) => setNewDisplayName(e.target.value)}
								className="bg-surface-elevated border border-border rounded-lg px-3 py-1.5 text-white text-sm font-semibold w-full outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
								placeholder="Display name"
								disabled={isUpdatingName}
								autoFocus
							/>
							<div className="flex gap-1 shrink-0">
								<button
									onClick={handleUpdateDisplayName}
									disabled={isUpdatingName}
									className="p-1.5 bg-success hover:bg-emerald-600 text-white rounded-lg transition-all disabled:opacity-60"
									title="Save"
								>
									{isUpdatingName ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
								</button>
								<button
									onClick={handleCancelEdit}
									disabled={isUpdatingName}
									className="p-1.5 bg-surface-elevated border border-border text-muted-foreground hover:text-white rounded-lg transition-all"
									title="Cancel"
								>
									<XCircle className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<h3 className="text-white font-bold text-base truncate">
								{currentUser?.displayName || "No name set"}
							</h3>
							<button
								onClick={() => setIsEditingName(true)}
								className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0"
								title="Edit name"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
						</div>
					)}
					<p className="text-muted-foreground text-xs truncate mt-0.5">{currentUser?.email}</p>
				</div>
			</div>

			{/* Info Rows */}
			<div className="space-y-3 relative z-10 flex-1">
				{/* Account Type */}
				<div className="flex items-center justify-between py-2 border-b border-border">
					<span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Account Type</span>
					{isGoogleUser ? (
						<span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
							<ShieldCheck className="w-3 h-3" /> Google
						</span>
					) : (
						<span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
							<ShieldCheck className="w-3 h-3" /> Email
						</span>
					)}
				</div>

				{/* Email Status */}
				<div className="flex items-center justify-between py-2 border-b border-border">
					<span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email Status</span>
					{currentUser?.emailVerified ? (
						<span className="flex items-center gap-1 text-xs text-success font-semibold">
							<CheckCircle2 className="w-3.5 h-3.5" /> Verified
						</span>
					) : (
						<span className="flex items-center gap-1 text-xs text-warning font-semibold">
							<AlertTriangle className="w-3.5 h-3.5" /> Unverified
						</span>
					)}
				</div>

				{/* Member Since */}
				<div className="flex items-center justify-between py-2 border-b border-border">
					<span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Member Since</span>
					<span className="text-white text-sm font-medium">{memberSince}</span>
				</div>
			</div>

			{/* Go to Calculator */}
			<Link
				href="/gpa-calculator"
				className="relative z-10 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary transition-all text-sm font-medium group/btn"
			>
				<Calculator className="w-4 h-4 group-hover/btn:-translate-x-0.5 transition-transform" />
				Go to Calculator
			</Link>
		</div>
	);
}
