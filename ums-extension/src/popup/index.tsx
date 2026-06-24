import { useEffect, useState, useCallback } from "react";
import { signInWithEmail, signInWithCalcSession, firebaseSignOut, getCurrentUser } from "~lib/firebase";
import { loadUserProfiles } from "~lib/firebaseSync";
import type { SyncStatus } from "~lib/types";
import "./style.css";

const LAST_PROFILE_KEY = 'ums_last_profile_id';

interface Profile {
	id: string;
	name: string;
}

function Popup() {
	const [status, setStatus] = useState<SyncStatus>({ lastSyncedAt: null, status: "idle" });
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);
	const [authError, setAuthError] = useState("");
	const [showManualLogin, setShowManualLogin] = useState(false);
	const [profiles, setProfiles] = useState<Profile[]>([]);
	const [selectedProfileId, setSelectedProfileId] = useState("");
	const [profilesLoading, setProfilesLoading] = useState(false);

	const fetchStatus = useCallback(() => {
		chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
			if (res) setStatus(res);
		});
	}, []);

	const loadProfiles = useCallback(async () => {
		setProfilesLoading(true);
		try {
			const list = await loadUserProfiles();
			setProfiles(list);
			if (list.length > 0) {
				const saved = await chrome.storage.local.get(LAST_PROFILE_KEY);
				const lastId = saved[LAST_PROFILE_KEY] as string | undefined;
				const match = lastId && list.some(p => p.id === lastId);
				setSelectedProfileId(match ? lastId : list[0].id);
			}
		} catch {
			// silently ignore
		} finally {
			setProfilesLoading(false);
		}
	}, []);

	useEffect(() => {
		// On popup open: always show idle with lastSyncedAt — never show stale "success".
		// Don't clear background storage so lastSyncedAt persists across opens.
		chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
			if (!res) return;
			setStatus({ ...res, status: res.status === "success" ? "idle" : res.status });
		});
		getCurrentUser().then((user) => {
			setIsLoggedIn(!!user);
			setAuthLoading(false);
			if (user) loadProfiles();
		});
	}, [loadProfiles]);

	const handleCalcLogin = async () => {
		setAuthError("");
		setAuthLoading(true);
		try {
			await signInWithCalcSession();
			setIsLoggedIn(true);
			await loadProfiles();
		} catch (err: unknown) {
			setAuthError(err instanceof Error ? err.message : "Sign-in failed");
			setShowManualLogin(true);
		} finally {
			setAuthLoading(false);
		}
	};

	const handleEmailLogin = async () => {
		setAuthError("");
		setAuthLoading(true);
		try {
			await signInWithEmail(email, password);
			setIsLoggedIn(true);
			await loadProfiles();
		} catch (err: unknown) {
			setAuthError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setAuthLoading(false);
		}
	};

	const handleLogout = async () => {
		await firebaseSignOut();
		chrome.storage.local.remove(LAST_PROFILE_KEY);
		setIsLoggedIn(false);
		setProfiles([]);
		setSelectedProfileId("");
		setShowManualLogin(false);
		setAuthError("");
	};

	// Poll status every second while syncing, stop when terminal state reached
	const pollUntilDone = useCallback(() => {
		const interval = setInterval(() => {
			chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
				if (!res) return;
				setStatus(res);
				if (res.status !== "syncing") clearInterval(interval);
			});
		}, 800);
		// Safety: always stop polling after 60s
		setTimeout(() => clearInterval(interval), 60000);
	}, []);

	const handleSyncGrades = () => {
		if (!selectedProfileId) return;
		setStatus({ ...status, status: "syncing", message: "Starting grades & marks sync..." });
		chrome.runtime.sendMessage({ type: "SYNC_GRADES", profileId: selectedProfileId });
		pollUntilDone();
	};

	const handleSyncAttendance = () => {
		if (!selectedProfileId) return;
		setStatus({ ...status, status: "syncing", message: "Starting attendance sync..." });
		chrome.runtime.sendMessage({ type: "SYNC_ATTENDANCE", profileId: selectedProfileId });
		pollUntilDone();
	};

	const handleLoginToUMS = () => {
		setStatus({ ...status, status: "syncing", message: "Opening UMS login..." });
		chrome.runtime.sendMessage({ type: "START_LOGIN" }, () => {
			// Background resolves only after login detected — fetch status immediately
			fetchStatus();
		});
	};

	// ── Loading ──────────────────────────────────────────────────
	if (authLoading) {
		return (
			<div className="popup">
				<div className="loading-screen">
					<div className="spinner" />
					<p>Connecting…</p>
				</div>
			</div>
		);
	}

	// ── Not logged in ────────────────────────────────────────────
	if (!isLoggedIn) {
		return (
			<div className="popup">
				<div className="brand">
					<span className="brand-dot" />
					<span className="brand-name">UMS Data Sync</span>
				</div>

				{!showManualLogin ? (
					<div className="auth-primary">
						<div className="auth-icon">🔗</div>
						<h2 className="auth-title">Sign in instantly</h2>
						<p className="auth-sub">Uses your existing Bhemu Calculator login — no password needed.</p>

						{authError && <p className="error">{authError}</p>}

						<button onClick={handleCalcLogin} className="btn-calc-session" disabled={authLoading}>
							{authLoading ? (
								<>
									<span className="btn-spinner" /> Connecting…
								</>
							) : (
								"Continue with Bhemu Calculator"
							)}
						</button>

						<button
							className="btn-link"
							onClick={() => {
								setAuthError("");
								setShowManualLogin(true);
							}}
						>
							Sign in with email instead
						</button>
					</div>
				) : (
					<div className="auth-secondary">
						<button
							className="btn-back"
							onClick={() => {
								setAuthError("");
								setShowManualLogin(false);
							}}
						>
							← Back
						</button>
						<h2 className="auth-title">Sign in with email</h2>

						<div className="form">
							<input
								type="email"
								placeholder="Email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
							/>
							<input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleEmailLogin()}
							/>
							{authError && <p className="error">{authError}</p>}
							<button onClick={handleEmailLogin} className="btn-primary" disabled={authLoading}>
								{authLoading ? "Signing in…" : "Sign In"}
							</button>
						</div>
					</div>
				)}
			</div>
		);
	}

	// ── Logged in ────────────────────────────────────────────────
	return (
		<div className="popup">
			<div className="brand">
				<span className="brand-dot" />
				<span className="brand-name">UMS Data Sync</span>
				<button onClick={handleLogout} className="btn-signout" title="Sign Out">
					↩
				</button>
			</div>

			<div className="status-card">
				<div className={`status-indicator ${status.status}`} />
				<div className="status-text">
					<p className="status-label">
						{status.status === "idle" && (status.lastSyncedAt ? "Last synced" : "Ready to sync")}
						{status.status === "syncing" && "Syncing…"}
						{status.status === "success" && "Synced successfully"}
						{status.status === "error" && "Sync error"}
						{status.status === "needs_login" && "UMS login required"}
					</p>
					{status.message && (
						<p className={status.status === "error" ? "status-message error-detail" : "status-message"}>
							{status.message}
						</p>
					)}
					{status.lastSyncedAt && (
						<p className="status-time">Last: {new Date(status.lastSyncedAt).toLocaleString()}</p>
					)}
				</div>
			</div>

			<div className="profile-section">
				<label className="profile-label">Sync to profile</label>
				{profilesLoading ? (
					<p className="loading-small">Loading profiles…</p>
				) : profiles.length === 0 ? (
					<p className="error">No profiles found. Create one in Bhemu Calculator first.</p>
				) : (
					<select
						className="profile-select"
						value={selectedProfileId}
						onChange={(e) => {
						setSelectedProfileId(e.target.value);
						chrome.storage.local.set({ [LAST_PROFILE_KEY]: e.target.value });
					}}
					>
						{profiles.map((p) => (
							<option key={p.id} value={p.id}>
								{p.name}
							</option>
						))}
					</select>
				)}
			</div>

			<div className="actions">
				{status.status === "needs_login" ? (
					<button onClick={handleLoginToUMS} className="btn-primary">
						Log in to UMS
					</button>
				) : (
					<>
						<button
							onClick={handleSyncGrades}
							className="btn-primary"
							disabled={status.status === "syncing" || !selectedProfileId}
						>
							{status.status === "syncing" ? "Syncing…" : "Sync Everything"}
						</button>
						<button
							onClick={handleSyncAttendance}
							className="btn-secondary"
							disabled={status.status === "syncing" || !selectedProfileId}
						>
							Sync Attendance Only
						</button>
						{process.env.PLASMO_PUBLIC_DEV_MODE === "true" && (
							<button
								onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL("tabs/data-viewer.html") })}
								className="btn-secondary"
							>
								View Last Sync Data
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
}

export default Popup;
