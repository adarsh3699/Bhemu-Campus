"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";
import { Calculator, GraduationCap, TrendingUp, Info, Settings, LogOut, LogIn, X, LayoutDashboard } from "lucide-react";

const MAIN_NAV = [
	{ name: "Dashboard", path: "dashboard", icon: LayoutDashboard },
	{ name: "GPA Calculator", path: "gpa-calculator", icon: Calculator },
	{ name: "Reappear Calculator", path: "reappear-calculator", icon: GraduationCap },
	{ name: "Goal Planner", path: "gpa-goal-planner", icon: TrendingUp },
];

const SYSTEM_NAV = [
	{ name: "Settings", path: "settings", icon: Settings },
	{ name: "About", path: "about", icon: Info },
];

interface SideBarProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
	const { currentUser, logout } = useAuth();
	const { showMessage } = useMessage();
	const router = useRouter();
	const pathname = usePathname();
	const sidebarRef = useRef<HTMLElement>(null);

	const currentPath = pathname.split("/")[1] || "dashboard";

	// Close on outside click (mobile only)
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onClose]);

	// Scroll lock on mobile when drawer is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const getUserInitial = useCallback(() => {
		if (!currentUser) return "U";
		const name = currentUser.displayName || currentUser.email;
		return name ? name.charAt(0).toUpperCase() : "U";
	}, [currentUser]);

	const handleLogout = useCallback(async () => {
		try {
			await logout();
			showMessage("Logged out successfully.", "info");
			router.push("/login");
		} catch (err) {
			console.error("Logout error:", err);
			showMessage("Logout failed. Please try again.", "error");
		}
	}, [logout, showMessage, router]);

	const handleNavClick = useCallback(() => {
		// Close mobile drawer on link click
		onClose();
	}, [onClose]);

	return (
		<>
			{/* Mobile backdrop */}
			{isOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden" aria-hidden="true" />
			)}

			{/* Sidebar */}
			<aside
				ref={sidebarRef}
				className={`fixed left-0 top-0 h-full w-[250px] lg:w-[280px] flex flex-col bg-[#0a0f10] border-r border-white/5 z-[100] transition-transform duration-300 ease-out
					${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
			>
				{/* Brand */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white/5">
							<Image
								src="/myLogo.webp"
								alt="Bhemu Calculator Logo"
								width={32}
								height={32}
								className="object-cover"
							/>
						</div>
						<div>
							<h1 className="text-white font-bold text-sm leading-tight">Bhemu Calculator</h1>
						</div>
					</div>
					{/* Mobile close button */}
					<button
						onClick={onClose}
						className="md:hidden p-1 rounded-md text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
						aria-label="Close sidebar"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
					{/* Main tools section */}
					<span className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
						Main
					</span>

					{MAIN_NAV.map(({ name, path, icon: Icon }) => {
						const isActive = currentPath === path;
						return (
							<Link
								key={path}
								href={`/${path}`}
								onClick={handleNavClick}
								className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
									isActive
										? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none pl-2"
										: "text-muted-foreground hover:text-white hover:bg-white/5 border-l-4 border-transparent rounded-l-none pl-2"
								}`}
							>
								<Icon
									className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"}`}
								/>
								{name}
							</Link>
						);
					})}

					{/* System section */}
					<span className="px-3 mt-5 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
						System
					</span>

					{SYSTEM_NAV.map(({ name, path, icon: Icon }) => {
						const isActive = currentPath === path;
						return (
							<Link
								key={path}
								href={`/${path}`}
								onClick={handleNavClick}
								className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
									isActive
										? "bg-primary/10 text-primary border-l-4 border-primary rounded-l-none pl-2"
										: "text-muted-foreground hover:text-white hover:bg-white/5 border-l-4 border-transparent rounded-l-none pl-2"
								}`}
							>
								<Icon
									className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"}`}
								/>
								{name}
							</Link>
						);
					})}
				</nav>

				{/* User profile section */}
				<div className="border-t border-white/5 p-4">
					{currentUser ? (
						<div className="space-y-3">
							{/* User info */}
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
									{getUserInitial()}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-white text-xs font-semibold truncate">
										{currentUser.displayName || "User"}
									</p>
									<p className="text-muted-foreground text-[11px] truncate">{currentUser.email}</p>
								</div>
							</div>
							{/* Logout button */}
							<button
								onClick={() => {
									onClose();
									handleLogout();
								}}
								className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all duration-200"
							>
								<LogOut className="w-4 h-4 shrink-0" />
								Sign Out
							</button>
						</div>
					) : (
						<button
							onClick={() => {
								onClose();
								router.push("/login");
							}}
							className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-all duration-200"
						>
							<LogIn className="w-4 h-4 shrink-0" />
							Sign In
						</button>
					)}
				</div>
			</aside>
		</>
	);
}
