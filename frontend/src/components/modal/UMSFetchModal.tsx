"use client";

import React, { useState, useEffect } from "react";
import umsService from "@/utils/umsService";
import ConfirmModal from "./ConfirmModal";
import { useMessage } from "@/components/common/MessageProvider";
import BaseModal from "./BaseModal";
import type { UMSSemester, UMSCourse, UMSTerm, UMSData, UMSProfileData } from "@/types";

interface UMSFetchModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (data: UMSProfileData) => void;
	existingData?: unknown;
	profileName?: string;
}

const UMSFetchModal: React.FC<UMSFetchModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	existingData = null,
	profileName = "",
}) => {
	const [gaValue, setGaValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [fetchedData, setFetchedData] = useState<UMSProfileData | null>(null);
	const [error, setError] = useState("");
	const [step, setStep] = useState<"input" | "preview">("input");
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const { showMessage } = useMessage();

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			Promise.resolve().then(() => {
				setGaValue("");
				setFetchedData(null);
				setError("");
				setStep("input");
				setLoading(false);
				setShowConfirmModal(false);
			});
		}
	}, [isOpen]);

	const handleClose = () => {
		if (onClose) {
			onClose();
		}
	};

	const convertGradeToPoints = (grade: string): number => {
		const gradeMap: Record<string, number> = {
			O: 10,
			"A+": 9,
			A: 8,
			"B+": 7,
			B: 6,
			C: 5,
			D: 4,
			P: 4,
			F: 0,
			G: 0,
			E: 0,
			I: 0,
		};
		return gradeMap[grade?.toUpperCase()] || 0;
	};

	const transformUMSDataToProfile = (umsData: UMSData): UMSProfileData => {
		const { studentInfo, terms = [], summary = {}, allTermIds = {} } = umsData;

		const semesters: UMSSemester[] = terms.map((term: UMSTerm, index: number) => ({
			id: term.id || `semester_${index + 1}`,
			name: term.displayName || `Semester ${index + 1}`,
			subjects: (term.courses || []).map((course: UMSCourse, courseIndex: number) => ({
				id: `subject_${term.id}_${courseIndex}`,
				subjectName: course.courseName || course.courseCode || `Subject ${courseIndex + 1}`,
				grade: convertGradeToPoints(course.grade),
				credit: course.credits || 3,
			})),
		}));

		const validSemesters = semesters.filter((semester) => semester.subjects.length > 0);

		return {
			studentInfo: {
				vid: studentInfo?.vid || "",
				name: studentInfo?.name || "",
				program: studentInfo?.program || "",
				batchYear: studentInfo?.batchYear || "",
				cgpa: studentInfo?.cgpa || "0.00",
			},
			semesters:
				validSemesters.length > 0
					? validSemesters
					: [
							{
								id: "semester_1",
								name: "Semester 1",
								subjects: [],
							},
						],
			allTermIds: allTermIds || {},
			summary: summary || {},
			fetchedAt: new Date().toISOString(),
		};
	};

	const fetchUMSData = async () => {
		if (!gaValue.trim()) {
			setError("Please enter your UMS session cookie");
			return;
		}

		const validation = umsService.validateCookie(gaValue.trim());
		if (!validation.valid) {
			setError(validation.message);
			return;
		}

		setLoading(true);
		setError("");

		try {
			const data = await umsService.getStudentGrades(gaValue.trim());

			if (!data.success) {
				throw new Error(data.message || "Failed to fetch UMS data");
			}

			const transformedData = transformUMSDataToProfile(data.data);
			setFetchedData(transformedData);
			setStep("preview");
			showMessage("Academic grades fetched successfully!", "success");
		} catch (err) {
			console.error("Error fetching UMS data:", err);
			const errMsg = err instanceof Error ? err.message : String(err);
			setError(errMsg || "Failed to fetch data from UMS. Please check your connection and cookie value.");
			showMessage(errMsg || "Failed to fetch UMS data", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleConfirm = () => {
		if (fetchedData && onConfirm) {
			onConfirm(fetchedData);
		}
		handleClose();
	};

	const handleOverwrite = () => {
		setShowConfirmModal(true);
	};

	const handleConfirmOverwrite = () => {
		setShowConfirmModal(false);
		if (fetchedData && onConfirm) {
			onConfirm(fetchedData);
		}
		handleClose();
	};

	const renderInputStep = () => (
		<div className="p-6">
			<div className="mb-6">
				<h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">Verify Profile via UMS</h3>
				<p className="text-sm text-neutral-400 leading-relaxed">
					Enter your UMS session cookie to automatically fetch your academic data from the university portal.
				</p>
			</div>

			<div className="mb-6 flex flex-col gap-2">
				<label htmlFor="gaValue" className="block text-neutral-300 font-bold text-xs uppercase tracking-wider">
					UMS Session Cookie (_ga_B0Z6G6GCD8)
				</label>
				<textarea
					id="gaValue"
					className="w-full min-h-[100px] p-4 border border-white/10 rounded-xl bg-white/5 text-white font-mono text-xs resize-y transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-neutral-500 disabled:opacity-50"
					placeholder="Paste your _ga_B0Z6G6GCD8 cookie value here..."
					value={gaValue}
					onChange={(e) => setGaValue(e.target.value)}
					rows={3}
					disabled={loading}
				/>
				<div className="mt-3">
					<details className="text-neutral-400 text-xs">
						<summary className="cursor-pointer font-semibold text-indigo-400 mb-2 hover:text-indigo-300 transition-colors">
							How to get your UMS session cookie?
						</summary>
						<ol className="ml-5 mt-2 space-y-1.5 list-decimal text-neutral-400">
							<li>
								Login to{" "}
								<a
									href="https://ums.lpu.in"
									target="_blank"
									rel="noopener noreferrer"
									className="text-indigo-400 hover:text-indigo-300 underline"
								>
									UMS Portal
								</a>
							</li>
							<li>Press F12 to open Developer Tools</li>
							<li>Go to Application/Storage → Cookies → https://ums.lpu.in</li>
							<li>
								Find and copy the value of{" "}
								<code className="bg-white/10 px-1.5 py-0.5 rounded text-white/90 font-mono">
									_ga_B0Z6G6GCD8
								</code>
							</li>
							<li>Paste the value above</li>
						</ol>
					</details>
				</div>
			</div>

			{error && (
				<div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
					<strong>Error:</strong> {error}
				</div>
			)}

			{!!existingData && (
				<div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
					<strong>Note:</strong> This profile already contains data. Fetching from UMS will show you a preview
					before any changes are made.
				</div>
			)}

			<div className="flex gap-3 justify-center mt-6">
				<button
					className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					onClick={fetchUMSData}
					disabled={loading || !gaValue.trim()}
				>
					{loading ? (
						<>
							<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
							Fetching from UMS...
						</>
					) : (
						"Fetch Data from UMS"
					)}
				</button>
				<button
					className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
					onClick={handleClose}
					disabled={loading}
				>
					Cancel
				</button>
			</div>
		</div>
	);

	const renderPreviewStep = () => (
		<div className="p-6 max-h-[calc(85vh-120px)] overflow-auto text-sm text-neutral-300">
			<div className="mb-6">
				<h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">UMS Data Preview</h3>
				<p className="text-xs text-neutral-400 leading-relaxed">
					Review the data fetched from UMS before applying it to your profile.
				</p>
			</div>

			{fetchedData && (
				<div className="space-y-6">
					{/* Student Info */}
					<div className="bg-white/5 rounded-xl p-4 border border-white/10">
						<h4 className="text-base font-bold mb-3 text-white">Student Information</h4>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
							<div className="flex items-center">
								<span className="text-neutral-400 font-semibold mr-2">Name:</span>
								<span className="text-white font-bold">
									{fetchedData.studentInfo.name || "Not available"}
								</span>
							</div>
							<div className="flex items-center">
								<span className="text-neutral-400 font-semibold mr-2">VID:</span>
								<span className="text-white font-bold">
									{fetchedData.studentInfo.vid || "Not available"}
								</span>
							</div>
							<div className="flex items-center">
								<span className="text-neutral-400 font-semibold mr-2">Program:</span>
								<span className="text-white font-bold">
									{fetchedData.studentInfo.program || "Not available"}
								</span>
							</div>
							<div className="flex items-center">
								<span className="text-neutral-400 font-semibold mr-2">CGPA:</span>
								<span className="text-teal-400 font-extrabold text-base">
									{fetchedData.studentInfo.cgpa || "0.00"}
								</span>
							</div>
						</div>
					</div>

					{/* Semesters Preview */}
					<div className="bg-white/5 rounded-xl p-4 border border-white/10">
						<h4 className="text-base font-bold mb-3 text-white">
							Academic Data ({fetchedData.semesters.length} semesters)
						</h4>
						<div className="space-y-3">
							{fetchedData.semesters.map((semester) => (
								<div key={semester.id} className="bg-white/5 rounded-xl p-3 border border-white/5">
									<h5 className="font-bold text-indigo-400 text-sm mb-2">
										{semester.name} ({semester.subjects.length} subjects)
									</h5>
									{semester.subjects.length > 0 ? (
										<div className="space-y-2 text-xs">
											{semester.subjects.slice(0, 3).map((subject) => (
												<div
													key={subject.id}
													className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-300"
												>
													<span className="text-white font-semibold">{subject.subjectName}</span>
													<span className="text-teal-400 font-bold">
														Grade Point: {subject.grade}
													</span>
													<span className="text-indigo-400 font-medium">Credits: {subject.credit}</span>
												</div>
											))}
											{semester.subjects.length > 3 && (
												<div className="text-xs text-neutral-500 italic">
													... and {semester.subjects.length - 3} more subjects
												</div>
											)}
										</div>
									) : (
										<p className="text-neutral-500 italic text-xs">
											No subjects found for this semester
										</p>
									)}
								</div>
							))}
						</div>
					</div>

					{/* Terms Info */}
					{fetchedData.allTermIds && fetchedData.allTermIds.terms && (
						<div className="bg-white/5 rounded-xl p-4 border border-white/10 text-xs">
							<h4 className="text-base font-bold mb-3 text-white">
								Available Terms ({fetchedData.allTermIds.totalTerms || 0})
							</h4>
							{fetchedData.allTermIds.categories && (
								<div className="flex flex-wrap gap-3">
									<span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full font-semibold">
										Regular: {fetchedData.allTermIds.categories.regular || 0}
									</span>
									<span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full font-semibold">
										Reappear: {fetchedData.allTermIds.categories.reappear || 0}
									</span>
									<span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-semibold">
										Backlog: {fetchedData.allTermIds.categories.backlog || 0}
									</span>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			<div className="flex flex-wrap gap-3 justify-center mt-6 pt-4 border-t border-white/10">
				{existingData ? (
					<>
						<button
							className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
							onClick={handleOverwrite}
						>
							Replace Current Data
						</button>
						<button
							className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
							onClick={() => setStep("input")}
						>
							Back to Input
						</button>
						<button
							className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
							onClick={handleClose}
						>
							Cancel
						</button>
					</>
				) : (
					<>
						<button
							className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
							onClick={handleConfirm}
						>
							Apply This Data
						</button>
						<button
							className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
							onClick={() => setStep("input")}
						>
							Back to Input
						</button>
						<button
							className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02]"
							onClick={handleClose}
						>
							Cancel
						</button>
					</>
				)}
			</div>
		</div>
	);

	const renderCurrentStep = () => {
		switch (step) {
			case "input":
				return renderInputStep();
			case "preview":
				return renderPreviewStep();
			default:
				return renderInputStep();
		}
	};

	return (
		<>
			<BaseModal
				isOpen={isOpen}
				onClose={handleClose}
				title="UMS DATA VERIFICATION"
				maxWidth="600px"
				closeOnEsc={!loading}
				closeOnOverlayClick={!loading}
				className="bg-neutral-950 border border-white/10 animate-in fade-in zoom-in duration-300"
			>
				{renderCurrentStep()}
			</BaseModal>

			<ConfirmModal
				isOpen={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmOverwrite}
				title="Replace Profile Data"
				message={`Are you sure you want to replace all existing data in "${profileName}" with the data from UMS? This will update all semesters, subjects, and student information.`}
				confirmText="Yes, Replace Data"
				cancelText="Cancel"
				type="warning"
			/>
		</>
	);
};

export default UMSFetchModal;
