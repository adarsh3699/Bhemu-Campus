"use client";

import React, { useCallback, useState, useRef, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";
import { useGpaData } from "@/hooks/GpaDataContext";
import {
	Menu,
	LogOut,
	Info,
	ChevronRight,
	Settings,
	Layers,
	Check,
	Users,
} from "lucide-react";

// Map route segments to display names
const PAGE_LABELS: Record<string, string> = {
	dashboard: "Dashboard",
	"gpa-calculator": "GPA Calculator",
	"reappear-calculator": "Reappear Calculator",
	"gpa-goal-planner": "Goal Planner",
	settings: "Settings",
	about: "About",
};

interface TopBarProps {
	onMenuOpen: () => void;
	onOpenProfileDrawer?: () => void;
}

export default function TopBar({ onMenuOpen, onOpenProfileDrawer }: TopBarProps) {
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const profileRef = useRef<HTMLDivElement>(null);

	const pathname = usePathname();
	const router = useRouter();
	const { currentUser, logout } = useAuth();
	const { showMessage } = useMessage();

	// Profile data for quick switcher
	const { profiles, sharedWithMeProfiles, activeProfile, updateActiveProfile } = useGpaData();

	const currentSegment = pathname.split("/")[1] || "gpa-calculator";
	const pageLabel = PAGE_LABELS[currentSegment] ?? "Dashboard";

	// Compute quick-switch lists: up to 3 own profiles, up to 3 shared
	const recentOwnProfiles = useMemo(() => {
		const defaultProfile = profiles.find((p) => p.isDefault);
		const rest = profiles
			.filter((p) => !p.isDefault)
			.sort((a, b) => {
				const aTime = a.lastOpened ? (typeof (a.lastOpened as { toMillis?: () => number }).toMillis === "function" ? (a.lastOpened as { toMillis: () => number }).toMillis() : Number(a.lastOpened)) : 0;
				const bTime = b.lastOpened ? (typeof (b.lastOpened as { toMillis?: () => number }).toMillis === "function" ? (b.lastOpened as { toMillis: () => number }).toMillis() : Number(b.lastOpened)) : 0;
				return bTime - aTime;
			})
			.slice(0, defaultProfile ? 3 : 4);
		return defaultProfile ? [defaultProfile, ...rest] : rest;
	}, [profiles]);

	const recentSharedProfiles = useMemo(() => {
		return sharedWithMeProfiles.slice(0, 3);
	}, [sharedWithMeProfiles]);

	const hasMoreOwn = profiles.length > 4;
	const hasMoreShared = sharedWithMeProfiles.length > 3;
	const hasMoreProfiles = hasMoreOwn || hasMoreShared;

	// Close profile dropdown on outside click
	useEffect(() => {
		const handle = (e: MouseEvent) => {
			if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
				setIsProfileOpen(false);
			}
		};
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, []);

	const getUserInitial = useCallback(() => {
		if (!currentUser) return "U";
		const name = currentUser.displayName || currentUser.email;
		return name ? name.charAt(0).toUpperCase() : "U";
	}, [currentUser]);

	const handleLogout = useCallback(async () => {
		setIsProfileOpen(false);
		try {
			await logout();
			showMessage("Logged out successfully.", "info");
			router.push("/login");
		} catch (err) {
			console.error("Logout error:", err);
			showMessage("Logout failed.", "error");
		}
	}, [logout, showMessage, router]);

	const handleQuickSwitch = useCallback(
		(profileId: string | number) => {
			updateActiveProfile(profileId);
			setIsProfileOpen(false);
		},
		[updateActiveProfile]
	);

	const handleViewAllProfiles = useCallback(() => {
		setIsProfileOpen(false);
		if (onOpenProfileDrawer) {
			onOpenProfileDrawer();
		}
	}, [onOpenProfileDrawer]);

	return (
		<header className="fixed top-0 right-0 w-full md:w-[calc(100%-250px)] lg:w-[calc(100%-280px)] h-16 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-[80]">
			{/* Left: hamburger (mobile) + breadcrumb */}
			<div className="flex items-center gap-3">
				<button
					onClick={onMenuOpen}
					className="md:hidden p-2 rounded-lg border border-white/10 text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
					aria-label="Open sidebar"
				>
					<Menu className="w-5 h-5" />
				</button>

				{/* Breadcrumb */}
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					{currentSegment !== "dashboard" && (
						<>
							<Link href="/dashboard" className="hidden sm:inline hover:text-white transition-colors">
								Home
							</Link>
							<ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
						</>
					)}
					<span className="font-semibold text-primary">{pageLabel}</span>
				</div>
			</div>

			{/* Right: actions */}
			<div className="flex items-center gap-2">


				{/* Profile */}
				{currentUser ? (
					<div className="relative" ref={profileRef}>
						<button
							onClick={() => setIsProfileOpen((p) => !p)}
							className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm border border-white/10 hover:ring-2 hover:ring-primary/40 transition-all"
							title="Profile menu"
						>
							{getUserInitial()}
						</button>

						{isProfileOpen && (
							<div className="absolute top-10 right-0 w-72 bg-neutral-900 border border-white/8 rounded-xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
								{/* User info header */}
								<div className="px-4 py-3 border-b border-white/5 bg-neutral-950/60">
									<p className="text-white text-sm font-semibold truncate">
										{currentUser.displayName || "User"}
									</p>
									<p className="text-muted-foreground text-xs truncate mt-0.5">
										{currentUser.email}
									</p>
								</div>

								{/* Quick Profile Switcher */}
								{profiles.length > 0 && (
									<div className="px-2 py-2 border-b border-white/5">
										{/* My Workspaces */}
										<p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
											My Academic Workspaces
										</p>
										{recentOwnProfiles.map((profile) => {
											const isActive = activeProfile === profile.id;
											return (
												<button
													key={profile.id}
													onClick={() => handleQuickSwitch(profile.id)}
													className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-all ${
														isActive
															? "bg-primary/10 text-white"
															: "text-neutral-300 hover:bg-white/5 hover:text-white"
													}`}
												>
													<span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] flex-shrink-0 ${
														isActive
															? "bg-primary/20 text-primary"
															: "bg-white/5 text-neutral-500"
													}`}>
														{isActive ? <Check className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
													</span>
													<span className="truncate text-xs font-medium">{profile.name}</span>
													{profile.isDefault && (
														<span className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
															Default
														</span>
													)}
												</button>
											);
										})}

										{/* Shared Profiles */}
										{recentSharedProfiles.length > 0 && (
											<>
												<p className="px-2 pt-2.5 pb-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
													Shared With Me
												</p>
												{recentSharedProfiles.map((profile) => {
													const isActive = activeProfile === profile.id;
													return (
														<button
															key={`shared-${profile.id}`}
															onClick={() => handleQuickSwitch(profile.id)}
															className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-all ${
																isActive
																	? "bg-primary/10 text-white"
																	: "text-neutral-300 hover:bg-white/5 hover:text-white"
															}`}
														>
															<span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] flex-shrink-0 ${
																isActive
																	? "bg-primary/20 text-primary"
																	: "bg-white/5 text-neutral-500"
															}`}>
																{isActive ? <Check className="w-3 h-3" /> : <Users className="w-3 h-3" />}
															</span>
															<span className="truncate text-xs font-medium">{profile.name}</span>
															<span className={`ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase flex-shrink-0 ${
																profile.permission === "read"
																	? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
																	: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
															}`}>
																{profile.permission === "read" ? "Read" : "Edit"}
															</span>
														</button>
													);
												})}
											</>
										)}

										{/* View All Profiles button */}
										{(hasMoreProfiles || onOpenProfileDrawer) && (
											<button
												onClick={handleViewAllProfiles}
												className="flex items-center justify-center gap-1.5 w-full mt-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-all border border-dashed border-white/10 hover:border-primary/30"
											>
												<Layers className="w-3.5 h-3.5" />
												View All Profiles
											</button>
										)}
									</div>
								)}

								{/* Menu items */}
								<div className="p-1">
									<button
										onClick={() => { setIsProfileOpen(false); router.push("/settings"); }}
										className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-all"
									>
										<Settings className="w-4 h-4 text-neutral-400" />
										Settings
									</button>
									<button
										onClick={() => { setIsProfileOpen(false); router.push("/about"); }}
										className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-all"
									>
										<Info className="w-4 h-4 text-neutral-400" />
										About
									</button>
									<button
										onClick={handleLogout}
										className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/20 transition-all"
									>
										<LogOut className="w-4 h-4" />
										Sign Out
									</button>
								</div>
							</div>
						)}
					</div>
				) : (
					<button
						onClick={() => router.push("/login")}
						className="text-sm font-semibold bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-lg transition-all"
					>
						Sign In
					</button>
				)}
			</div>
		</header>
	);
}
