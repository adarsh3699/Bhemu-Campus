"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/firebase/config";
import { useMessage } from "@/components/common/MessageProvider";

function ResetPasswordForm() {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();
	const { showMessage } = useMessage();

	const [oobCode] = useState<string | null>(() => searchParams.get("oobCode"));

	useEffect(() => {
		if (!oobCode) {
			showMessage("Invalid or missing action code. Please request a new password reset link.", "error");
		}
	}, [oobCode, showMessage]);

	// Password strength checks
	const hasLength = password.length >= 8;
	const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
	const hasNumberSymbol = /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
	const isUnique = password.length > 0;
	const isStrong = hasLength && hasUpperLower && hasNumberSymbol;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!oobCode) {
			showMessage("Cannot reset password without a valid reset code.", "error");
			return;
		}

		if (!password || !confirmPassword) {
			showMessage("Please enter and confirm your new password.", "warning");
			return;
		}

		if (password !== confirmPassword) {
			showMessage("Passwords do not match.", "error");
			return;
		}

		if (!isStrong) {
			showMessage("Please meet all password strength requirements.", "warning");
			return;
		}

		try {
			setLoading(true);
			await confirmPasswordReset(auth, oobCode, password);
			showMessage("Your password has been successfully reset! Redirecting to login...", "success");
			setTimeout(() => {
				router.push("/login");
			}, 2000);
		} catch (err: unknown) {
			console.error("Password reset error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to reset password. The link may have expired.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="w-full max-w-md">
			{/* Intro Text */}
			<div className="text-center mb-10">
				<h1 className="text-white text-3xl md:text-4xl font-bold tracking-tight mb-3">
					Create New Password
				</h1>
				<p className="text-muted-foreground text-base">
					Protect your account with a cosmic-grade secure password.
				</p>
			</div>

			{/* Password Form Card */}
			<div className="bg-surface-elevated border border-border shadow-2xl rounded-xl p-8 bg-neutral-900/50 backdrop-blur-md">
				<form className="space-y-6" onSubmit={handleSubmit}>
					{/* New Password Field */}
					<div className="flex flex-col gap-2">
						<label className="text-muted-foreground text-sm font-semibold">New Password</label>
						<div className="relative group">
							<input
								className="w-full bg-background border border-border text-white rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground bg-[#1a1a1a]"
								placeholder="••••••••"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
							<button
								className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-dark transition-colors"
								type="button"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
							</button>
						</div>
					</div>

					{/* Password Strength Indicator */}
					<div className="space-y-3">
						<div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
							<span className="text-muted-foreground">Security Strength</span>
							<span
								className={
									isStrong
										? "text-success"
										: password.length > 0
											? "text-warning"
											: "text-muted-foreground"
								}
							>
								{isStrong ? "Strong" : password.length > 0 ? "Medium" : "—"}
							</span>
						</div>
						<div className="grid grid-cols-3 gap-2 h-1.5">
							<div
								className={`rounded-full h-full transition-colors ${hasLength ? "bg-gradient-to-r from-primary to-accent" : "bg-neutral-800"}`}
							/>
							<div
								className={`rounded-full h-full transition-colors ${hasUpperLower ? "bg-gradient-to-r from-primary to-accent" : "bg-neutral-800"}`}
							/>
							<div
								className={`rounded-full h-full transition-colors ${hasNumberSymbol ? "bg-gradient-to-r from-primary to-accent" : "bg-neutral-800"}`}
							/>
						</div>
						<ul className="grid grid-cols-2 gap-y-2 mt-4 text-neutral-400">
							<li className="flex items-center gap-2 text-xs">
								<CheckCircle2
									className={`size-3.5 ${hasLength ? "text-secondary" : "text-neutral-800"}`}
								/>
								8+ characters
							</li>
							<li className="flex items-center gap-2 text-xs">
								<CheckCircle2
									className={`size-3.5 ${hasUpperLower ? "text-secondary" : "text-neutral-800"}`}
								/>
								Lowercase &amp; Uppercase
							</li>
							<li className="flex items-center gap-2 text-xs">
								<CheckCircle2
									className={`size-3.5 ${hasNumberSymbol ? "text-secondary" : "text-neutral-800"}`}
								/>
								Numbers &amp; Symbols
							</li>
							<li className="flex items-center gap-2 text-xs">
								<CheckCircle2
									className={`size-3.5 ${isUnique ? "text-secondary" : "text-neutral-800"}`}
								/>
								Unique password
							</li>
						</ul>
					</div>

					{/* Confirm Password Field */}
					<div className="flex flex-col gap-2">
						<label className="text-muted-foreground text-sm font-semibold">Confirm Password</label>
						<div className="relative group">
							<input
								className="w-full bg-background border border-border text-white rounded-lg px-4 py-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-muted-foreground bg-[#1a1a1a]"
								placeholder="••••••••"
								type={showConfirmPassword ? "text" : "password"}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
							/>
							<button
								className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-dark transition-colors"
								type="button"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							>
								{showConfirmPassword ? (
									<EyeOff className="size-5" />
								) : (
									<Eye className="size-5" />
								)}
							</button>
						</div>
					</div>

					{/* Submit Button */}
					<button
						className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
						type="submit"
						disabled={loading || !oobCode}
					>
						{loading ? (
							<>
								<Loader2 className="w-5 h-5 animate-spin" />
								<span>Resetting Password...</span>
							</>
						) : (
							<>
								<span>Update Password</span>
								<ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
							</>
						)}
					</button>
				</form>
			</div>

			{/* Footer Links */}
			<div className="mt-8 text-center space-y-4">
				<Link
					href="/login"
					className="inline-flex items-center gap-2 text-muted-foreground hover:text-secondary-dark transition-colors text-sm font-medium"
				>
					<ArrowLeft className="size-4" />
					Back to login
				</Link>
				<div className="pt-8 flex justify-center gap-6">
					<div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-widest font-bold">
						<Lock className="size-4" />
						End-to-End Encrypted
					</div>
					<div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-widest font-bold">
						<ShieldCheck className="size-4" />
						Secure Auth
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<div className="min-h-screen bg-background font-sans text-white">
			{/* Background glows */}
			<div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
				<div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
				<div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />
			</div>

			{/* Navbar */}
			<header className="flex items-center justify-between border-b border-border px-6 md:px-10 py-4">
				<div className="flex items-center gap-4">
					<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={28} height={28} className="rounded-md object-cover" />
					<h2 className="text-white text-xl font-bold tracking-tight">Bhemu Calculator</h2>
				</div>
				<div className="flex items-center gap-6">
					<span className="text-muted-foreground text-sm hidden md:block">
						Need help?{" "}
						<Link href="/support" className="text-secondary hover:underline">
							Contact Support
						</Link>
					</span>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<Suspense fallback={
					<div className="flex flex-col items-center gap-3 py-12">
						<Loader2 className="w-10 h-10 animate-spin text-primary" />
						<p className="text-neutral-400">Loading password reset form...</p>
					</div>
				}>
					<ResetPasswordForm />
				</Suspense>
			</main>
		</div>
	);
}
