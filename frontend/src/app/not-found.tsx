import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden bg-grid-pattern bg-hero-glow">
			<div className="relative z-10 text-center px-4 animate-in fade-in zoom-in duration-300">
				<h1 className="text-9xl font-extrabold text-gradient-brand leading-none">404</h1>
				<h2 className="text-3xl font-bold tracking-tight mt-4 mb-2">Page Not Found</h2>
				<p className="text-muted-foreground text-sm max-w-sm mx-auto mb-8">
					The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
				</p>
				<Link
					href="/gpa-calculator"
					className="inline-block px-6 py-3 bg-gradient-primary text-white rounded-lg font-semibold shadow-glow hover:scale-105 transition-all duration-200"
				>
					Back to Calculator
				</Link>
			</div>
		</div>
	);
}
