import { Suspense } from "react";
import type { Metadata } from "next";
import AdminUsersView from "@/components/Admin/AdminUsersView";

export const metadata: Metadata = {
	title: "User Management — bCampus",
	description: "Manage bCampus student and moderator roles.",
	robots: { index: false, follow: false },
};

function AdminUsersFallback() {
	return <div className="mx-auto max-w-7xl p-5 sm:p-8"><div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.06]" /><div className="mt-8 h-96 animate-pulse rounded-2xl bg-white/[0.04]" /></div>;
}

export default function AdminUsersPage() {
	return <Suspense fallback={<AdminUsersFallback />}><AdminUsersView /></Suspense>;
}
