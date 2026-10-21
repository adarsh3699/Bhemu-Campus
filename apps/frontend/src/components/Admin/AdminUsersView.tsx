"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@bhemu/firebase";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/contexts/MessageContext";
import { changeUserRole, listAdminUsers, type AdminUserRecord } from "@/lib/adminUsers";

function initials(user: AdminUserRecord): string {
	return (user.displayName || user.email || "U")
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("") || "U";
}

function formatDate(value: string | null): string {
	if (!value) return "Never";
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? "Unknown"
		: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}

function RoleBadge({ role }: { role: UserRole }) {
	return (
		<span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
			role === "admin"
				? "border-amber-300/25 bg-amber-300/10 text-amber-200"
				: role === "moderator"
					? "border-violet-300/25 bg-violet-300/10 text-violet-200"
					: "border-white/10 bg-white/[0.05] text-white/70"
		}`}>
			{role === "admin" && <ShieldCheck className="size-3.5" aria-hidden="true" />}
			{role.charAt(0).toUpperCase() + role.slice(1)}
		</span>
	);
}

function RoleDialog({
	user,
	onClose,
	onConfirm,
	saving,
}: {
	user: AdminUserRecord;
	onClose: () => void;
	onConfirm: () => void;
	saving: boolean;
}) {
	const nextRole = user.role === "student" ? "moderator" : "student";
	return (
		<div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="role-dialog-title">
			<div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121819] p-5 shadow-2xl shadow-black/60 sm:p-6">
				<div className="flex items-start justify-between gap-4">
					<div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Role management</p><h2 id="role-dialog-title" className="mt-2 text-xl font-bold text-white">Change user role?</h2></div>
					<button type="button" onClick={onClose} disabled={saving} className="flex size-9 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close dialog"><X className="size-5" aria-hidden="true" /></button>
				</div>
				<div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{initials(user)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.displayName}</p><p className="truncate text-xs text-white/45">{user.email ?? "No email"}</p></div></div><div className="mt-4 flex items-center gap-3 text-sm"><RoleBadge role={user.role} /><span className="text-white/35">→</span><RoleBadge role={nextRole} /></div></div>
				<p className="mt-4 text-sm leading-6 text-white/55">This changes only the application role. Admin accounts are protected and cannot be changed from this page.</p>
				<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-white/60 hover:bg-white/[0.05] hover:text-white">Cancel</button><button type="button" onClick={onConfirm} disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50">{saving && <RefreshCw className="size-4 animate-spin" aria-hidden="true" />} {saving ? "Saving…" : "Confirm change"}</button></div>
			</div>
		</div>
	);
}

export default function AdminUsersView() {
	const { currentUser, appRole, appRoleLoading } = useAuth();
	const { showMessage } = useMessage();
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [users, setUsers] = useState<AdminUserRecord[]>([]);
	const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
	const [loading, setLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const requestIdRef = useRef(0);

	useEffect(() => {
		const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
		return () => window.clearTimeout(timer);
	}, [search]);

	useEffect(() => {
		if (!appRoleLoading && appRole !== "admin") router.replace("/dashboard");
	}, [appRole, appRoleLoading, router]);

	const loadUsers = useCallback(async () => {
		if (!currentUser || appRole !== "admin") return;
		const requestId = ++requestIdRef.current;
		setLoading(true);
		setError(null);
		try {
			const result = await listAdminUsers(debouncedSearch);
			if (requestId !== requestIdRef.current) return;
			setUsers(result.users);
		} catch (loadError) {
			if (requestId !== requestIdRef.current) return;
			setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
		} finally {
			if (requestId === requestIdRef.current) {
				setLoading(false);
				setHasLoaded(true);
			}
		}
	}, [appRole, currentUser, debouncedSearch]);

	useEffect(() => {
		if (appRoleLoading || appRole !== "admin") return;
		const timer = window.setTimeout(() => void loadUsers(), 0);
		return () => {
			window.clearTimeout(timer);
			requestIdRef.current += 1;
		};
	}, [appRole, appRoleLoading, loadUsers]);

	const confirmRoleChange = async () => {
		if (!currentUser || !selectedUser) return;
		const nextRole = selectedUser.role === "student" ? "moderator" : "student";
		setSaving(true);
		try {
			const updated = await changeUserRole(currentUser, selectedUser, nextRole);
			setUsers((current) => current.map((user) => user.uid === updated.uid ? updated : user));
			setSelectedUser(null);
			showMessage("User role updated successfully.", "success");
		} catch (changeError) {
			showMessage(changeError instanceof Error ? changeError.message : "Role update failed.", "error");
		} finally {
			setSaving(false);
		}
	};

	if (appRoleLoading || (appRole === "admin" && !hasLoaded)) {
		return <div className="mx-auto max-w-7xl p-5 sm:p-8"><div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.06]" /><div className="mt-8 h-96 animate-pulse rounded-2xl bg-white/[0.04]" /></div>;
	}
	if (appRole !== "admin") return null;

	return (
		<div className="mx-auto max-w-7xl p-5 pb-12 sm:p-8 sm:pb-16">
			<header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100/80"><ShieldCheck className="size-3.5" aria-hidden="true" /> Admin workspace</div><h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">User roles</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">Search a user and switch between Student and Moderator access.</p></div><button type="button" onClick={() => void loadUsers()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/75 hover:border-primary/40 hover:bg-primary/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh</button></header>
			<section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101516]/90 shadow-[0_18px_50px_rgba(0,0,0,0.22)]" aria-labelledby="users-list-title" aria-busy={loading}>
				<div className="flex flex-col gap-4 border-b border-white/[0.08] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 id="users-list-title" className="text-base font-semibold text-white">All users</h2><p className="mt-1 text-xs text-white/40">Search by the beginning of a name or email.</p></div><label className="relative w-full sm:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" aria-hidden="true" /><span className="sr-only">Search users</span><input type="text" inputMode="search" spellCheck={false} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email…" className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary focus:ring-2 focus:ring-primary/20" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white" aria-label="Clear search"><X className="size-4" aria-hidden="true" /></button>}</label></div>
				{error && <div className="m-4 rounded-xl border border-red-300/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-100" role="alert">{error}</div>}
				<div className="relative">
					{loading && hasLoaded && <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center border-b border-primary/20 bg-[#101516]/80 px-4 py-2 text-xs font-medium text-primary backdrop-blur-sm" role="status"><RefreshCw className="mr-2 size-3.5 animate-spin" aria-hidden="true" />Updating users…</div>}
					{loading && users.length === 0 ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />)}</div> : users.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><UserRound className="mb-3 size-8 text-white/25" aria-hidden="true" /><p className="text-sm font-semibold text-white">No users found</p><p className="mt-1 text-xs text-white/40">Try a different name or email prefix.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><caption className="sr-only">User roles</caption><thead className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] uppercase tracking-[0.12em] text-white/40"><tr><th scope="col" className="px-5 py-3 font-semibold">User</th><th scope="col" className="px-3 py-3 font-semibold">Role</th><th scope="col" className="px-3 py-3 font-semibold">Last login</th><th scope="col" className="px-5 py-3 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{users.map((user) => <tr key={user.uid} className="transition-colors hover:bg-white/[0.025]"><td className="px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-xs font-bold text-white/75">{initials(user)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{user.displayName}</p><p className="truncate text-xs text-white/40">{user.email ?? "No email"}</p></div></div></td><td className="px-3 py-4"><RoleBadge role={user.role} /></td><td className="px-3 py-4 text-xs tabular-nums text-white/50">{formatDate(user.lastLoginAt)}</td><td className="px-5 py-4 text-right">{user.role === "admin" ? <span className="text-xs text-white/30">Protected</span> : <button type="button" onClick={() => setSelectedUser(user)} className="min-h-9 rounded-lg border border-white/10 px-3 text-xs font-semibold text-white/70 hover:border-primary/40 hover:bg-primary/10 hover:text-white">Change role</button>}</td></tr>)}</tbody></table></div>}
				</div>
				<p className="border-t border-white/[0.08] px-4 py-3 text-xs text-white/35 sm:px-5">Showing up to 50 users. Use search to find a specific account.</p>
			</section>
			{selectedUser && <RoleDialog user={selectedUser} onClose={() => setSelectedUser(null)} onConfirm={() => void confirmRoleChange()} saving={saving} />}
		</div>
	);
}
