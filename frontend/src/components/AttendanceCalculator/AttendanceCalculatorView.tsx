"use client";

import { ClipboardList, X } from "lucide-react";
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

			<div className="w-full font-sans bg-transparent flex flex-col items-center justify-start transition-all duration-300 px-4 py-8 md:px-8 md:py-10 max-w-6xl mx-auto pb-10">
				{/* Header */}
				<div className="w-full text-left mb-6 md:mb-14 flex items-center gap-4">
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

				{/* Summary card */}
				<div className="w-full max-w-4xl mb-8 md:mb-10 px-5 md:px-6 py-4 md:py-5 bg-neutral-900/60 rounded-2xl border border-white/10">
					{/* Top row: overall % + stats */}
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
						{/* Overall % */}
						<div className="flex flex-col items-center sm:items-start shrink-0">
							<span
								className={`text-4xl md:text-5xl font-black leading-none ${
									overallAttendance === null
										? "text-white/30"
										: overallAttendance < 75
											? "text-red-400"
											: overallAttendance < defaultThreshold
												? "text-amber-400"
												: "bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent"
								}`}
							>
								{overallAttendance !== null ? `${overallAttendance}%` : "—"}
							</span>
							<span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-semibold">
								Overall
							</span>
						</div>

						<div className="hidden sm:block w-px self-stretch bg-white/10 mx-1" />
						<div className="block sm:hidden h-px w-full bg-white/10" />

						{/* Stats + threshold button inline on desktop */}
						<div className="flex flex-row gap-5 justify-center sm:justify-start flex-1 flex-wrap items-center">
							{[
								{ label: "Subjects", value: subjects.length },
								{ label: "Below Threshold", value: belowThresholdCount, red: belowThresholdCount > 0 },
								{ label: "Default Threshold", value: `${defaultThreshold}%` },
							].map(({ label, value, red }) => (
								<div key={label} className="flex flex-col items-center">
									<span
										className={`text-2xl md:text-3xl font-bold leading-none ${red ? "text-red-400" : "text-white"}`}
									>
										{value}
									</span>
									<span className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
										{label}
									</span>
								</div>
							))}

							{/* Threshold setter */}
							<div className="sm:ml-auto shrink-0 mt-2 sm:mt-0">
								{showThresholdForm ? (
									<form
										onSubmit={(e) => {
											handleUpdateThreshold(e);
											setShowThresholdForm(false);
										}}
										className="flex items-center gap-2"
									>
										<div className="relative">
											<input
												type="number"
												min="0"
												max="100"
												placeholder={String(defaultThreshold)}
												value={thresholdInput}
												onChange={(e) => setThresholdInput(e.target.value)}
												className="h-9 w-20 pl-3 pr-6 border border-white/10 rounded-xl bg-white/5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											/>
											<span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
										</div>
										<button
											type="submit"
											className="h-9 px-3 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200"
										>
											Set
										</button>
										<button
											type="button"
											onClick={() => {
												setShowThresholdForm(false);
												setThresholdInput("");
											}}
											className="h-9 w-9 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 rounded-xl transition-all duration-200 flex items-center justify-center"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									</form>
								) : (
									<button
										onClick={() => {
											setShowThresholdForm(true);
											setThresholdInput(String(defaultThreshold));
										}}
										className="h-9 px-3 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-200 border border-white/10 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200"
									>
										Set Threshold
									</button>
								)}
							</div>
						</div>
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

				{/* Add / Edit Form */}
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
