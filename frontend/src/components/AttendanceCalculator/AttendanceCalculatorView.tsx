"use client";

import { ClipboardList, Settings } from "lucide-react";
import { useState } from "react";
import LoginRecommendation from "@/components/common/LoginRecommendation";
import ConfirmModal from "@/components/modal/ConfirmModal";
import AttendanceSubjectForm from "./AttendanceSubjectForm";
import AttendanceSubjectList from "./AttendanceSubjectList";
import { useAttendanceCalculator } from "./hooks/useAttendanceCalculator";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/hooks/GpaDataContext";

export default function AttendanceCalculatorView() {
	const { currentUser } = useAuth();
	const { loading: gpaLoading } = useGpaData();

	const {
		loading,
		saving,
		subjects,
		defaultThreshold,
		overallAttendance,
		form,
		editingId,
		handleFormChange,
		handleSubmit,
		startEdit,
		cancelEdit,
		showDeleteConfirm,
		subjectToDelete,
		handleDeleteClick,
		handleConfirmDelete,
		handleCancelDelete,
		thresholdInput,
		setThresholdInput,
		handleUpdateThreshold,
	} = useAttendanceCalculator();

	const [showThresholdForm, setShowThresholdForm] = useState(false);

	if (!currentUser) {
		return <LoginRecommendation feature="Attendance Calculator" />;
	}

	if (gpaLoading) {
		return (
			<div className="w-full flex flex-col items-center justify-center gap-5 py-20 text-white">
				<div className="w-12 h-12 border-3 border-white/20 border-t-primary rounded-full animate-spin" />
				<p className="text-xl font-medium text-muted-foreground">Loading your data...</p>
			</div>
		);
	}

	const belowThresholdCount = subjects.filter((s) => {
		const pct = s.totalClasses > 0 ? (s.attended / s.totalClasses) * 100 : 0;
		return pct < (s.threshold ?? defaultThreshold);
	}).length;

	return (
		<>
			{/* Delete Confirm */}
			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={handleCancelDelete}
				onConfirm={handleConfirmDelete}
				title="Delete Subject"
				message={
					subjectToDelete
						? `Are you sure you want to delete "${subjectToDelete.name}"?`
						: "Are you sure you want to delete this subject?"
				}
				confirmText="Delete"
				cancelText="Cancel"
				type="danger"
			/>

			{/* Page Content */}
			<div className="w-full font-sans bg-transparent flex flex-col justify-start text-center transition-all duration-300 px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto pb-10">
				{/* Header */}
				<div className="w-full text-left mb-8 flex items-center gap-4">
					<div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
						<ClipboardList className="w-6 h-6" />
					</div>
					<div>
						<h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
							Attendance Calculator
						</h1>
						<p className="text-sm text-muted-foreground mt-1">
							Track your class attendance and see how many classes you can skip or need to attend
						</p>
					</div>
				</div>

				{/* Summary Card */}
				<div className="flex flex-col lg:flex-row justify-center items-center gap-6 lg:gap-12 mb-8 md:mb-10 p-5 md:p-8 w-full max-w-4xl bg-neutral-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
					<div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
					<div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

					{/* Overall % circle */}
					<div
						className={`flex flex-col items-center justify-center w-28 h-28 md:w-32 md:h-32 rounded-full relative z-10 shadow-glow transition-transform hover:scale-105 ${
							overallAttendance === null
								? "bg-white/10 border border-white/20"
								: overallAttendance < defaultThreshold
									? "bg-gradient-to-br from-red-500 to-orange-600"
									: "bg-gradient-primary"
						}`}
					>
						{overallAttendance !== null ? (
							<>
								<div className="text-2xl md:text-3xl font-bold text-white leading-none">
									{overallAttendance}%
								</div>
								<div className="text-xs text-white/90 mt-1">Overall</div>
							</>
						) : (
							<>
								<div className="text-lg font-bold text-white/50 leading-none">—</div>
								<div className="text-xs text-white/40 mt-1">No data</div>
							</>
						)}
					</div>

					{/* Stats */}
					<div className="flex flex-row gap-3 sm:gap-8 flex-wrap justify-center z-10">
						{[
							{ label: "Subjects", value: subjects.length },
							{
								label: "Below Threshold",
								value: belowThresholdCount,
								highlight: belowThresholdCount > 0,
							},
							{ label: "Default Threshold", value: `${defaultThreshold}%` },
						].map(({ label, value, highlight }) => (
							<div
								key={label}
								className="flex flex-col items-center p-3 md:p-4 bg-white/5 rounded-2xl min-w-[85px] md:min-w-[100px] backdrop-blur-md border border-white/10"
							>
								<span
									className={`text-xl md:text-2xl font-bold leading-none ${highlight ? "text-red-400" : "text-white/90"}`}
								>
									{value}
								</span>
								<span className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
									{label}
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Save Status */}
				{saving && (
					<div className="w-full max-w-4xl mb-5 flex justify-center animate-in fade-in">
						<div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 border border-primary/30 text-primary">
							<div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
							<span>Saving...</span>
						</div>
					</div>
				)}

				{/* Manage section */}
				<div className="mb-8 md:mb-10 w-full max-w-4xl text-left">
					<div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
						<h2 className="text-xl md:text-2xl font-semibold text-white/90">Manage Attendance</h2>
						<button
							onClick={() => setShowThresholdForm((v) => !v)}
							className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-300"
						>
							<Settings className="w-4 h-4" />
							Set Default Threshold
						</button>
					</div>

					{/* Threshold setter */}
					{showThresholdForm && (
						<form
							onSubmit={handleUpdateThreshold}
							className="mb-6 flex items-end gap-3 p-4 bg-neutral-900/60 rounded-2xl border border-white/10"
						>
							<div className="flex flex-col gap-1.5">
								<label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
									Default Threshold (%)
								</label>
								<input
									type="number"
									min="0"
									max="100"
									placeholder={String(defaultThreshold)}
									value={thresholdInput}
									onChange={(e) => setThresholdInput(e.target.value)}
									className="px-4 py-2.5 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 w-40"
								/>
							</div>
							<button
								type="submit"
								className="px-4 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02]"
							>
								Update
							</button>
							<button
								type="button"
								onClick={() => {
									setShowThresholdForm(false);
									setThresholdInput("");
								}}
								className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider"
							>
								Cancel
							</button>
						</form>
					)}
				</div>

				{/* Add/Edit Form */}
				<AttendanceSubjectForm
					form={form}
					editingId={editingId}
					onChange={handleFormChange}
					onSubmit={handleSubmit}
					onCancel={cancelEdit}
				/>

				{/* Subject List */}
				{loading ? (
					<div className="w-full max-w-4xl flex items-center justify-center py-12">
						<div className="w-8 h-8 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
					</div>
				) : (
					<AttendanceSubjectList
						subjects={subjects}
						defaultThreshold={defaultThreshold}
						onEdit={startEdit}
						onDelete={handleDeleteClick}
					/>
				)}
			</div>
		</>
	);
}
