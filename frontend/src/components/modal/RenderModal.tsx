"use client";

import React from "react";
import BaseModal from "./BaseModal";

const modalData_1 = {
	name: "Grade Point",
	info: (
		<>
			A <b>grade point</b> is a numeric value assigned to your performance in a course based on your final grade.
			At Indian Colleges, the grading system is based on a 10-point scale, and grades correspond to specific grade
			points:
		</>
	),
	tableData: [
		{ grade: "O", gradePoint: 10, performance: "Outstanding" },
		{ grade: "A+", gradePoint: 9, performance: "Excellent" },
		{ grade: "A", gradePoint: 8, performance: "Very Good" },
		{ grade: "B+", gradePoint: 7, performance: "Good" },
		{ grade: "B", gradePoint: 6, performance: "Above Average" },
		{ grade: "C", gradePoint: 5, performance: "Average" },
		{ grade: "P", gradePoint: 4, performance: "Pass" },
		{ grade: "F", gradePoint: 0, performance: "Fail" },
		{ grade: "G", gradePoint: 0, performance: "Backlog" },
		{ grade: "E", gradePoint: 0, performance: "Reappear" },
		{ grade: "I", gradePoint: 0, performance: "Incomplete" },
	],
};

const modalData_ch = {
	name: "Credit Hours (CH)",
	info: (
		<>
			<b>Credit Hours</b> represent the weight or importance of a course. It is usually determined by the number
			of hours you spend on that course in a week. For example:
		</>
	),
	list: [
		<>
			<b>Credit Hours</b> represent the weight of that course.
		</>,
		<>
			A <b>theory</b> class might have 3 Credit Hours.
		</>,
		<>
			A <b>lab session</b> could have 1 or 2 Credit Hours.
		</>,
	],
	para2: (
		<>
			The Credit Hours of each course are predefined and available in your course{" "}
			<b>syllabus or student portal.</b>
		</>
	),
};

interface RenderModalProps {
	isModalOpen: boolean;
	onClose: () => void;
	modalType: "ch" | "grade" | "";
}

const RenderModal: React.FC<RenderModalProps> = ({ isModalOpen, onClose, modalType }) => {
	const modalData = modalType === "ch" ? modalData_ch : modalData_1;

	const handleClose = () => {
		if (onClose) {
			onClose();
		}
	};

	if (!modalType) {
		return null;
	}

	return (
		<BaseModal
			isOpen={isModalOpen}
			onClose={handleClose}
			title={modalData?.name?.toUpperCase()}
			maxWidth="600px"
			className="bg-neutral-950 border border-white/10"
		>
			<div className="p-6 overflow-auto max-h-[calc(85vh-120px)] text-sm text-neutral-300">
				<p className="leading-relaxed mb-5 text-neutral-200 font-normal">
					{modalData?.info}
				</p>

				{"tableData" in modalData && modalData.tableData && (
					<div className="my-6 rounded-2xl border border-white/10 overflow-hidden shadow-lg bg-white/5">
						<table className="w-full border-collapse">
							<thead>
								<tr className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-b border-white/10">
									<th className="px-5 py-3 text-left font-semibold text-white text-xs tracking-wider uppercase">
										Grade
									</th>
									<th className="px-5 py-3 text-left font-semibold text-white text-xs tracking-wider uppercase">
										Grade Point
									</th>
									<th className="px-5 py-3 text-left font-semibold text-white text-xs tracking-wider uppercase">
										Performance
									</th>
								</tr>
							</thead>
							<tbody>
								{modalData.tableData.map((data, index) => (
									<tr key={index} className="transition-all duration-300 hover:bg-white/5 border-b border-white/5 last:border-b-0">
										<td className="px-5 py-3 text-teal-400 font-bold text-sm">
											{data.grade}
										</td>
										<td className="px-5 py-3 text-indigo-400 font-semibold text-sm">
											{data.gradePoint}
										</td>
										<td className="px-5 py-3 text-neutral-300 text-sm">
											{data.performance}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{"list" in modalData && modalData.list && (
					<ul className="pl-5 leading-relaxed my-5 space-y-3 list-disc text-neutral-300">
						{modalData.list.map((data, index) => (
							<li key={index} className="text-sm">
								{data}
							</li>
						))}
					</ul>
				)}

				{"para2" in modalData && modalData.para2 && (
					<p className="leading-relaxed mt-5 text-neutral-200 font-normal">
						{modalData.para2}
					</p>
				)}
			</div>
		</BaseModal>
	);
};

export default RenderModal;
