"use client";

import React, { useCallback } from "react";
import ConfirmModal from "@/components/modal/ConfirmModal";
import BaseModal from "@/components/modal/BaseModal";
import { AlertTriangle, XCircle, Trash2, RotateCw } from "lucide-react";
import { useProfileData } from "@/hooks/useProfileData";
import ProfileHeader from "@/components/Settings/ProfileHeader";
import AccountInfo from "@/components/Settings/AccountInfo";
import SecuritySection from "@/components/Settings/SecuritySection";
import DangerZone from "@/components/Settings/DangerZone";
import LoginRecommendation from "@/components/common/LoginRecommendation";

export default function ProfileView() {
	const {
		// Data
		currentUser,
		isGoogleUser,
		hasPassword,

		// Name State
		isEditingName,
		setIsEditingName,
		newDisplayName,
		setNewDisplayName,
		isUpdatingName,
		handleUpdateDisplayName,
		resetNameEdit,

		// Password State
		isCreatingPassword,
		setIsCreatingPassword,
		isChangingPassword,
		setIsChangingPassword,
		currentPassword,
		setCurrentPassword,
		newPassword,
		setNewPassword,
		confirmPassword,
		setConfirmPassword,
		isSettingPassword,
		isChangingPasswordLoading,
		handleCreatePassword,
		handleChangePassword,
		resetPasswordForms,

		// Deletion State
		showDeleteModal,
		setShowDeleteModal,
		showPasswordConfirmModal,
		deleteConfirmPassword,
		setDeleteConfirmPassword,
		isDeletingData,
		handleDeleteAllData,
		resetDeleteForms,
	} = useProfileData();

	// Handle password confirmation for deletion (UI handler)
	const handlePasswordConfirmDelete = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!deleteConfirmPassword.trim()) return;
			await handleDeleteAllData(deleteConfirmPassword);
		},
		[deleteConfirmPassword, handleDeleteAllData]
	);

	if (!currentUser) {
		return <LoginRecommendation feature="Profile Settings" />;
	}

	return (
		<div className="px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto">
			{/* Header */}
			<ProfileHeader />

			{/* Profile Grid: 4 col account left, 8 col settings right */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
				{/* Account Information Card */}
				<div className="lg:col-span-4">
					<AccountInfo
						currentUser={currentUser}
						isEditingName={isEditingName}
						setIsEditingName={setIsEditingName}
						newDisplayName={newDisplayName}
						setNewDisplayName={setNewDisplayName}
						isUpdatingName={isUpdatingName}
						handleUpdateDisplayName={handleUpdateDisplayName}
						handleCancelEdit={resetNameEdit}
						isGoogleUser={isGoogleUser}
					/>
				</div>

				{/* Security + Danger */}
				<div className="lg:col-span-8 flex flex-col gap-5">
					<SecuritySection
						isGoogleUser={isGoogleUser}
						hasPassword={hasPassword}
						isCreatingPassword={isCreatingPassword}
						setIsCreatingPassword={setIsCreatingPassword}
						newPassword={newPassword}
						setNewPassword={setNewPassword}
						confirmPassword={confirmPassword}
						setConfirmPassword={setConfirmPassword}
						isSettingPassword={isSettingPassword}
						handleCreatePassword={handleCreatePassword}
						handleCancelPassword={resetPasswordForms}
						isChangingPassword={isChangingPassword}
						setIsChangingPassword={setIsChangingPassword}
						currentPassword={currentPassword}
						setCurrentPassword={setCurrentPassword}
						isChangingPasswordLoading={isChangingPasswordLoading}
						handleChangePassword={handleChangePassword}
						handleCancelPasswordChange={resetPasswordForms}
					/>
					<DangerZone onShowDeleteModal={() => setShowDeleteModal(true)} isDeletingData={isDeletingData} />
				</div>
			</div>

			{/* Delete Confirmation Modal */}
			<ConfirmModal
				isOpen={showDeleteModal}
				onClose={resetDeleteForms}
				onConfirm={() => handleDeleteAllData(null, false)} // Initial no-password attempt
				title="Delete Account & All Data"
				message="Are you absolutely sure you want to delete your account and all associated data? This action cannot be undone and will permanently remove all your profiles, shared data, and account information from our servers."
				confirmText="Delete Everything"
				cancelText="Cancel"
				type="danger"
			/>

			{/* Password Confirmation Modal for Deletion */}
			<BaseModal
				isOpen={showPasswordConfirmModal}
				onClose={resetDeleteForms}
				showHeader={false}
				maxWidth="450px"
				className="bg-neutral-950 border border-white/10"
			>
				<div className="bg-gradient-to-r from-red-600 to-pink-600 p-6 text-center border-b border-white/5">
					<div className="w-16 h-16 bg-white/25 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 animate-pulse">
						<AlertTriangle className="w-8 h-8 text-white" />
					</div>
					<h3 className="text-2xl font-bold text-white">Confirm Deletion</h3>
					<p className="text-red-100 mt-2 text-sm">This action cannot be undone</p>
				</div>
				<form onSubmit={handlePasswordConfirmDelete} className="p-6 space-y-5">
					<div>
						<p className="mb-4 text-neutral-300 leading-relaxed text-center text-sm">
							Please enter your account password to authorize permanent deletion:
						</p>
						<input
							type="password"
							value={deleteConfirmPassword}
							onChange={(e) => setDeleteConfirmPassword(e.target.value)}
							placeholder="Enter your account password"
							className="w-full p-4 border border-white/10 rounded-xl bg-neutral-950 text-white transition-all duration-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 text-sm outline-none"
							required
						/>
					</div>

					{/* Google Authentication Option - Only show if user has both password and Google */}
					{isGoogleUser && hasPassword && (
						<div className="text-center">
							<div className="relative my-4">
								<div className="absolute inset-0 flex items-center">
									<div className="w-full border-t border-white/10" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-neutral-950 px-3 text-neutral-500">
										or
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => {
									resetDeleteForms();
									handleDeleteAllData(null, true); // Call with useGoogleAuth = true
								}}
								className="text-primary hover:text-primary-hover font-semibold transition-colors duration-200 underline text-sm"
							>
								Use Google Authentication instead
							</button>
						</div>
					)}

					<div className="flex gap-3 pt-2">
						<button
							type="button"
							onClick={resetDeleteForms}
							className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 text-xs border border-white/5"
						>
							<XCircle className="w-4 h-4" />
							Cancel
						</button>
						<button
							type="submit"
							className="flex-1 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs"
							disabled={!deleteConfirmPassword.trim() || isDeletingData}
						>
							{isDeletingData ? (
								<>
									<RotateCw className="w-4 h-4 animate-spin" />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="w-4 h-4" />
									Delete Account
								</>
							)}
						</button>
					</div>
				</form>
			</BaseModal>
		</div>
	);
}
