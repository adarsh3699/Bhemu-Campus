"use client";

import React, { useEffect } from "react";
import Modal from "react-modal";
import { X } from "lucide-react";

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
		if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
	};

	return (
		<Modal
			isOpen={isOpen}
			onRequestClose={closeOnEsc ? onClose : undefined}
			className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 z-1000 outline-none border-none"
			overlayClassName={`fixed inset-0 bg-black/20 backdrop-blur-sm z-1000 transition-opacity duration-200 border-none ${
				isOpen ? "opacity-100" : "opacity-0"
			} ${overlayClassName}`}
			closeTimeoutMS={200}
		>
			<div className="fixed inset-0" onClick={handleOverlayClick} aria-hidden="true" />

			<div
				className={`relative w-full z-10 transition-all duration-200 ease-out ${
					isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-[0.98] opacity-0 translate-y-2"
				}`}
				style={{ maxWidth }}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className={`relative rounded-2xl overflow-hidden max-h-[90vh] flex flex-col bg-[#161616] border border-white/8 shadow-2xl ${className}`}
				>
					{showHeader && title && (
						<div className="flex items-center justify-between px-5 py-3.5 shrink-0 bg-white/3 border-b border-white/[0.07]">
							<div className="flex items-center gap-2.5">
								<span
									className="w-1.5 h-1.5 rounded-full shrink-0 bg-primary"
									style={{ boxShadow: "0 0 6px rgba(3,152,172,0.9), 0 0 12px rgba(3,152,172,0.4)" }}
								/>
								<h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
							</div>

							{showCloseButton && (
								<button
									onClick={onClose}
									className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer shrink-0 text-white/40 hover:text-white/90 bg-white/6 hover:bg-white/10 border border-white/8 transition-colors duration-150"
									aria-label="Close modal"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					)}

					<div className="flex-1 overflow-y-auto">{children}</div>
				</div>
			</div>
		</Modal>
	);
};

export default BaseModal;
