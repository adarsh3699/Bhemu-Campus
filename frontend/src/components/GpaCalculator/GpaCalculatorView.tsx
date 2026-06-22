"use client";

import { Plus, X, Calculator, BarChart2 } from "lucide-react";

import RenderModal from "@/components/modal/RenderModal";
import UpdateSubjectModal from "@/components/GpaCalculator/UpdateSubjectModal";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import ConfirmModal from "@/components/modal/ConfirmModal";
import SubjectForm from "@/components/GpaCalculator/SubjectForm";
import SemesterList from "@/components/GpaCalculator/SemesterList";
import MarksViewPanel from "@/components/GpaCalculator/MarksViewPanel";
import { useAuth } from "@/firebase/AuthContext";
import { calculateCGPA, calculateGPA } from "@/lib/gpaUtils";
import { useGpaCalculator } from "@/components/GpaCalculator/hooks/useGpaCalculator";

export default function GpaCalculatorView() {
	const { currentUser } = useAuth();
	const {
		// Data from useGpaData
		semesters,
		loading,
		saving,
		isReadOnlyProfile,
		// View mode
		viewMode,
		setViewMode,
		// Marks panel
		marksSubjects,
		marksEditingSubjectId,
		marksForm,
		handleMarksFormChange,
		handleMarksSave,
		handleMarksEdit,
		handleMarksCancel,
		handleDeleteSubjectFromMarks,
		marksShowSubjectForm,
		marksSetShowSubjectForm,
		marksSubjectForm,
		handleMarksSubjectFormChange,
		handleMarksAddSubject,
		// Info modal
		isModalOpen,
		modalType,
		handleModalToggle,
		handleModalClose,
		// Edit-subject modal
		isUpdateModalOpen,
		setIsUpdateModalOpen,
		// Semester delete confirm
		showDeleteConfirm,
		semesterToDelete,
		handleDeleteSemesterClick,
		handleConfirmDeleteSemester,
		handleCancelDeleteSemester,
		// Subject form
		newSubject,
		setNewSubject,
		activeSemester,
		setActiveSemester,
		handleInputChange,
		addOrUpdateSubject,
		editSubject,
		deleteSubject,
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
			<div className="w-full font-sans bg-transparent flex flex-col items-center justify-start transition-all duration-300 px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto pb-10">
				{/* Header */}
				<div className="w-full text-left mb-6 md:mb-14 flex items-center gap-4">
					<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
						<Calculator className="w-6 h-6" />
					</div>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">GPA Calculator</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Calculate your semester GPA and cumulative CGPA
						</p>
					</div>
				</div>

				{/* CGPA Display */}
				<div className="w-full max-w-4xl mb-8 md:mb-10 px-5 md:px-6 py-4 md:py-5 bg-neutral-900/60 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
					{/* CGPA */}
					<div className="flex flex-col items-center sm:items-start shrink-0">
						<span className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent leading-none">
							{calculateCGPA(semesters)}
						</span>
						<span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
							Cumulative GPA
						</span>
					</div>

					<div className="hidden sm:block w-px self-stretch bg-white/10 mx-1" />
					<div className="block sm:hidden h-px w-full bg-white/10" />

					{/* Stats */}
					<div className="flex flex-row gap-5 justify-center sm:justify-start">
						{[
							{ label: "Semesters", value: semesters.length },
							{
								label: "Subjects",
								value: semesters.reduce((acc, s) => acc + (s.subjects?.length || 0), 0),
							},
							{
								label: "Credits",
								value: semesters.reduce(
									(acc, s) =>
										acc + (s.subjects?.reduce((subAcc, sub) => subAcc + (sub.credit || 0), 0) || 0),
									0
								),
							},
							{
								label: "Avg. Marks",
								value: (() => {
									const all = semesters
										.flatMap((s) => s.subjects ?? [])
										.filter((sub) => sub.marks?.total != null);
									return all.length > 0
										? Math.round(
												(all.reduce((acc, sub) => acc + (sub.marks!.total ?? 0), 0) /
													all.length) *
													10
											) / 10
										: "—";
								})(),
							},
						].map(({ label, value }) => (
							<div key={label} className="flex flex-col items-center">
								<span className="text-2xl md:text-3xl font-bold text-white leading-none">{value}</span>
								<span className="text-xs md:text-sm text-muted-foreground mt-1">{label}</span>
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
				<div className="w-full max-w-4xl text-left">
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
						<div className="flex gap-3 md:gap-4 mb-4 md:mb-8 overflow-x-auto p-2 box-border w-full justify-start md:flex-wrap no-scrollbar">
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
									<span
										className={`text-sm md:text-base font-semibold mb-1 ${activeSemester === semester.id ? "text-white" : "text-white/90"}`}
									>
										{semester.name}
									</span>
									<span
										className={`text-xs md:text-sm ${activeSemester === semester.id ? "text-white/90" : "text-muted-foreground"}`}
									>
										GPA: {calculateGPA(semester.subjects)}
									</span>
									<button
										className={`absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-destructive text-white border-none rounded-full cursor-pointer flex items-center justify-center text-xs transition-all duration-300 shadow-md hover:bg-red-600 hover:scale-110 ${
											activeSemester === semester.id
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100"
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

				{/* View Mode Toggle */}
				{semesters.length > 0 && (
					<div className="w-full max-w-4xl flex justify-end mb-6">
						<div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
							<button
								onClick={() => setViewMode("marks")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
									viewMode === "marks"
										? "bg-teal-500/80 text-white shadow-sm"
										: "text-neutral-400 hover:text-white"
								}`}
							>
								<BarChart2 className="w-3.5 h-3.5" /> Marks
							</button>
							<button
								onClick={() => setViewMode("gpa")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
									viewMode === "gpa"
										? "bg-primary text-white shadow-sm"
										: "text-neutral-400 hover:text-white"
								}`}
							>
								<Calculator className="w-3.5 h-3.5" /> Grades
							</button>
						</div>
					</div>
				)}

				{/* Subject Form — GPA view only */}
				{viewMode === "gpa" && (
					<SubjectForm
						activeSemester={activeSemester}
						activeSemesterName={semesters.find((s) => s.id === activeSemester)?.name || ""}
						isReadOnlyProfile={isReadOnlyProfile}
						onSubmit={addOrUpdateSubject}
						formState={newSubject}
						onChange={handleInputChange}
						onInfoClick={handleModalToggle}
					/>
				)}

				{/* Semester Content */}
				{viewMode === "gpa" ? (
					<SemesterList
						semesters={semesters}
						activeSemester={activeSemester}
						isReadOnlyProfile={isReadOnlyProfile}
						onEditSubject={editSubject}
						onDeleteSubject={deleteSubject}
						onAddSemesterClick={addSemester}
					/>
				) : (
					<MarksViewPanel
						subjects={marksSubjects}
						editingSubjectId={marksEditingSubjectId}
						form={marksForm}
						onFormChange={handleMarksFormChange}
						onEdit={handleMarksEdit}
						onSave={handleMarksSave}
						onCancel={handleMarksCancel}
						onDeleteSubject={handleDeleteSubjectFromMarks}
						showSubjectForm={marksShowSubjectForm}
						setShowSubjectForm={marksSetShowSubjectForm}
						subjectForm={marksSubjectForm}
						onSubjectFormChange={handleMarksSubjectFormChange}
						onAddSubject={handleMarksAddSubject}
					/>
				)}
			</div>
		</>
	);
}
