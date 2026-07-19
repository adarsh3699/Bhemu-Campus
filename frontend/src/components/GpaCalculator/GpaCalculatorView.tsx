"use client";

import { Calculator, BarChart2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

import RenderModal from "@/components/modal/RenderModal";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import ConfirmModal from "@/components/modal/ConfirmModal";
import AddSubjectForm from "@/components/GpaCalculator/AddSubjectForm";
import SemesterPanel from "@/components/GpaCalculator/SemesterPanel";
import GpaStatsBar from "@/components/GpaCalculator/GpaStatsBar";
import SemesterTabs from "@/components/GpaCalculator/SemesterTabs";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/hooks/GpaDataContext";
import { useMarksAnalysis } from "@/components/GpaCalculator/hooks/useMarksAnalysis";
import { useGpaCalculator } from "@/components/GpaCalculator/hooks/useGpaCalculator";

export default function GpaCalculatorView() {
	const { currentUser } = useAuth();
	const { semesters, loading, isReadOnlyProfile } = useGpaData();
	const marksAnalysis = useMarksAnalysis();
	const {
		viewMode, setViewMode,
		activeSemester, setActiveSemester,
		addSemesterLoading, addSubjectLoading,
		addSemester,
		handleDeleteSemesterClick, handleConfirmDeleteSemester, handleCancelDeleteSemester,
		showDeleteConfirm, semesterToDelete,
		gradesForm, handleGradesFormChange, addOrUpdateSubject,
		gradesEditingSubjectId, editSubject, saveGradesSubject, cancelGradesEdit, deleteSubject,
		handleMarksAddSubject,
		confirmSubjectDelete, handleConfirmDeleteSubject, handleCancelDeleteSubject,
		showSubjectDeleteConfirm, subjectToDelete,
		isModalOpen, modalType, handleModalToggle, handleModalClose,
	} = useGpaCalculator(marksAnalysis);

	if (!currentUser) return <LoginRecommendation feature="GPA Calculator" />;

	if (loading) {
		return (
			<div className="w-full flex flex-col items-center justify-center gap-5 py-20 text-white">
				<div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
				<p className="text-xl font-medium text-muted-foreground">Loading your GPA data...</p>
			</div>
		);
	}

	const activeSemesterName = semesters.find((s) => s.id === activeSemester)?.name ?? "";
	const activeSubjects = marksAnalysis.subjects; // from MarksDataContext (active semester)

	return (
		<>
			<RenderModal modalType={modalType} isModalOpen={isModalOpen} onClose={handleModalClose} />

			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={handleCancelDeleteSemester}
				onConfirm={handleConfirmDeleteSemester}
				title="Delete Semester"
				message={semesterToDelete
					? `Are you sure you want to delete "${semesterToDelete.name}"? This will permanently remove all subjects.`
					: "Are you sure you want to delete this semester?"}
				confirmText="Delete" cancelText="Cancel" type="danger"
			/>
			<ConfirmModal
				isOpen={showSubjectDeleteConfirm}
				onClose={handleCancelDeleteSubject}
				onConfirm={handleConfirmDeleteSubject}
				title="Delete Subject"
				message={subjectToDelete
					? `Are you sure you want to delete "${subjectToDelete.subjectName}"? This cannot be undone.`
					: "Are you sure you want to delete this subject?"}
				confirmText="Delete" cancelText="Cancel" type="danger"
			/>

			<div className="w-full font-sans bg-transparent flex flex-col items-center justify-start transition-all duration-300 px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto pb-10">
				<PageHeader
					icon={Calculator}
					title="GPA Calculator"
					description="Calculate your semester GPA and cumulative CGPA"
					className="mb-6 md:mb-14"
				/>

				<GpaStatsBar semesters={semesters} />

				<SemesterTabs
					semesters={semesters}
					activeSemester={activeSemester}
					isReadOnly={isReadOnlyProfile}
					addSemesterLoading={addSemesterLoading}
					onSelectSemester={setActiveSemester}
					onAddSemester={addSemester}
					onDeleteSemester={handleDeleteSemesterClick}
				/>

				{/* View Mode Toggle */}
				{semesters.length > 0 && (
					<div className="w-full max-w-4xl flex justify-end mb-6">
						<div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
							<button
								onClick={() => setViewMode("marks")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${viewMode === "marks" ? "bg-teal-500/80 text-white shadow-sm" : "text-neutral-400 hover:text-white"}`}
							>
								<BarChart2 className="w-3.5 h-3.5" /> Marks
							</button>
							<button
								onClick={() => setViewMode("gpa")}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${viewMode === "gpa" ? "bg-primary text-white shadow-sm" : "text-neutral-400 hover:text-white"}`}
							>
								<Calculator className="w-3.5 h-3.5" /> Grades
							</button>
						</div>
					</div>
				)}

				{/* Add Subject Form */}
				{activeSemester && (
					<div className="w-full max-w-4xl">
						<AddSubjectForm
							mode={viewMode === "gpa" ? "grades" : "marks"}
							semesterName={activeSemesterName}
							isReadOnly={isReadOnlyProfile}
							formState={viewMode === "gpa" ? gradesForm : {
								subjectName: marksAnalysis.subjectForm.subjectName,
								credit: marksAnalysis.subjectForm.credit,
								grade: "",
								ca: marksAnalysis.subjectForm.ca,
								midTerm: marksAnalysis.subjectForm.midTerm,
								endTerm: marksAnalysis.subjectForm.endTerm,
								attendanceMarks: marksAnalysis.subjectForm.attendanceMarks,
							}}
							onChange={viewMode === "gpa" ? handleGradesFormChange : marksAnalysis.handleSubjectFormChange}
							onSubmit={viewMode === "gpa" ? addOrUpdateSubject : handleMarksAddSubject}
							saving={addSubjectLoading}
							onInfoClick={viewMode === "gpa" ? handleModalToggle : undefined}
						/>
					</div>
				)}

				{/* Semester content */}
				{activeSemester && (
					<SemesterPanel
						mode={viewMode === "gpa" ? "grades" : "marks"}
						semesterName={activeSemesterName}
						subjects={activeSubjects}
						editingSubjectId={viewMode === "gpa" ? gradesEditingSubjectId : marksAnalysis.editingSubjectId}
						editFormState={viewMode === "gpa" ? gradesForm : marksAnalysis.form}
						onFormChange={viewMode === "gpa" ? handleGradesFormChange : marksAnalysis.handleFormChange}
						onEdit={viewMode === "gpa" ? editSubject : marksAnalysis.startEdit}
						onSave={viewMode === "gpa"
							? (id) => saveGradesSubject(id)
							: marksAnalysis.handleSubmit}
						onCancel={viewMode === "gpa" ? cancelGradesEdit : marksAnalysis.cancelEdit}
						onDelete={(id) => {
							const sub = activeSubjects.find((s) => String(s.id) === String(id));
							confirmSubjectDelete(sub?.subjectName ?? "this subject", () => {
								if (viewMode === "gpa") {
									if (activeSemester) deleteSubject(activeSemester, id);
								} else {
									marksAnalysis.deleteSubject(id);
								}
							});
						}}
						isReadOnly={isReadOnlyProfile}
					/>
				)}

				{/* Empty state */}
				{semesters.length === 0 && (
					<div className="text-center py-16 text-neutral-400">
						<h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
							No semesters added yet
						</h3>
						<p className="text-sm text-neutral-500">Click &quot;Add Semester&quot; to get started!</p>
					</div>
				)}
			</div>
		</>
	);
}
