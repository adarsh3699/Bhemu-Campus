import React, { createContext, useContext, useCallback } from "react";
import { Alert } from "react-native";

type MessageType = "success" | "error" | "info" | "warning";

interface MessageContextType {
	showMessage: (message: string, type?: MessageType) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function useMessage(): MessageContextType {
	const ctx = useContext(MessageContext);
	if (!ctx) throw new Error("useMessage must be used within MessageProvider");
	return ctx;
}

export function MessageProvider({ children }: { children: React.ReactNode }) {
	const showMessage = useCallback((message: string, type: MessageType = "info") => {
		const title = type === "error" ? "Error" : type === "success" ? "Success" : type === "warning" ? "Warning" : "Info";
		Alert.alert(title, message);
	}, []);

	return (
		<MessageContext.Provider value={{ showMessage }}>
			{children}
		</MessageContext.Provider>
	);
}
