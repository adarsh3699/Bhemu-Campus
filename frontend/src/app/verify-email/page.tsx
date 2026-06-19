import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";

export default function VerifyEmailPage() {
	return (
		<div className="min-h-screen bg-background font-sans text-white flex flex-col">
			{/* Background Glows */}
			<div className="fixed inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
				<div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[120px]" />
			</div>

			{/* Main Layout Container */}
			<div className="relative z-10 flex h-full grow flex-col">
				{/* Header */}
				<header className="flex items-center justify-between px-6 py-8 md:px-20 max-w-7xl mx-auto w-full">
					<div className="flex items-center gap-3">
						<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={32} height={32} className="rounded-lg object-cover" />
						<h2 className="text-xl font-bold tracking-tight text-white">Bhemu Calculator</h2>
					</div>
				</header>

				{/* Main Content */}
				<main className="flex-1 flex items-center justify-center px-4 py-12">
					<div className="w-full max-w-[480px]">
						{/* Verification Card */}
						<div className="bg-surface/80 backdrop-blur-lg rounded-xl p-8 md:p-12 shadow-2xl border border-primary/10 text-center flex flex-col items-center bg-neutral-900/50">
							{/* Success Icon */}
							<div className="relative mb-8">
								<div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150" />
								<div className="relative size-20 md:size-24 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
									<CheckCircle2 className="size-12 md:size-14 text-secondary" />
								</div>
							</div>

							{/* Heading */}
							<h1 className="text-3xl font-bold tracking-tight mb-4 text-white">Verify your email</h1>

							{/* Content */}
							<div className="space-y-4 mb-10">
								<p className="text-muted-foreground text-lg leading-relaxed">
									Success! Your email has been verified. You&apos;re all set to begin your academic planning journey.
								</p>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-success/10 border border-success/20 text-success text-sm font-medium">
									<ShieldCheck className="size-4" />
									Identity confirmed
								</div>
							</div>

							{/* Action Button */}
							<div className="w-full">
								<Link
									href="/gpa-calculator"
									className="w-full h-14 bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white font-semibold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
								>
									<span>Go to Calculator</span>
									<ArrowRight className="size-5" />
								</Link>
							</div>

							{/* Footer Link */}
							<div className="mt-10 pt-8 border-t border-border w-full border-neutral-800">
								<p className="text-muted-foreground text-sm">
									Didn&apos;t get the email?{" "}
									<button className="text-secondary hover:text-primary-dark font-medium underline underline-offset-4 ml-1 transition-colors">
										Resend verification email
									</button>
								</p>
							</div>
						</div>

						{/* Secondary Helper Text */}
						<p className="mt-8 text-center text-muted-foreground text-sm">
							Having trouble?{" "}
							<Link href="/support" className="hover:text-secondary-dark transition-colors">
								Contact Support
							</Link>
						</p>
					</div>
				</main>

				{/* Footer */}
				<footer className="px-6 py-10 w-full max-w-7xl mx-auto">
					<div className="flex flex-col items-center gap-6">
						<div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
							<Link
								href="#"
								className="text-muted-foreground hover:text-secondary-dark text-sm transition-colors"
							>
								Privacy Policy
							</Link>
							<Link
								href="#"
								className="text-muted-foreground hover:text-secondary-dark text-sm transition-colors"
							>
								Terms of Service
							</Link>
							<Link
								href="#"
								className="text-muted-foreground hover:text-secondary-dark text-sm transition-colors"
							>
								Help Center
							</Link>
						</div>
						<p className="text-muted-foreground text-sm">
							© 2026 Bhemu Calculator. Empowering students with intelligence.
						</p>
					</div>
				</footer>
			</div>
		</div>
	);
}
