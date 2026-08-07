"use client";

import React, { memo } from "react";
import { GraduationCap, Users, Wifi, WifiOff } from "lucide-react";
import type { ChatRoom } from "@bhemu/shared";
import type { ActiveRoom } from "@/contexts/ChatContext";

interface RoomItemProps {
	icon: React.ElementType;
	label: string;
	sublabel?: string;
	active: boolean;
	onClick: () => void;
	messageCount?: number;
}

const RoomItem = memo(function RoomItem({
	icon: Icon, label, sublabel, active, onClick, messageCount,
}: RoomItemProps) {
	return (
		<button
			onClick={onClick}
			className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 border ${
				active
					? "bg-primary/10 border-primary/20 text-white shadow-sm shadow-primary/5"
					: "text-muted-foreground hover:text-white hover:bg-white/5 border-transparent hover:border-white/10"
			}`}
		>
			<div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
				active ? "bg-primary/20 shadow-inner shadow-primary/20" : "bg-white/5 group-hover:bg-white/10"
			}`}>
				<Icon className={`w-4 h-4 transition-transform ${active ? "text-primary scale-110" : "text-muted-foreground group-hover:scale-110"}`} />
			</div>
			<div className="flex-1 min-w-0">
				<p className={`text-sm truncate transition-colors ${active ? "font-semibold" : "font-medium"}`}>{label}</p>
				{sublabel && <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>}
			</div>
			{typeof messageCount === "number" && messageCount > 0 && (
				<span className="text-[10px] text-muted-foreground tabular-nums">
					{messageCount > 99999 ? "99k+" : messageCount.toLocaleString("en-IN")}
				</span>
			)}
		</button>
	);
});

interface RoomListProps {
	universityRoom: ChatRoom | null;
	batchmateRoom: ChatRoom | null;
	activeRoom: ActiveRoom;
	onSelect: (room: ActiveRoom) => void;
	connected: boolean;
	onlineCount: number;
}

const RoomList = memo(function RoomList({
	universityRoom, batchmateRoom, activeRoom, onSelect, connected, onlineCount,
}: RoomListProps) {
	return (
		<div className="flex flex-col h-full">
			<div className="px-4 py-3 border-b border-white/5">
				<div className="flex items-center justify-between">
					<h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
						Rooms
					</h2>
					<div className="flex items-center gap-1.5">
						{connected
							? <Wifi className="w-3 h-3 text-success" />
							: <WifiOff className="w-3 h-3 text-muted-foreground animate-pulse" />
						}
						{connected && onlineCount > 0 && (
							<span className="text-[10px] text-muted-foreground tabular-nums">{onlineCount} online</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
				{universityRoom ? (
					<RoomItem
						icon={GraduationCap}
						label="University"
						sublabel="Everyone"
						active={activeRoom === "university"}
						onClick={() => onSelect("university")}
						messageCount={universityRoom.messageCount}
					/>
				) : (
					<div className="px-3 py-2 text-xs text-muted-foreground">
						<div className="h-2 w-20 bg-white/5 rounded animate-pulse" />
					</div>
				)}

				{batchmateRoom ? (
					<RoomItem
						icon={Users}
						label="Batchmates"
						sublabel={batchmateRoom.name}
						active={activeRoom === "batchmate"}
						onClick={() => onSelect("batchmate")}
						messageCount={batchmateRoom.messageCount}
					/>
				) : (
					<div className="mx-1 mt-1 px-3 py-2.5 rounded-xl border border-dashed border-white/10">
						<p className="text-xs text-muted-foreground font-medium">No batchmate room</p>
						<p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
							Sync UMS extension to unlock your batch chat.
						</p>
					</div>
				)}
			</div>
		</div>
	);
});

export default RoomList;
