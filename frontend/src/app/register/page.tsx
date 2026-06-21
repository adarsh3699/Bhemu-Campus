"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AuthShowcase } from "@/components/auth-showcase";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";

export default function RegisterPage() {
	const [fullname, setFullname] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const { signup, signInWithGoogle, currentUser } = useAuth();
	const { showMessage } = useMessage();
	const router = useRouter();

	// Redirect if user is already logged in
	useEffect(() => {
		if (currentUser) {
			router.replace("/gpa-calculator");
		}
	}, [currentUser, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!fullname.trim() || !email.trim() || !password || !confirmPassword) {
			showMessage("Please fill in all fields.", "warning");
			return;
		}

		if (password !== confirmPassword) {
			showMessage("Passwords do not match.", "error");
			return;
		}

		if (password.length < 6) {
			showMessage("Password should be at least 6 characters.", "error");
			return;
		}

		try {
			setLoading(true);
			await signup(email, password, fullname);
			showMessage("Account created successfully! Welcome to your workspace.", "success");
			router.push("/gpa-calculator");
		} catch (err: unknown) {
			console.error("Signup error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to create account.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignUp = async () => {
		try {
			setLoading(true);
			await signInWithGoogle();
			showMessage("Successfully authenticated with Google. Welcome!", "success");
			router.push("/gpa-calculator");
		} catch (err: unknown) {
			console.error("Google auth error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to authenticate with Google.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen w-full flex-row overflow-hidden">
			<AuthShowcase
				title={
					<>
						Join thousands of <br />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
							high-achievers
						</span>
					</>
				}
				subtitle="Manage your grades, calculate academic targets, and collaborate instantly with your study group."
				testimonial={true}
			/>

			{/* Right Side: Registration Form */}
			<div className="flex flex-1 flex-col justify-center items-center p-6 lg:p-12 relative bg-background w-full lg:w-1/2 overflow-y-auto">
				{/* Mobile Header Logo (Visible only on mobile) */}
				<div className="lg:hidden absolute top-6 left-6 flex items-center gap-2">
					<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={32} height={32} className="rounded-lg object-cover" />
					<span className="text-white text-xl font-bold">Bhemu Calculator</span>
				</div>

				<div className="w-full max-w-md flex flex-col gap-6 mt-12 lg:mt-0">
					{/* Header */}
					<div className="flex flex-col gap-2">
						<h2 className="text-3xl font-bold text-white tracking-tight">Create your account</h2>
						<p className="text-gray-400">Start your academic journey with us today.</p>
					</div>

					{/* Social Buttons */}
					<div className="grid grid-cols-2 gap-4">
						<button 
							type="button"
							onClick={handleGoogleSignUp}
							disabled={loading}
							className="flex items-center justify-center gap-2 h-12 rounded-lg border border-white/10 hover:bg-white/5 transition-colors bg-transparent text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg className="w-5 h-5" viewBox="0 0 24 24">
								<path
									fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
							<span>Google</span>
						</button>
						<button 
							type="button"
							className="flex items-center justify-center gap-2 h-12 rounded-lg border border-white/10 hover:bg-white/5 transition-colors bg-transparent text-white font-medium text-sm opacity-60 cursor-not-allowed"
							disabled={true}
						>
							<svg className="w-5 h-5" fill="#0A66C2" viewBox="0 0 24 24">
								<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
							</svg>
							<span>LinkedIn</span>
						</button>
					</div>

					{/* Divider */}
					<div className="relative flex py-2 items-center">
						<div className="flex-grow border-t border-white/10" />
						<span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-medium tracking-wider">
							Or continue with
						</span>
						<div className="flex-grow border-t border-white/10" />
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="flex flex-col gap-4">
						{/* Full Name */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="fullname" className="text-slate-200 text-sm font-medium">
								Full Name
							</label>
							<div className="relative">
								<input
									id="fullname"
									type="text"
									placeholder="e.g. Alex Sterling"
									value={fullname}
									onChange={(e) => setFullname(e.target.value)}
									required
									className="w-full h-12 px-4 rounded-lg bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								/>
								<User className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
							</div>
						</div>

						{/* Email */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="email" className="text-slate-200 text-sm font-medium">
								Email Address
							</label>
							<div className="relative">
								<input
									id="email"
									type="email"
									placeholder="name@university.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full h-12 px-4 rounded-lg bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								/>
								<Mail className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
							</div>
						</div>

						{/* Password */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="password" className="text-slate-200 text-sm font-medium">
								Password
							</label>
							<div className="relative group">
								<input
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="••••••••"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="w-full h-12 px-4 rounded-lg bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-3 text-slate-400 hover:text-secondary-dark transition-colors"
								>
									{showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
								</button>
							</div>
						</div>

						{/* Confirm Password */}
						<div className="flex flex-col gap-1.5">
							<label htmlFor="confirm-password" className="text-slate-200 text-sm font-medium">
								Confirm Password
							</label>
							<div className="relative group">
								<input
									id="confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									placeholder="••••••••"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									className="w-full h-12 px-4 rounded-lg bg-[#1a1a1a] border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-3 text-slate-400 hover:text-secondary-dark transition-colors"
								>
									{showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
								</button>
							</div>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading}
							className="mt-4 w-full h-12 bg-gradient-to-r from-primary to-accent hover:brightness-110 text-white font-bold rounded-lg shadow-lg shadow-primary/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
						>
							{loading ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									<span>Creating Account...</span>
								</>
							) : (
								<>
									<span>Create Account</span>
									<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
								</>
							)}
						</button>

						{/* Terms */}
						<p className="text-xs text-center text-slate-400 mt-2">
							By creating an account, you agree to our{" "}
							<a
								href="#"
								className="text-secondary hover:text-secondary-dark transition-colors underline decoration-transparent hover:decoration-current"
							>
								Terms of Service
							</a>{" "}
							and{" "}
							<a
								href="#"
								className="text-secondary hover:text-secondary-dark transition-colors underline decoration-transparent hover:decoration-current"
							>
								Privacy Policy
							</a>
							.
						</p>
					</form>

					{/* Login Redirect */}
					<div className="text-center mt-4">
						<p className="text-slate-300 text-sm">
							Already have an account?{" "}
							<Link
								href="/login"
								className="text-secondary font-semibold hover:text-secondary-dark transition-colors"
							>
								Log in
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
