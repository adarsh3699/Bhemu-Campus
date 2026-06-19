"use client";

import React, { useEffect } from "react";
import Modal from "react-modal";
import { X } from "lucide-react";

// Set the app element for accessibility
if (typeof document !== "undefined") {
	Modal.setAppElement(document.body);
}

interface BaseModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	title?: string;
	showHeader?: boolean;
	showCloseButton?: boolean;
	closeOnOverlayClick?: boolean;
	closeOnEsc?: boolean;
	maxWidth?: string;
	className?: string;
	overlayClassName?: string;
}

const BaseModal: React.FC<BaseModalProps> = ({
	isOpen,
	onClose,
	children,
	title,
	showHeader = true,
	showCloseButton = true,
	closeOnOverlayClick = true,
	closeOnEsc = true,
	maxWidth = "500px",
	className = "",
	overlayClassName = "",
}) => {
	// Prevent background scroll when modal is open
	useEffect(() => {
		if (isOpen) {
			const scrollY = window.scrollY;
			const body = document.body;
			const html = document.documentElement;

			body.style.position = "fixed";
			body.style.top = `-${scrollY}px`;
			body.style.width = "100%";
			body.style.overflow = "hidden";
			html.style.overflow = "hidden";

			return () => {
				body.style.position = "";
				body.style.top = "";
				body.style.width = "";
				body.style.overflow = "";
				html.style.overflow = "";
				window.scrollTo(0, scrollY);
			};
		}
	}, [isOpen]);

	const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (closeOnOverlayClick && e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onRequestClose={closeOnEsc ? onClose : undefined}
			className="fixed inset-0 flex items-center justify-center p-4 z-[1000] outline-none border-none"
			overlayClassName={`fixed inset-0 bg-black/30 backdrop-blur-sm z-[1000] transition-all duration-150 ease-out border-none ${
				isOpen ? "opacity-100" : "opacity-0"
			} ${overlayClassName}`}
			closeTimeoutMS={150}
		>
			{/* Blur overlay background */}
			<div
				className="fixed inset-0 backdrop-blur-md transition-opacity duration-150 ease-out"
				onClick={handleOverlayClick}
				aria-hidden="true"
			/>

			<div
				className={`relative w-full transition-all duration-150 ease-out z-10 border-none outline-none ${
					isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-1"
				}`}
				style={{ maxWidth }}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal content with proper styling */}
				<div
					className={`rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/10 bg-neutral-900/90 backdrop-blur-xl ${className}`}
				>
					{/* Uniform header - controlled by showHeader prop */}
					{showHeader && title && (
						<div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-b border-white/10">
							<h2 className="text-xl font-semibold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">{title}</h2>
							{showCloseButton && (
								<button
									onClick={onClose}
									className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300 hover:scale-105"
									aria-label="Close modal"
								>
									<X className="w-5 h-5" />
								</button>
							)}
						</div>
					)}

					{/* Content */}
					<div className="flex-1 overflow-auto">{children}</div>
				</div>
			</div>
		</Modal>
	);
};

export default BaseModal;
