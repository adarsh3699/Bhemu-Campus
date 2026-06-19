"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AuthShowcase } from "@/components/auth-showcase";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const { login, signInWithGoogle, currentUser } = useAuth();
	const { showMessage } = useMessage();
	const router = useRouter();

	// Redirect if user is already logged in
	useEffect(() => {
		if (currentUser) {
			router.replace("/dashboard");
		}
	}, [currentUser, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim() || !password.trim()) {
			showMessage("Please enter both email and password.", "warning");
			return;
		}

		try {
			setLoading(true);
			await login(email, password);
			showMessage("Welcome back! Loading your workspace...", "success");
			router.push("/dashboard");
		} catch (err: unknown) {
			console.error("Login error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to log in. Please check your credentials.", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		try {
			setLoading(true);
			await signInWithGoogle();
			showMessage("Successfully authenticated with Google. Welcome back!", "success");
			router.push("/dashboard");
		} catch (err: unknown) {
			console.error("Google auth error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to log in with Google.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex w-full min-h-screen">
			<AuthShowcase
				title="Master your academic goals with ease"
				subtitle="Collaborate on GPA goals, manage reappears, and plan your career with precision."
				testimonial={true}
			/>

			{/* Right Side: Login Form */}
			<div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-background relative overflow-hidden">
				{/* Mobile Background Elements */}
				<div
					className="lg:hidden absolute top-0 left-0 w-full h-full pointer-events-none"
					style={{
						background: "radial-gradient(circle at center, rgba(3, 152, 172, 0.15) 0%, transparent 70%)",
					}}
				/>

				<div className="w-full max-w-md z-10">
					<div
						className="p-8 sm:p-10 rounded-2xl"
						style={{
							background: "rgba(255, 255, 255, 0.03)",
							backdropFilter: "blur(12px)",
							border: "1px solid rgba(255, 255, 255, 0.1)",
						}}
					>
						<div className="mb-10 text-center">
							<div className="lg:hidden mb-6 flex justify-center items-center gap-2">
								<div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/5">
									<Image
										src="/myLogo.webp"
										alt="Bhemu Calculator Logo"
										width={32}
										height={32}
										className="rounded-lg object-cover"
									/>
								</div>
								<span className="text-xl font-bold text-white">Bhemu Calculator</span>
							</div>
							<h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
							<p className="text-gray-400">Enter your credentials to access your workspace.</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Email Field */}
							<div>
								<label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
									Email address
								</label>
								<input
									id="email"
									type="email"
									placeholder="name@university.edu"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg h-12 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-gray-500"
								/>
							</div>

							{/* Password Field */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<label htmlFor="password" className="block text-sm font-medium text-gray-300">
										Password
									</label>
									<Link
										href="/forgot-password"
										className="text-xs font-semibold text-secondary hover:text-secondary-dark/80 transition-colors"
									>
										Forgot password?
									</Link>
								</div>
								<div className="relative">
									<input
										id="password"
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg h-12 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-gray-500"
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
									>
										{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
									</button>
								</div>
							</div>

							{/* Login Button */}
							<button
								type="submit"
								disabled={loading}
								className="w-full h-12 bg-gradient-to-r from-primary via-primary to-accent text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
								style={{ boxShadow: "0 0 20px rgba(3, 152, 172, 0.3)" }}
							>
								{loading ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										<span>Signing In...</span>
									</>
								) : (
									<span>Login</span>
								)}
							</button>

							{/* Divider */}
							<div className="relative py-4 flex items-center">
								<div className="flex-grow border-t border-white/10" />
								<span className="flex-shrink mx-4 text-gray-500 text-xs uppercase tracking-widest font-medium">
									Or continue with
								</span>
								<div className="flex-grow border-t border-white/10" />
							</div>

							{/* Google OAuth */}
							<button
								type="button"
								onClick={handleGoogleSignIn}
								disabled={loading}
								className="w-full h-12 bg-transparent border border-white/10 text-white font-medium rounded-lg flex items-center justify-center gap-3 hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
								Sign in with Google
							</button>
						</form>

						{/* Footer Link */}
						<p className="mt-8 text-center text-sm text-gray-400">
							Don&apos;t have an account?{" "}
							<Link href="/register" className="text-secondary font-bold hover:underline">
								Create one
							</Link>
						</p>
					</div>

					{/* Accessibility / Legal */}
					<div className="mt-12 flex justify-center gap-6 text-xs text-gray-500">
						<a href="#" className="hover:text-gray-300 transition-colors">
							Privacy Policy
						</a>
						<a href="#" className="hover:text-gray-300 transition-colors">
							Terms of Service
						</a>
						<a href="#" className="hover:text-gray-300 transition-colors">
							Help Center
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
