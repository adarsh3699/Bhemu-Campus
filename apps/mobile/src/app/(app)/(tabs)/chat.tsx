import { useLocalSearchParams } from "expo-router";
import ChatScreen from "@/components/Chat/ChatScreen";

export default function ChatTab() {
	const params = useLocalSearchParams<{
		roomId?: string | string[];
		messageId?: string | string[];
		roomType?: string | string[];
	}>();
	const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
	const roomId = firstParam(params.roomId);
	const messageId = firstParam(params.messageId);
	const roomType = firstParam(params.roomType);
	const notificationRoomType = roomType === "UNIVERSITY" || roomType === "BATCHMATE" ? roomType : undefined;

	return (
		<ChatScreen
			notificationTarget={roomId && messageId ? { roomId, messageId, roomType: notificationRoomType } : undefined}
		/>
	);
}
