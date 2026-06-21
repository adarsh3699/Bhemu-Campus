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
		<div className="xl:col-span-1 bg-neutral-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/10 hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
			{/* Top light glow border */}
			<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

			<div>
				<div className="flex items-center gap-4 mb-8">
					<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform duration-300">
						<Lock className="w-7 h-7" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-white tracking-tight">Security</h2>
						<p className="text-neutral-400 text-sm">
							Password and credentials security
						</p>
					</div>
				</div>

				{/* Password Status - Only show if no password is set */}
				{!hasPassword && (
					<div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-5 rounded-2xl mb-6 backdrop-blur-sm">
						<div className="flex items-start gap-3">
							<div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 shrink-0">
								<AlertTriangle className="w-5 h-5" />
							</div>
							<div>
								<p className="font-semibold text-amber-300 text-sm">No Password Set</p>
								<p className="text-xs text-neutral-400 leading-relaxed mt-0.5">
									Set a password to enable email/password login and extra recovery methods.
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Create Password for Google Users */}
				{isGoogleUser && !hasPassword && (
					<div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-lg">
						{!isCreatingPassword ? (
							<div className="text-center space-y-5">
								<div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
									<Key className="w-7 h-7 text-white" />
								</div>
								<div>
									<h4 className="text-lg font-bold text-white mb-1.5">Create Password</h4>
									<p className="text-neutral-400 text-xs leading-relaxed">
										Set up a password for this account to enable traditional email and password login.
									</p>
								</div>
								<button
									onClick={() => setIsCreatingPassword(true)}
									className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3.5 px-5 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg shadow-md flex items-center justify-center gap-2 group text-sm"
								>
									<Key className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
									Create Password
								</button>
							</div>
						) : (
							<form onSubmit={handleCreatePassword} className="space-y-4">
								<div className="text-center">
									<h4 className="text-lg font-bold text-white">Create Password</h4>
									<p className="text-neutral-400 text-xs mt-1">
										Password must be at least 6 characters long
									</p>
								</div>

								<div className="space-y-3.5">
									<div>
										<label htmlFor="set-new-password" className="block text-xs font-semibold text-neutral-300 mb-1.5 pl-1">
											New Password
										</label>
										<input
											id="set-new-password"
											type="password"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											className="w-full p-3 bg-neutral-950 border border-white/10 rounded-xl text-white outline-none transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
											placeholder="Enter new password"
											required
											minLength={6}
											disabled={isSettingPassword}
										/>
									</div>
									<div>
										<label
											htmlFor="set-confirm-password"
											className="block text-xs font-semibold text-neutral-300 mb-1.5 pl-1"
										>
											Confirm Password
										</label>
										<input
											id="set-confirm-password"
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="w-full p-3 bg-neutral-950 border border-white/10 rounded-xl text-white outline-none transition-all duration-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm"
											placeholder="Confirm new password"
											required
											minLength={6}
											disabled={isSettingPassword}
										/>
									</div>
								</div>

								<div className="flex gap-2 pt-2">
									<button
										type="submit"
										disabled={isSettingPassword}
										className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs"
									>
										{isSettingPassword ? (
											<>
												<RotateCw className="w-4 h-4 animate-spin" />
												Creating...
											</>
										) : (
											<>
												<Key className="w-4 h-4" />
												Save
											</>
										)}
									</button>
									<button
										type="button"
										onClick={handleCancelPassword}
										disabled={isSettingPassword}
										className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs"
									>
										<XCircle className="w-4 h-4" />
										Cancel
									</button>
								</div>
							</form>
						)}
					</div>
				)}

				{/* Change Password for Users with Password */}
				{hasPassword && (
					<div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-lg">
						{!isChangingPassword ? (
							<div className="text-center space-y-5">
								<div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto shadow-lg">
									<ShieldCheck className="w-7 h-7 text-white" />
								</div>
								<div>
									<h4 className="text-lg font-bold text-white mb-1.5">Change Password</h4>
									<p className="text-neutral-400 text-xs leading-relaxed">
										Update your security credentials regularly to keep your grade data safe.
									</p>
								</div>
								<button
									onClick={() => setIsChangingPassword(true)}
									className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 px-5 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg shadow-md flex items-center justify-center gap-2 group text-sm"
								>
									<ShieldCheck className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
									Change Password
								</button>
							</div>
						) : (
							<form onSubmit={handleChangePassword} className="space-y-4">
								<div className="text-center">
									<h4 className="text-lg font-bold text-white">Change Password</h4>
									<p className="text-neutral-400 text-xs mt-1">
										Enter current password and choose a new one
									</p>
								</div>

								<div className="space-y-3">
									<div>
										<label htmlFor="current-password" className="block text-xs font-semibold text-neutral-300 mb-1 pl-1">
											Current Password
										</label>
										<input
											id="current-password"
											type="password"
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											className="w-full p-3 bg-neutral-950 border border-white/10 rounded-xl text-white outline-none transition-all duration-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
											placeholder="Current password"
											required
											disabled={isChangingPasswordLoading}
										/>
									</div>
									<div>
										<label htmlFor="change-new-password" className="block text-xs font-semibold text-neutral-300 mb-1 pl-1">
											New Password
										</label>
										<input
											id="change-new-password"
											type="password"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											className="w-full p-3 bg-neutral-950 border border-white/10 rounded-xl text-white outline-none transition-all duration-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
											placeholder="Minimum 6 characters"
											required
											minLength={6}
											disabled={isChangingPasswordLoading}
										/>
									</div>
									<div>
										<label
											htmlFor="change-confirm-password"
											className="block text-xs font-semibold text-neutral-300 mb-1 pl-1"
										>
											Confirm Password
										</label>
										<input
											id="change-confirm-password"
											type="password"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="w-full p-3 bg-neutral-950 border border-white/10 rounded-xl text-white outline-none transition-all duration-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm"
											placeholder="Confirm new password"
											required
											minLength={6}
											disabled={isChangingPasswordLoading}
										/>
									</div>
								</div>

								<div className="flex gap-2 pt-2">
									<button
										type="submit"
										disabled={isChangingPasswordLoading}
										className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs"
									>
										{isChangingPasswordLoading ? (
											<>
												<RotateCw className="w-4 h-4 animate-spin" />
												Changing...
											</>
										) : (
											<>
												<ShieldCheck className="w-4 h-4" />
												Save
											</>
										)}
									</button>
									<button
										type="button"
										onClick={handleCancelPasswordChange}
										disabled={isChangingPasswordLoading}
										className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs"
									>
										<XCircle className="w-4 h-4" />
										Cancel
									</button>
								</div>
							</form>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
