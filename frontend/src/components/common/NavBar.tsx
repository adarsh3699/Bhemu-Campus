"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";
import {
	Menu,
	X,
	User,
	LogOut,
	Info,
	Calculator,
	GraduationCap,
	TrendingUp,
	Settings
} from "lucide-react";

// Menu configuration
const menuItems = [
	{
		name: "GPA Calculator",
		path: "gpa-calculator",
		icon: Calculator
	},
	{
		name: "Reappear Calculator",
		path: "reappear-calculator",
		icon: GraduationCap
	},
	{
		name: "GPA Goal Planner",
		path: "gpa-goal-planner",
		icon: TrendingUp
	},
];

const flatMenuItems = [
	{ name: "GPA Calculator", path: "gpa-calculator" },
	{ name: "Reappear Calculator", path: "reappear-calculator" },
	{ name: "GPA Goal Planner", path: "gpa-goal-planner" },
];

const NO_NAVBAR_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

export default function NavBar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

	const profileDropdownRef = useRef<HTMLDivElement>(null);

	const { currentUser, logout } = useAuth();
	const { showMessage } = useMessage();
	const router = useRouter();
	const pathname = usePathname();

	const currentPath = pathname.split("/")[1] || "gpa-calculator";
	const shouldShowNavbar = !(NO_NAVBAR_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/");

	// Handle clicks outside dropdowns
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
				setIsProfileDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Mobile menu scroll lock
	useEffect(() => {
		document.body.style.overflow = isMenuOpen ? "hidden" : "auto";
		return () => {
			document.body.style.overflow = "auto";
		};
	}, [isMenuOpen]);

	const closeMenus = useCallback(() => {
		setIsMenuOpen(false);
	}, []);

	const handleAuthAction = useCallback(async () => {
		try {
			if (currentUser) {
				await logout();
				showMessage("You have been successfully logged out.", "info");
				router.push("/login");
			} else {
				router.push("/login");
			}
		} catch (error: unknown) {
			console.error("Authentication error:", error);
			const message = error instanceof Error ? error.message : String(error);
			showMessage("Authentication failed: " + message, "error");
		}
	}, [currentUser, logout, router, showMessage]);

	const getUserInitial = useCallback(() => {
		if (!currentUser) return "U";
		const name = currentUser.displayName || currentUser.email;
		return name ? name.charAt(0).toUpperCase() : "U";
	}, [currentUser]);

	const handleProfileAction = useCallback(
		(action: string) => {
			setIsProfileDropdownOpen(false);
			switch (action) {
				case "profile":
					router.push("/settings");
					break;
				case "about":
					router.push("/about");
					break;
				case "logout":
					handleAuthAction();
					break;
				default:
					break;
			}
		},
		[router, handleAuthAction]
	);

	const handleBackdropClick = useCallback((e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			setIsMenuOpen(false);
		}
	}, []);

	if (!shouldShowNavbar) {
		return null;
	}

	return (
		<>
			{/* Mobile Sidebar Menu Backdrop */}
			{isMenuOpen && (
				<div 
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] lg:hidden" 
					onClick={handleBackdropClick} 
				/>
			)}
			
			{/* Mobile Navigation Sidebar */}
			<nav
				className={`fixed top-0 left-0 h-full w-72 max-w-[80%] transform transition-transform duration-300 ease-out z-[1000] border-r border-white/5 bg-neutral-950/95 backdrop-blur-lg flex flex-col justify-between shadow-2xl lg:hidden ${
					isMenuOpen ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div>
					<div className="flex items-center justify-between border-b border-white/5 h-[60px] px-6 text-xl font-bold text-white">
						<span className="text-gradient-brand">Bhemu Calculator</span>
						<button
							onClick={() => setIsMenuOpen(false)}
							className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200"
						>
							<X className="w-5 h-5 text-white" />
						</button>
					</div>
					
					<div className="flex flex-col gap-1 p-4">
						{flatMenuItems.map(({ path, name }) => {
							const isActive = currentPath === path;
							return (
								<Link
									key={path}
									href={`/${path}`}
									className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden ${
										isActive
											? "bg-primary/10 text-secondary border-l-2 border-primary font-semibold"
											: "text-neutral-300 hover:bg-white/5 hover:text-white"
									}`}
									onClick={closeMenus}
								>
									{name}
								</Link>
							);
						})}
					</div>
				</div>

				<div className="p-4 border-t border-white/5 bg-neutral-900/50">
					{currentUser ? (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
									{getUserInitial()}
								</div>
								<div className="flex flex-col min-w-0">
									<span className="text-white text-sm font-bold truncate">{currentUser.displayName || "User"}</span>
									<span className="text-neutral-400 text-xs truncate">{currentUser.email}</span>
								</div>
							</div>
							<div className="grid grid-cols-2 gap-2 mt-2">
								<Link
									href="/settings"
									onClick={closeMenus}
									className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold transition-all"
								>
									<Settings className="w-4 h-4" />
									Settings
								</Link>
								<button
									onClick={() => {
										closeMenus();
										handleAuthAction();
									}}
									className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-red-400 text-xs font-semibold transition-all"
								>
									<LogOut className="w-4 h-4" />
									Logout
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => {
								closeMenus();
								router.push("/login");
							}}
							className="w-full bg-gradient-to-r from-primary to-accent hover:brightness-110 text-white font-bold py-3 rounded-lg shadow-lg transition-all"
						>
							Login
						</button>
					)}
				</div>
			</nav>

			{/* Main NavBar */}
			<nav
				className="flex items-center justify-between border-b border-white/5 shadow-sm h-[60px] w-full px-4 md:px-8 sticky top-0 z-[100] backdrop-blur-md bg-[#0e0e0e]/85"
			>
				{/* Mobile Hamburger toggle */}
				<button
					className="lg:hidden p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all duration-200"
					onClick={() => setIsMenuOpen((prev) => !prev)}
					aria-label="Toggle menu"
				>
					<Menu className="w-5 h-5 text-white" />
				</button>

				<Link
					href="/gpa-calculator"
					className="text-lg md:text-xl lg:text-2xl font-bold select-none cursor-pointer flex items-center transition-all duration-300 hover:scale-102 hover:brightness-105"
				>
					<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={24} height={24} className="mr-2 rounded-md object-cover" />
					<span className="text-gradient-brand font-extrabold tracking-tight">Bhemu Calculator</span>
				</Link>

				{/* Desktop Main Menu items */}
				<div className="hidden lg:flex items-center gap-1 h-full">
					{menuItems.map((item) => {
						const isActive = currentPath === item.path;
						const Icon = item.icon;
						return (
							<Link
								key={item.path}
								href={`/${item.path}`}
								className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
									isActive
										? "text-secondary bg-primary/5 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-secondary"
										: "text-neutral-400 hover:text-white hover:bg-white/5"
								}`}
							>
								<Icon className="w-4 h-4" />
								{item.name}
							</Link>
						);
					})}
				</div>

				{/* Auth status & Profile dropdown */}
				<div className="flex items-center gap-3">
					<Link
						href="/about"
						className="p-2 rounded-lg border border-white/10 text-neutral-400 hover:text-white hover:bg-white/5 transition-all duration-200 hidden md:flex"
						title="About Bhemu Calculator"
					>
						<Info className="w-5 h-5" />
					</Link>

					{currentUser ? (
						<div className="relative flex items-center" ref={profileDropdownRef}>
							<button
								className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold transition-all duration-200 border border-white/10 hover:scale-105 hover:ring-2 hover:ring-secondary/50"
								onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
								title="Profile Menu"
							>
								{getUserInitial()}
							</button>
							
							{isProfileDropdownOpen && (
								<div className="absolute top-[48px] right-0 bg-neutral-900 border border-white/5 rounded-xl shadow-2xl z-[1000] min-w-[220px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
									<div className="px-4 py-3 border-b border-white/5 bg-neutral-950/50">
										<div className="font-bold text-white text-sm truncate">
											{currentUser.displayName || "User"}
										</div>
										<div className="text-xs text-neutral-400 truncate">{currentUser.email}</div>
									</div>
									<div className="p-1">
										<button
											className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left rounded-lg transition-all duration-150 text-sm text-neutral-300 hover:bg-white/5 hover:text-white border-none bg-transparent cursor-pointer font-medium"
											onClick={() => handleProfileAction("profile")}
										>
											<User className="w-4 h-4 text-neutral-400" />
											Profile Settings
										</button>
										<button
											className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left rounded-lg transition-all duration-150 text-sm text-neutral-300 hover:bg-white/5 hover:text-white border-none bg-transparent cursor-pointer font-medium md:hidden"
											onClick={() => handleProfileAction("about")}
										>
											<Info className="w-4 h-4 text-neutral-400" />
											About
										</button>
										<button
											className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left rounded-lg transition-all duration-150 text-sm text-red-400 hover:bg-red-950/20 border-none bg-transparent cursor-pointer font-medium"
											onClick={() => handleProfileAction("logout")}
										>
											<LogOut className="w-4 h-4 text-red-400" />
											Logout
										</button>
									</div>
								</div>
							)}
						</div>
					) : (
						<button
							className="bg-gradient-to-r from-primary to-accent hover:brightness-110 text-white text-sm font-bold px-5 py-2 rounded-lg transition-all shadow-md cursor-pointer border-none"
							onClick={handleAuthAction}
						>
							Login
						</button>
					)}
				</div>
			</nav>
		</>
	);
}
