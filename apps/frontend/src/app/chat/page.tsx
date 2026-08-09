import { generatePageMetadata } from "@/lib/seo";
import ChatPageClient from "@/components/chat/ChatPageClient";

export const metadata = generatePageMetadata({
	title: "Chat — bCampus",
	description: "Chat with your university and batchmates in real time.",
	path: "/chat",
	keywords: ["campus chat", "student chat", "batchmate chat", "university chat"],
});

export default function ChatPage() {
	return <ChatPageClient />;
}
