"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

type MessageType = "success" | "error" | "warning" | "info";

interface MessageContextType {
	showMessage: (msgText: string, type?: MessageType) => void;
	clearMessage: () => void;
}

interface MessageDisplayProps {
	msgText: string;
	type?: MessageType;
	duration?: number;
	onClose: () => void;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({ msgText, type = "info", duration = 8000, onClose }) => {
	const [isVisible, setIsVisible] = useState(true);

	useEffect(() => {
		if (duration > 0) {
			const timer = setTimeout(() => {
				setIsVisible(false);
				setTimeout(onClose, 300); // Wait for fade out animation
			}, duration);
			return () => clearTimeout(timer);
		}
	}, [duration, onClose]);

	const handleClose = () => {
		setIsVisible(false);
		setTimeout(onClose, 300);
	};

	const getToastStyles = (type: MessageType) => {
		const baseStyles =
			"flex items-center justify-between p-4 rounded-lg shadow-2xl min-w-[320px] max-w-md text-white text-sm font-semibold backdrop-blur-md border animate-in fade-in slide-in-from-top-4 duration-300";

		switch (type) {
			case "success":
				return `${baseStyles} bg-emerald-600/90 border-emerald-500/30 shadow-emerald-950/20`;
			case "error":
				return `${baseStyles} bg-destructive/90 border-destructive/30 shadow-red-950/20`;
			case "warning":
				return `${baseStyles} bg-warning/90 border-warning/30 text-background shadow-amber-950/20`;
			case "info":
			default:
				return `${baseStyles} bg-accent/90 border-accent/30 shadow-blue-950/20`;
		}
	};

	const icons = {
		success: <CheckCircle2 className="w-5 h-5 flex-shrink-0" />,
		error: <AlertCircle className="w-5 h-5 flex-shrink-0" />,
		warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
		info: <Info className="w-5 h-5 flex-shrink-0" />,
	};

	if (!msgText) return null;

	return (
		<div
			className={`fixed top-12 right-5 z-[10000] transition-all duration-300 ease-in-out max-md:top-3 max-md:right-3 max-md:left-3 ${
				isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
			}`}
		>
			<div className={getToastStyles(type)}>
				<div className="flex items-center gap-3 flex-1">
					{icons[type] || icons.info}
					<span className="break-words leading-relaxed">{msgText}</span>
				</div>
				<button
					className={`p-1.5 rounded border-none cursor-pointer flex items-center justify-center ml-2 opacity-70 transition-opacity duration-200 hover:opacity-100 hover:bg-white/10 ${
						type === "warning" ? "text-background" : "text-white"
					}`}
					onClick={handleClose}
					aria-label="Close message"
				>
					<X className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export const useMessage = (): MessageContextType => {
	const context = useContext(MessageContext);
	if (!context) {
		throw new Error("useMessage must be used within a MessageProvider");
	}
	return context;
};

export const MessageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [msg, setMsg] = useState<{ text: string; type: MessageType }>({ text: "", type: "info" });

	const showMessage = useCallback((msgText: string, type: MessageType = "info") => {
		if (msgText) {
			setMsg({ text: msgText, type });
		}
	}, []);

	const clearMessage = useCallback(() => {
		setMsg({ text: "", type: "info" });
	}, []);

	return (
		<MessageContext.Provider value={{ showMessage, clearMessage }}>
			{children}
			{msg.text && <MessageDisplay msgText={msg.text} type={msg.type} onClose={clearMessage} />}
		</MessageContext.Provider>
	);
};
