"use client";

import { Plus, X, User, Calculator } from "lucide-react";

import RenderModal from "@/components/modal/RenderModal";
import ProfileDrawer from "@/components/ProfileDrawer";
import UpdateSubjectModal from "@/components/GpaCalculator/UpdateSubjectModal";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import ShareModal, { ShareItem } from "@/components/modal/ShareModal";
import ConfirmModal from "@/components/modal/ConfirmModal";
import SubjectForm from "@/components/GpaCalculator/SubjectForm";
import SemesterList from "@/components/GpaCalculator/SemesterList";
import { useAuth } from "@/firebase/AuthContext";
import { calculateCGPA, calculateGPA } from "@/utils/gpaUtils";
import { useGpaCalculator } from "@/components/GpaCalculator/hooks/useGpaCalculator";

export default function GpaCalculatorView() {
	const { currentUser } = useAuth();
	const {
		// Data from useGpaData
		allProfiles, activeProfile, currentProfile, semesters,
		loading, saving, sharedProfiles, mySharedProfiles, isReadOnlyProfile,
		createProfile, deleteProfile, unshareProfile, copySharedProfile, verifyUMS,
		// Drawer
		drawerOpen, setDrawerOpen, toggleDrawer, handleUpdateActiveProfile,
		// Info modal
		isModalOpen, modalType, handleModalToggle, handleModalClose,
		// Edit-subject modal
		isUpdateModalOpen, setIsUpdateModalOpen,
		// Share modal
		isShareModalOpen, setIsShareModalOpen, profileToShare, setProfileToShare,
		handleShareProfile, handleShareWithUser,
		// Semester delete confirm
		showDeleteConfirm, semesterToDelete,
		handleDeleteSemesterClick, handleConfirmDeleteSemester, handleCancelDeleteSemester,
		// Subject form
		newSubject, setNewSubject, editIndex, activeSemester, setActiveSemester,
		handleInputChange, addOrUpdateSubject, editSubject, deleteSubject,
		// Semester actions
		addSemester,
	} = useGpaCalculator();

	if (!currentUser) {
		return <LoginRecommendation feature="GPA Calculator" />;
	}

	if (loading) {
		return (
			<div className="w-full flex flex-col items-center justify-center gap-5 py-20 text-white">
				<div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin"></div>
				<p className="text-xl font-medium text-muted-foreground">Loading your GPA data...</p>
			</div>
		);
	}

	return (
		<>
			{/* Overlays & Modals */}
			<ProfileDrawer
				isOpen={drawerOpen}
				onClose={() => setDrawerOpen(false)}
				profiles={allProfiles}
				currentProfile={activeProfile}
				onProfileSelect={handleUpdateActiveProfile}
				onCreateProfile={createProfile}
				onDeleteProfile={deleteProfile}
				onShareProfile={handleShareProfile}
				onUnshareProfile={unshareProfile}
				onCopySharedProfile={copySharedProfile}
				onVerifyUMS={verifyUMS}
				sharedProfiles={sharedProfiles}
				mySharedProfiles={mySharedProfiles}
				isLoading={saving}
				currentUser={currentUser}
			/>

			<ShareModal
				isOpen={isShareModalOpen}
				onClose={() => {
					setIsShareModalOpen(false);
					setTimeout(() => setProfileToShare(null), 300);
				}}
				onShareWithUser={handleShareWithUser}
				profileName={profileToShare?.name || ""}
				currentShares={(mySharedProfiles as (ShareItem & { profileId: string | number })[]).filter((share) => share.profileId === profileToShare?.id)}
			/>

			<RenderModal modalType={modalType} isModalOpen={isModalOpen} onClose={handleModalClose} />

			<UpdateSubjectModal
				isOpen={isUpdateModalOpen}
				onClose={() => {
					setIsUpdateModalOpen(false);
					setNewSubject({ subjectName: "", grade: "", credit: "" });
				}}
				onUpdate={addOrUpdateSubject}
				subject={newSubject}
				setSubject={setNewSubject}
				isReadOnly={isReadOnlyProfile}
				onInfoClick={handleModalToggle}
			/>

			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={handleCancelDeleteSemester}
				onConfirm={handleConfirmDeleteSemester}
				title="Delete Semester"
				message={
					semesterToDelete
						? `Are you sure you want to delete "${semesterToDelete.name}"? This action cannot be undone and will permanently remove all subjects in this semester.`
						: "Are you sure you want to delete this semester?"
				}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
			/>

			{/* Page Content */}
			<div className="w-full font-sans bg-transparent flex flex-col items-center justify-start text-center transition-all duration-300 px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto pb-10">
				{/* Header */}
				<div className="w-full text-left mb-8 flex items-center gap-4">
					<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
						<Calculator className="w-6 h-6" />
					</div>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">GPA Calculator</h1>
						<p className="text-sm text-muted-foreground mt-1">Calculate your semester GPA and cumulative CGPA</p>
					</div>
				</div>

				{/* Profile Selector */}
				<div className="mb-6 md:mb-8 flex items-center justify-center gap-4">
					<div
						className="flex items-center gap-3 px-4 md:px-6 py-3 bg-neutral-900/80 backdrop-blur-md rounded-2xl text-white/95 font-semibold text-base md:text-lg shadow-glow border border-white/10 cursor-pointer transition-all duration-300 relative overflow-hidden min-w-[160px] md:min-w-[180px] justify-center hover:bg-neutral-900 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-glow active:translate-y-0 active:scale-[1.01] before:absolute before:top-0 before:-left-full before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-all before:duration-500 hover:before:left-full"
						onClick={toggleDrawer}
					>
						<User className="w-5 h-5 md:w-6 md:h-6 text-primary drop-shadow-accent-glow transition-all duration-300 hover:text-primary-dark hover:scale-110" />
						<span className="bg-gradient-to-br from-white/95 to-white/80 bg-clip-text text-transparent drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] truncate max-w-[200px]">
							{currentProfile?.name}
						</span>
					</div>
				</div>

				{/* CGPA Display */}
				<div className="flex flex-col lg:flex-row justify-center items-center gap-6 lg:gap-12 mb-8 md:mb-10 p-5 md:p-8 w-full max-w-4xl bg-neutral-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
					<div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

					<div className="flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-primary shadow-glow relative group cursor-pointer transition-transform hover:scale-105 z-10">
						<div className="text-2xl md:text-3xl font-bold text-white leading-none">{calculateCGPA(semesters)}</div>
						<div className="text-xs md:text-sm text-white/90 mt-1">Cumulative GPA</div>
					</div>

					<div className="flex flex-row gap-3 sm:gap-8 flex-wrap justify-center z-10">
						{[
							{ label: "Semesters", value: semesters.length },
							{ label: "Subjects", value: semesters.reduce((acc, s) => acc + (s.subjects?.length || 0), 0) },
							{
								label: "Credits",
								value: semesters.reduce(
									(acc, s) => acc + (s.subjects?.reduce((subAcc, sub) => subAcc + (sub.credit || 0), 0) || 0),
									0
								),
							},
						].map(({ label, value }) => (
							<div key={label} className="flex flex-col items-center p-3 md:p-4 bg-white/5 rounded-2xl min-w-[70px] md:min-w-[85px] backdrop-blur-md border border-white/10">
								<span className="text-xl md:text-2xl font-bold text-white/90 leading-none">{value}</span>
								<span className="text-xs md:text-sm text-muted-foreground mt-1 text-center">{label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Save Status */}
				{saving && (
					<div className="w-full max-w-4xl mb-5 flex justify-center animate-in fade-in">
						<div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 border border-primary/30 text-primary">
							<div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
							<span>Saving...</span>
						</div>
					</div>
				)}

				{/* Semester Management */}
				<div className="mb-8 md:mb-10 w-full max-w-4xl text-left">
					<div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
						<h2 className="text-xl md:text-2xl font-semibold text-white/90">
							{isReadOnlyProfile ? "View Semesters" : "Manage Semesters"}
						</h2>
						<button
							className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-success to-emerald-600 text-white border-none rounded-xl text-sm md:text-base font-semibold cursor-pointer transition-all duration-300 shadow-lg shadow-success/20 uppercase tracking-wide hover:-translate-y-0.5 hover:shadow-success/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none w-full sm:w-auto justify-center"
							onClick={addSemester}
							disabled={isReadOnlyProfile}
						>
							<Plus className="w-5 h-5" />
							{isReadOnlyProfile ? "Read-Only Profile" : "Add Semester"}
						</button>
					</div>

					{/* Semester Tabs */}
					{semesters.length > 0 && (
						<div className="flex gap-3 md:gap-4 mb-4 md:mb-8 overflow-x-auto py-2 w-full justify-start md:flex-wrap no-scrollbar">
							{semesters.map((semester) => (
								<div
									key={semester.id}
									className={`flex flex-col items-center px-4 md:px-5 py-3 bg-white/5 backdrop-blur-md rounded-2xl cursor-pointer transition-all duration-300 border-2 relative min-w-[125px] flex-shrink-0 group ${
										activeSemester === semester.id
											? "bg-gradient-primary border-primary text-white shadow-glow scale-105"
											: "border-white/10 hover:bg-white/10 hover:-translate-y-0.5"
									}`}
									onClick={() => setActiveSemester(semester.id)}
								>
									<span className={`text-sm md:text-base font-semibold mb-1 ${activeSemester === semester.id ? "text-white" : "text-white/90"}`}>
										{semester.name}
									</span>
									<span className={`text-xs md:text-sm ${activeSemester === semester.id ? "text-white/90" : "text-muted-foreground"}`}>
										GPA: {calculateGPA(semester.subjects)}
									</span>
									<button
										className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-destructive text-white border-none rounded-full cursor-pointer flex items-center justify-center text-xs transition-all duration-300 shadow-md hover:bg-red-600 hover:scale-110 ${
											activeSemester === semester.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
										}`}
										onClick={(e) => {
											e.stopPropagation();
											handleDeleteSemesterClick(semester.id, semester.name);
										}}
										disabled={isReadOnlyProfile}
										title={isReadOnlyProfile ? "Read-only profile" : "Delete semester"}
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Subject Form */}
				<SubjectForm
					activeSemester={activeSemester}
					activeSemesterName={semesters.find((s) => s.id === activeSemester)?.name || ""}
					isReadOnlyProfile={isReadOnlyProfile}
					onSubmit={addOrUpdateSubject}
					formState={newSubject}
					onChange={handleInputChange}
					editIndex={editIndex === -1 ? -1 : typeof editIndex === "string" ? parseInt(editIndex) : editIndex}
					onInfoClick={handleModalToggle}
				/>

				{/* Semester Content */}
				<SemesterList
					semesters={semesters}
					activeSemester={activeSemester}
					isReadOnlyProfile={isReadOnlyProfile}
					onEditSubject={editSubject}
					onDeleteSubject={deleteSubject}
					onAddSemesterClick={addSemester}
				/>
			</div>
		</>
	);
}
