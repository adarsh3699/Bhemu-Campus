import Link from "next/link";
import { Trophy } from "lucide-react";

export default function RankNotFound() {
	return (
		<>
			<style>{`
				@keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
				.anim-in { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
				@media (prefers-reduced-motion: reduce) { .anim-in { animation: none !important; } }
			`}</style>
			<div
				className="w-full min-h-screen flex flex-col items-center justify-center p-6"
				style={{ background: "linear-gradient(160deg, #06070E 0%, #0B0E1A 60%, #06070E 100%)" }}
			>
				<div className="anim-in flex flex-col items-center text-center" style={{ animationDelay: "0ms" }}>
					<div
						className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
						style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
					>
						<Trophy className="w-7 h-7 text-muted-foreground" />
					</div>
					<p className="text-2xl font-bold text-white mb-2">Rank not found</p>
					<p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
						This rank card may have been removed or the link is invalid.
					</p>
					<Link
						href="/"
						className="px-6 py-3 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
						style={{
							background: "linear-gradient(135deg, #0398ac 0%, #004eeb 100%)",
							boxShadow: "0 4px 24px rgba(3,152,172,0.35)",
							minHeight: "44px",
							display: "flex",
							alignItems: "center",
						}}
					>
						Go to Bhemu Calculator
					</Link>
				</div>
			</div>
		</>
	);
}
