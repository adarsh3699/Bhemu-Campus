"use client";

import React, { useEffect, useRef } from "react";
import BaseModal from "@/components/modal/BaseModal";
import { Info } from "lucide-react";

interface SubjectToUpdate {
	subjectName: string;
	grade: string;
	credit: string;
}

interface UpdateSubjectModalProps {
	isOpen: boolean;
	onClose: () => void;
	onUpdate: (e: React.FormEvent<HTMLFormElement>) => void;
	subject: SubjectToUpdate;
	setSubject: React.Dispatch<React.SetStateAction<SubjectToUpdate>>;
	isReadOnly: boolean;
	onInfoClick: (type: "grade" | "ch", e: React.MouseEvent<HTMLButtonElement>) => void;
}

const UpdateSubjectModal: React.FC<UpdateSubjectModalProps> = ({
	isOpen,
	onClose,
	onUpdate,
	subject,
	setSubject,
	isReadOnly,
	onInfoClick,
}) => {
	const subjectNameInputRef = useRef<HTMLInputElement>(null);

	// Auto-focus Subject Name input when modal opens
	useEffect(() => {
		if (isOpen && subjectNameInputRef.current) {
			setTimeout(() => {
				subjectNameInputRef.current?.focus();
				subjectNameInputRef.current?.select();
			}, 100);
		}
	}, [isOpen]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setSubject((prev: SubjectToUpdate) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		onUpdate(e);
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title="Update Subject"
			maxWidth="500px"
			className="bg-neutral-950 border border-white/10"
			overlayClassName="backdrop-blur-sm"
		>
			<div className="p-6">
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-1 gap-6">
						<div className="flex flex-col gap-2">
							<label
								htmlFor="modal-subjectName"
								className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1"
							>
								Subject Name
							</label>
							<input
								id="modal-subjectName"
								type="text"
								name="subjectName"
								ref={subjectNameInputRef}
								placeholder={isReadOnly ? "Read-only profile" : 'e.g. "Mathematics"'}
								value={subject.subjectName}
								onChange={handleInputChange}
								disabled={isReadOnly}
								required
								className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm transition-all duration-300 text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<label
									htmlFor="modal-grade"
									className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
								>
									Grade
									<button
										type="button"
										onClick={(e) => onInfoClick("grade", e)}
										className="text-neutral-400 hover:text-white cursor-pointer transition-all duration-200"
										title="Grade information"
									>
										<Info className="w-4 h-4" />
									</button>
								</label>
								<select
									id="modal-grade"
									name="grade"
									value={subject.grade}
									onChange={handleInputChange}
									disabled={isReadOnly}
									required
									className="w-full px-4 py-3 border border-white/10 rounded-xl bg-neutral-900 text-sm transition-all duration-300 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed appearance-none"
								>
									<option value="">Select Grade</option>
									<option value="10">O (10)</option>
									<option value="9">A+ (9)</option>
									<option value="8">A (8)</option>
									<option value="7">B+ (7)</option>
									<option value="6">B (6)</option>
									<option value="5">C (5)</option>
									<option value="4">D (4)</option>
									<option value="0">E - Reappear (0)</option>
									<option value="0">F - Fail (0)</option>
									<option value="0">G - Backlog (0)</option>
								</select>
							</div>

							<div className="flex flex-col gap-2">
								<label
									htmlFor="modal-credit"
									className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5"
								>
									Credits
									<button
										type="button"
										onClick={(e) => onInfoClick("ch", e)}
										className="text-neutral-400 hover:text-white cursor-pointer transition-all duration-200"
										title="Credit Hours information"
									>
										<Info className="w-4 h-4" />
									</button>
								</label>
								<input
									id="modal-credit"
									type="number"
									name="credit"
									placeholder={isReadOnly ? "Read-only profile" : "Credits"}
									min="0"
									step="0.5"
									value={subject.credit}
									onChange={handleInputChange}
									disabled={isReadOnly}
									required
									className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-sm transition-all duration-300 text-white placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
								/>
							</div>
						</div>

						<div className="flex justify-end pt-4">
							<button
								type="submit"
								disabled={isReadOnly}
								className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
							>
								Update Subject
							</button>
						</div>
					</div>
				</form>
			</div>
		</BaseModal>
	);
};

export default UpdateSubjectModal;
