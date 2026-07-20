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
			className="bg-[#161616] border border-white/8 rounded-xl p-5 flex flex-col gap-5"
			style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
		>
			{/* Avatar + Name/Email */}
			<div className="flex items-center gap-4">
				<div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold shrink-0">
					{getUserInitial()}
				</div>
				<div className="min-w-0 flex-1">
					{isEditingName ? (
						<div className="flex items-center gap-2">
							<input
								type="text"
								value={newDisplayName}
								onChange={(e) => setNewDisplayName(e.target.value)}
								className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
								placeholder="Display name"
								disabled={isUpdatingName}
								autoFocus
							/>
							<div className="flex gap-1 shrink-0">
								<button
									onClick={handleUpdateDisplayName}
									disabled={isUpdatingName}
									className="p-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg transition-colors disabled:opacity-60"
									title="Save"
								>
									{isUpdatingName ? (
										<RotateCw className="w-3.5 h-3.5 animate-spin" />
									) : (
										<CheckCircle2 className="w-3.5 h-3.5" />
									)}
								</button>
								<button
									onClick={handleCancelEdit}
									disabled={isUpdatingName}
									className="p-1.5 bg-white/5 hover:bg-white/9 border border-white/8 text-muted-foreground hover:text-white rounded-lg transition-colors"
									title="Cancel"
								>
									<XCircle className="w-3.5 h-3.5" />
								</button>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-1.5">
							<h3 className="text-white font-bold text-base truncate">
								{currentUser?.displayName || "No name set"}
							</h3>
							<button
								onClick={() => setIsEditingName(true)}
								className="p-1 text-muted-foreground hover:text-white transition-colors shrink-0"
								title="Edit name"
							>
								<Pencil className="w-3.5 h-3.5" />
							</button>
						</div>
					)}
					<p className="text-xs text-muted-foreground truncate mt-0.5">{currentUser?.email}</p>
				</div>
			</div>

			{/* Divider */}
			<div className="border-t border-white/6" />

			{/* Info Rows */}
			<div>
				{/* Account Type */}
				<div className="flex items-center justify-between py-2.5 border-b border-white/6">
					<span className="text-xs text-muted-foreground">Account Type</span>
					{isGoogleUser ? (
						<span className="flex items-center gap-1 text-xs font-medium text-blue-400">
							<ShieldCheck className="w-3.5 h-3.5" /> Google
						</span>
					) : (
						<span className="flex items-center gap-1 text-xs font-medium text-primary">
							<ShieldCheck className="w-3.5 h-3.5" /> Email
						</span>
					)}
				</div>

				{/* Email Status */}
				<div className="flex items-center justify-between py-2.5 border-b border-white/6">
					<span className="text-xs text-muted-foreground">Email Status</span>
					{currentUser?.emailVerified ? (
						<span className="flex items-center gap-1 text-xs font-medium text-emerald-400">
							<CheckCircle2 className="w-3.5 h-3.5" /> Verified
						</span>
					) : (
						<span className="flex items-center gap-1 text-xs font-medium text-yellow-400">
							<AlertTriangle className="w-3.5 h-3.5" /> Unverified
						</span>
					)}
				</div>

				{/* Member Since */}
				<div className="flex items-center justify-between py-2.5">
					<span className="text-xs text-muted-foreground">Member Since</span>
					<span className="text-sm text-white font-medium">{memberSince}</span>
				</div>
			</div>

			{/* Divider */}
			<div className="border-t border-white/6" />

			{/* Go to Calculator */}
			<Link
				href="/gpa-calculator"
				className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors"
			>
				<Calculator className="w-4 h-4" />
				Go to Calculator
			</Link>
		</div>
	);
}
