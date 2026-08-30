"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { Flag, Pencil, Pin, PinOff, ShieldAlert, Trash2, type LucideIcon } from "lucide-react";
import type { ChatDisplayMessage } from "@bhemu/shared";

export interface MenuPosition {
	top: number;
	left: number;
}

interface MessageContextMenuProps {
	message: ChatDisplayMessage;
	menuPanelRef: RefObject<HTMLDivElement | null>;
	position: MenuPosition | null;
	isOwn: boolean;
	isPinned: boolean;
	canPin: boolean;
	canModerate: boolean;
	onClose: () => void;
	onEdit: (message: ChatDisplayMessage) => void;
	onDelete: (messageId: string) => void;
	onReport: (messageId: string) => void;
	onModerationDelete: (messageId: string) => void;
	onTogglePin: (messageId: string) => void;
	onModerate: (message: ChatDisplayMessage) => void;
}

interface MenuItemProps {
	icon: LucideIcon;
	label: string;
	tone?: "default" | "danger" | "warning" | "primary";
	onSelect: () => void;
}

const MENU_ITEM_STYLES = {
	default: "text-foreground hover:bg-white/5 focus-visible:bg-white/5",
	danger: "text-red-400 hover:bg-red-950/20 focus-visible:bg-red-950/20",
	warning: "text-red-300 hover:bg-red-950/20 focus-visible:bg-red-950/20",
	primary: "text-foreground hover:bg-white/5 focus-visible:bg-white/5",
} as const;

const MENU_ICON_STYLES = {
	default: "text-muted-foreground",
	danger: "",
	warning: "",
	primary: "text-primary",
} as const;

function MenuItem({ icon: Icon, label, tone = "default", onSelect }: MenuItemProps) {
	return (
		<button
			type="button"
			role="menuitem"
			className={`flex min-h-11 w-full items-center gap-2 px-3.5 text-sm transition-colors focus-visible:outline-none ${MENU_ITEM_STYLES[tone]}`}
			onClick={onSelect}
		>
			<Icon className={`size-3.5 ${MENU_ICON_STYLES[tone]}`} />
			{label}
		</button>
	);
}

export default function MessageContextMenu({
	message,
	menuPanelRef,
	position,
	isOwn,
	isPinned,
	canPin,
	canModerate,
	onClose,
	onEdit,
	onDelete,
	onReport,
	onModerationDelete,
	onTogglePin,
	onModerate,
}: MessageContextMenuProps) {
	if (typeof document === "undefined") return null;

	const items: MenuItemProps[] = [];
	if (isOwn) {
		items.push(
			{ icon: Pencil, label: "Edit", onSelect: () => { onClose(); onEdit(message); } },
			{ icon: Trash2, label: "Delete", tone: "danger", onSelect: () => { onClose(); onDelete(message.id); } },
		);
	} else {
		items.push({ icon: Flag, label: "Report", onSelect: () => { onClose(); onReport(message.id); } });
		if (canModerate) {
			items.push({ icon: Trash2, label: "Delete", tone: "danger", onSelect: () => { onClose(); onModerationDelete(message.id); } });
		}
	}

	if (canPin) {
		items.push({
			icon: isPinned ? PinOff : Pin,
			label: isPinned ? "Unpin" : "Pin",
			tone: "primary",
			onSelect: () => { onClose(); onTogglePin(message.id); },
		});
	}
	if (canModerate) {
		items.push({ icon: ShieldAlert, label: "Moderate", tone: "warning", onSelect: () => { onClose(); onModerate(message); } });
	}

	return createPortal(
		<div
			ref={menuPanelRef}
			role="menu"
			style={{
				top: position?.top ?? 0,
				left: position?.left ?? 0,
				visibility: position ? "visible" : "hidden",
				opacity: position ? 1 : 0,
				pointerEvents: position ? "auto" : "none",
			}}
			className="fixed z-[100] w-44 rounded-xl border border-white/10 bg-[#121212]/95 py-1.5 text-sm shadow-xl shadow-black/50 backdrop-blur-md transition-opacity duration-150 ease-out"
		>
			{items.map((item) => <MenuItem key={item.label} {...item} />)}
		</div>,
		document.body,
	);
}
