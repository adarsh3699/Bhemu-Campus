"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Send, ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/firebase/AuthContext";
import { useMessage } from "@/components/common/MessageProvider";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const { resetPassword } = useAuth();
	const { showMessage } = useMessage();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim()) {
			showMessage("Please enter your email address.", "warning");
			return;
		}

		try {
			setLoading(true);
			await resetPassword(email);
			showMessage("Password reset email sent! Check your inbox.", "success");
			setEmail("");
		} catch (err: unknown) {
			console.error("Password reset error:", err);
			const message = err instanceof Error ? err.message : String(err);
			showMessage(message || "Failed to send reset link.", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex flex-col relative overflow-hidden bg-background text-slate-200">
			{/* Background Effects */}
			<div className="absolute inset-0 pointer-events-none z-0">
				<div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
				<div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[120px] mix-blend-screen" />
				<div
					className="absolute inset-0 opacity-[0.05]"
					style={{
						backgroundImage:
							"linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
						backgroundSize: "50px 50px",
					}}
				/>
			</div>

			<main className="flex-grow flex items-center justify-center p-4 relative z-10">
				<div className="w-full max-w-[480px] flex flex-col">
					{/* Logo Header */}
					<div className="flex flex-col items-center justify-center mb-8">
						<div
							className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center mb-4 ring-1 ring-white/20 bg-white/5"
							style={{ boxShadow: "0 0 25px rgba(3,152,172,0.5)" }}
						>
							<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={56} height={56} className="object-cover" />
						</div>
						<h2 className="text-3xl font-bold tracking-tight text-center text-white drop-shadow-lg">
							Bhemu Calculator
						</h2>
						<p className="text-secondary/80 text-sm mt-1 font-medium tracking-widest uppercase">
							Academic Workspace
						</p>
					</div>

					{/* Glass Panel */}
					<div
						className="rounded-3xl p-8 sm:p-10 relative overflow-hidden"
						style={{
							background: "rgba(18, 18, 18, 0.8)",
							backdropFilter: "blur(20px)",
							border: "1px solid rgba(255, 255, 255, 0.08)",
							boxShadow: "0 0 40px -10px rgba(3, 152, 172, 0.15)",
						}}
					>
						{/* Top gradient line */}
						<div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-100" />

						<div className="flex flex-col gap-6">
							<div className="text-center">
								<h1 className="text-2xl font-bold text-white mb-2">Forgot Password?</h1>
								<p className="text-gray-400 text-sm leading-relaxed">
									No worries, we&apos;ll send you reset instructions.
								</p>
							</div>

							<form className="flex flex-col gap-5 mt-2" onSubmit={handleSubmit}>
								<div className="space-y-2">
									<label
										className="text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wide"
										htmlFor="email"
									>
										Email address
									</label>
									<div className="relative group/input">
										<div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
											<Mail className="w-5 h-5 text-white/40 group-focus-within/input:text-secondary transition-colors" />
										</div>
										<input
											type="email"
											id="email"
											name="email"
											required
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="name@example.com"
											className="block w-full rounded-xl border border-white/5 bg-black/20 pl-11 pr-4 py-4 text-white placeholder-white/20 focus:border-primary/50 focus:ring-1 focus:ring-primary focus:bg-black/30 transition-all duration-300 sm:text-sm shadow-inner outline-none"
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={loading}
									className="group relative flex w-full justify-center items-center rounded-xl bg-gradient-to-r from-primary to-accent py-4 px-4 text-sm font-bold text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-300 transform hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
									style={{
										boxShadow: "0 4px 20px rgba(3,152,172,0.4)",
									}}
								>
									<span className="absolute inset-y-0 left-0 flex items-center pl-4">
										{loading ? (
											<Loader2 className="w-5 h-5 text-white/90 animate-spin" />
										) : (
											<Send className="w-5 h-5 text-white/90 group-hover:text-white transition-colors rotate-[-20deg]" />
										)}
									</span>
									{loading ? "Sending..." : "Send Reset Link"}
								</button>
							</form>

							{/* Divider */}
							<div className="flex items-center gap-4 mt-2">
								<div className="h-px bg-white/10 flex-1" />
								<span className="text-gray-500 text-xs font-medium">OR</span>
								<div className="h-px bg-white/10 flex-1" />
							</div>

							{/* Return to Login */}
							<div className="text-center">
								<Link
									href="/login"
									className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors group/link p-2 rounded-lg hover:bg-white/5"
								>
									<ArrowLeft className="w-4 h-4 group-hover/link:-translate-x-1 transition-transform duration-300" />
									Return to Login
								</Link>
							</div>
						</div>
					</div>

					{/* Footer Links */}
					<div className="mt-8 text-center space-x-6 text-xs text-gray-500 font-medium">
						<a href="#" className="hover:text-secondary-dark transition-colors">
							Privacy Policy
						</a>
						<span>•</span>
						<a href="#" className="hover:text-secondary-dark transition-colors">
							Terms of Service
						</a>
						<span>•</span>
						<a href="#" className="hover:text-secondary-dark transition-colors">
							Support
						</a>
					</div>
				</div>
			</main>
		</div>
	);
}
