"use client";

import React, { useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/firebase/AuthContext";
import { useGpaData } from "@/hooks/GpaDataContext";
import SideBar from "./SideBar";
import TopBar from "./TopBar";
import ProfileDrawer from "@/components/ProfileDrawer";

const NO_LAYOUT_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/"];

export default function AppShell({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
	const pathname = usePathname();
	const { currentUser } = useAuth();
	const {
		allProfiles, activeProfile, sharedProfiles, mySharedProfiles, saving,
		updateActiveProfile, createProfile, deleteProfile,
		unshareProfile, copySharedProfile, verifyUMS,
	} = useGpaData();

	const showLayout = !NO_LAYOUT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

	const openSidebar = useCallback(() => setSidebarOpen(true), []);
	const closeSidebar = useCallback(() => setSidebarOpen(false), []);
	const openProfileDrawer = useCallback(() => setProfileDrawerOpen(true), []);
	const closeProfileDrawer = useCallback(() => setProfileDrawerOpen(false), []);

	const handleProfileSelect = useCallback((id: string | number) => {
		updateActiveProfile(id);
		setProfileDrawerOpen(false);
	}, [updateActiveProfile]);

	if (!showLayout) {
		return <>{children}</>;
	}

	return (
		<>
			{/* Ambient gradient blobs */}
			<div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
			<div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

			<SideBar isOpen={sidebarOpen} onClose={closeSidebar} />
			<TopBar onMenuOpen={openSidebar} onOpenProfileDrawer={openProfileDrawer} />
			<main className="md:ml-[250px] lg:ml-[280px] pt-16 min-h-screen">
				{children}
			</main>

			{/* Global Profile Drawer - accessible from any page via TopBar */}
			{currentUser && (
				<ProfileDrawer
					isOpen={profileDrawerOpen}
					onClose={closeProfileDrawer}
					profiles={allProfiles}
					currentProfile={activeProfile}
					onProfileSelect={handleProfileSelect}
					onCreateProfile={createProfile}
					onDeleteProfile={deleteProfile}
					onUnshareProfile={unshareProfile}
					onCopySharedProfile={copySharedProfile}
					onVerifyUMS={verifyUMS}
					sharedProfiles={sharedProfiles}
					mySharedProfiles={mySharedProfiles}
					isLoading={saving}
					currentUser={currentUser}
				/>
			)}
		</>
	);
}
