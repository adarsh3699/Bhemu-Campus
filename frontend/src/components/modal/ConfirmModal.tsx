"use client";

import React from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import BaseModal from "./BaseModal";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	type?: "danger" | "warning" | "info" | "success";
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Delete",
	cancelText = "Cancel",
	type = "danger",
}) => {
	const handleConfirm = () => {
		onConfirm();
		onClose();
	};

	const getIcon = () => {
		switch (type) {
			case "danger":
			case "warning":
				return <AlertTriangle className="w-8 h-8" />;
			case "info":
				return <Info className="w-8 h-8" />;
			case "success":
				return <CheckCircle2 className="w-8 h-8" />;
			default:
				return <Info className="w-8 h-8" />;
		}
	};

	const getIconClasses = () => {
		switch (type) {
			case "danger":
				return "bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-500 border-2 border-red-500/30";
			case "warning":
				return "bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-500 border-2 border-amber-500/30";
			case "info":
				return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-500 border-2 border-blue-500/30";
			case "success":
				return "bg-gradient-to-br from-green-500/20 to-green-600/20 text-green-500 border-2 border-green-500/30";
			default:
				return "bg-gradient-to-br from-blue-500/20 to-blue-600/20 text-blue-500 border-2 border-blue-500/30";
		}
	};

	const getButtonClasses = () => {
		switch (type) {
			case "danger":
				return "bg-gradient-to-r from-red-500 to-red-600 text-white border border-red-500/30 hover:from-red-600 hover:to-red-700 hover:shadow-red-500/40";
			case "warning":
				return "bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-500/30 hover:from-orange-600 hover:to-amber-700 hover:shadow-amber-500/40";
			case "info":
				return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500/30 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40";
			case "success":
				return "bg-gradient-to-r from-green-500 to-green-600 text-white border border-green-500/30 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/40";
			default:
				return "bg-gradient-to-r from-blue-500 to-blue-600 text-white border border-blue-500/30 hover:from-blue-600 hover:to-blue-700 hover:shadow-blue-500/40";
		}
	};

	return (
		<BaseModal isOpen={isOpen} onClose={onClose} showHeader={false} maxWidth="450px" className="bg-neutral-950 border border-white/10">
			<div className="px-6 pt-8 pb-4 text-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-b border-white/5">
				<div
					className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-pulse ${getIconClasses()}`}
				>
					{getIcon()}
				</div>
				<h3 className="text-xl font-bold text-white">{title}</h3>
			</div>
			<div className="px-6 py-6 text-center">
				<p className="text-neutral-400 leading-relaxed text-sm">{message}</p>
			</div>
			<div className="flex gap-3 px-6 pb-6 justify-center">
				<button
					onClick={onClose}
					className="px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] min-w-[100px]"
				>
					{cancelText}
				</button>
				<button
					onClick={handleConfirm}
					className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg min-w-[100px] ${getButtonClasses()}`}
				>
					{confirmText}
				</button>
			</div>
		</BaseModal>
	);
};

export default ConfirmModal;
