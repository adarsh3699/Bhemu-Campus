"use client";

import { createPortal } from "react-dom";
import { useState, type RefObject } from "react";
import { ChevronLeft, Flag, Pencil, Pin, PinOff, ShieldAlert, Trash2, type LucideIcon } from "lucide-react";
import { PIN_DURATION_OPTIONS, type ChatDisplayMessage, type PinDuration } from "@bhemu/shared";

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
	onTogglePin: (messageId: string, duration?: PinDuration) => void;
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
	const [showPinDurations, setShowPinDurations] = useState(false);

	if (typeof document === "undefined") return null;

	const handlePinAction = () => {
		if (isPinned) {
			onClose();
			onTogglePin(message.id);
			return;
		}
		setShowPinDurations(true);
	};

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
			onSelect: handlePinAction,
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
			{showPinDurations ? (
				<>
					<button
						type="button"
						className="flex min-h-10 w-full items-center gap-2 border-b border-white/10 px-3.5 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
						onClick={() => setShowPinDurations(false)}
					>
						<ChevronLeft className="size-3.5" aria-hidden="true" />
						<span>Pin message for</span>
					</button>
					<div className="p-1">
						{PIN_DURATION_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								role="menuitem"
							className="flex min-h-11 w-full items-center rounded-md px-2.5 text-left text-sm text-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:outline-none"
								onClick={() => {
									onClose();
									onTogglePin(message.id, option.value);
								}}
							>
								{option.label}
							</button>
						))}
					</div>
				</>
			) : (
				items.map((item) => <MenuItem key={item.label} {...item} />)
			)}
		</div>,
		document.body,
	);
}
