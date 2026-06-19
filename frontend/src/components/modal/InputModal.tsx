"use client";

import React, { useState, useEffect } from "react";
import BaseModal from "./BaseModal";

interface InputModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (val: string) => void;
	title: string;
	placeholder: string;
	initialValue?: string;
	confirmText?: string;
	cancelText?: string;
}

const InputModal: React.FC<InputModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	placeholder,
	initialValue = "",
	confirmText = "OK",
	cancelText = "Cancel",
}) => {
	const [inputValue, setInputValue] = useState(initialValue);

	useEffect(() => {
		Promise.resolve().then(() => {
			setInputValue(initialValue);
		});
	}, [initialValue, isOpen]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (inputValue.trim()) {
			onConfirm(inputValue.trim());
			setInputValue("");
		}
	};

	const handleCancel = () => {
		setInputValue("");
		onClose();
	};

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={handleCancel}
			title={title}
			maxWidth="400px"
			showCloseButton={false}
			className="bg-neutral-950 border border-white/10"
		>
			<form onSubmit={handleSubmit} className="flex flex-col">
				<div className="p-6">
					<input
						type="text"
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						placeholder={placeholder}
						className="w-full p-4 border border-white/10 rounded-xl bg-white/5 text-white transition-all duration-300 focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/10 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-neutral-500"
						autoFocus
						required
					/>
				</div>
				<div className="flex gap-3 px-6 pb-6 justify-end max-sm:flex-col">
					<button
						type="button"
						onClick={handleCancel}
						className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[80px] max-sm:w-full"
					>
						{cancelText}
					</button>
					<button
						type="submit"
						disabled={!inputValue.trim()}
						className="px-5 py-2.5 bg-gradient-to-r from-teal-400 to-blue-500 hover:from-teal-500 hover:to-blue-600 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none min-w-[80px] max-sm:w-full"
					>
						{confirmText}
					</button>
				</div>
			</form>
		</BaseModal>
	);
};

export default InputModal;
