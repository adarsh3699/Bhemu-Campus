"use client";

import React from "react";
import { Lock, Key, ShieldCheck, RotateCw, XCircle, AlertTriangle } from "lucide-react";

interface SecuritySectionProps {
	isGoogleUser: boolean;
	hasPassword: boolean;
	isCreatingPassword: boolean;
	setIsCreatingPassword: (creating: boolean) => void;
	newPassword: string;
	setNewPassword: (password: string) => void;
	confirmPassword: string;
	setConfirmPassword: (password: string) => void;
	isSettingPassword: boolean;
	handleCreatePassword: (e: React.FormEvent) => Promise<void>;
	handleCancelPassword: () => void;
	isChangingPassword: boolean;
	setIsChangingPassword: (changing: boolean) => void;
	currentPassword: string;
	setCurrentPassword: (password: string) => void;
	isChangingPasswordLoading: boolean;
	handleChangePassword: (e: React.FormEvent) => Promise<void>;
	handleCancelPasswordChange: () => void;
}

export default function SecuritySection({
	isGoogleUser,
	hasPassword,
	isCreatingPassword,
	setIsCreatingPassword,
	newPassword,
	setNewPassword,
	confirmPassword,
	setConfirmPassword,
	isSettingPassword,
	handleCreatePassword,
	handleCancelPassword,
	isChangingPassword,
	setIsChangingPassword,
	currentPassword,
	setCurrentPassword,
	isChangingPasswordLoading,
	handleChangePassword,
	handleCancelPasswordChange,
}: SecuritySectionProps) {
	return (
		<div
			className="bg-[#161616] border border-white/8 rounded-xl p-5 flex flex-col gap-5"
			style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4)" }}
		>
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
					<Lock className="w-4 h-4 text-primary" />
				</div>
				<div>
					<h2 className="text-sm font-semibold text-white">Security</h2>
					<p className="text-xs text-muted-foreground mt-0.5">Manage your login credentials</p>
				</div>
			</div>

			{/* No password warning banner */}
			{!hasPassword && (
				<div className="bg-yellow-500/8 border border-yellow-500/15 rounded-lg px-4 py-3 flex items-start gap-2.5">
					<AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
					<div>
						<p className="text-xs font-semibold text-yellow-300">No Password Set</p>
						<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
							Set a password to enable email/password login and extra recovery methods.
						</p>
					</div>
				</div>
			)}

			{/* Create Password for Google users without password */}
			{isGoogleUser && !hasPassword && (
				<>
					{!isCreatingPassword ? (
						<div className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
							<div className="flex items-center gap-2.5">
								<Key className="w-4 h-4 text-muted-foreground shrink-0" />
								<span className="text-sm text-white font-medium">Create Password</span>
							</div>
							<button
								onClick={() => setIsCreatingPassword(true)}
								className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
							>
								Create
							</button>
						</div>
					) : (
						<form onSubmit={handleCreatePassword} className="flex flex-col gap-4">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="set-new-password" className="text-xs text-muted-foreground">
									New Password
								</label>
								<input
									id="set-new-password"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
									placeholder="Enter new password"
									required
									minLength={6}
									disabled={isSettingPassword}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="set-confirm-password" className="text-xs text-muted-foreground">
									Confirm Password
								</label>
								<input
									id="set-confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
									placeholder="Confirm new password"
									required
									minLength={6}
									disabled={isSettingPassword}
								/>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={isSettingPassword}
									className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
								>
									{isSettingPassword ? (
										<><RotateCw className="w-3.5 h-3.5 animate-spin" /> Creating...</>
									) : (
										<><Key className="w-3.5 h-3.5" /> Save</>
									)}
								</button>
								<button
									type="button"
									onClick={handleCancelPassword}
									disabled={isSettingPassword}
									className="px-4 py-2 bg-white/5 hover:bg-white/9 border border-white/8 text-sm text-muted-foreground hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
								>
									<XCircle className="w-3.5 h-3.5" /> Cancel
								</button>
							</div>
						</form>
					)}
				</>
			)}

			{/* Change Password for users who already have a password */}
			{hasPassword && (
				<>
					{!isChangingPassword ? (
						<div className="flex items-center justify-between py-2.5 border-b border-white/6 last:border-0">
							<div className="flex items-center gap-2.5">
								<ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
								<span className="text-sm text-white font-medium">Password set</span>
							</div>
							<button
								onClick={() => setIsChangingPassword(true)}
								className="px-4 py-2 bg-white/5 hover:bg-white/9 border border-white/8 text-sm text-muted-foreground hover:text-white rounded-lg transition-colors cursor-pointer"
							>
								Change
							</button>
						</div>
					) : (
						<form onSubmit={handleChangePassword} className="flex flex-col gap-4">
							<div className="flex flex-col gap-1.5">
								<label htmlFor="current-password" className="text-xs text-muted-foreground">
									Current Password
								</label>
								<input
									id="current-password"
									type="password"
									value={currentPassword}
									onChange={(e) => setCurrentPassword(e.target.value)}
									className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
									placeholder="Current password"
									required
									disabled={isChangingPasswordLoading}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="change-new-password" className="text-xs text-muted-foreground">
									New Password
								</label>
								<input
									id="change-new-password"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
									placeholder="Minimum 6 characters"
									required
									minLength={6}
									disabled={isChangingPasswordLoading}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label htmlFor="change-confirm-password" className="text-xs text-muted-foreground">
									Confirm Password
								</label>
								<input
									id="change-confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-sm text-white outline-none focus:border-primary/50 transition-colors"
									placeholder="Confirm new password"
									required
									minLength={6}
									disabled={isChangingPasswordLoading}
								/>
							</div>
							<div className="flex gap-2">
								<button
									type="submit"
									disabled={isChangingPasswordLoading}
									className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
								>
									{isChangingPasswordLoading ? (
										<><RotateCw className="w-3.5 h-3.5 animate-spin" /> Changing...</>
									) : (
										<><ShieldCheck className="w-3.5 h-3.5" /> Save</>
									)}
								</button>
								<button
									type="button"
									onClick={handleCancelPasswordChange}
									disabled={isChangingPasswordLoading}
									className="px-4 py-2 bg-white/5 hover:bg-white/9 border border-white/8 text-sm text-muted-foreground hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
								>
									<XCircle className="w-3.5 h-3.5" /> Cancel
								</button>
							</div>
						</form>
					)}
				</>
			)}
		</div>
	);
}
