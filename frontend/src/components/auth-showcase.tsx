import { ReactNode } from "react";
import Image from "next/image";
import { GraduationCap, Star } from "lucide-react";

interface AuthShowcaseProps {
	title: ReactNode;
	subtitle: string;
	testimonial?: boolean;
}

export function AuthShowcase({ title, subtitle, testimonial = false }: AuthShowcaseProps) {
	return (
		<div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-background relative overflow-hidden w-1/2 border-r border-white/5">
			{/* Ambient Glowing Background */}
			<div className="absolute inset-0 pointer-events-none z-0">
				<div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
				<div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-accent/25 rounded-full blur-[140px] mix-blend-screen" />
				<div
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							"linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>
			</div>

			{/* Top Bar: Brand Logo */}
			<div className="flex items-center gap-3 z-10">
				<div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-primary/30 bg-white/5">
				<Image src="/myLogo.webp" alt="Bhemu Calculator Logo" width={40} height={40} className="object-cover" />
				</div>
				<span className="text-2xl font-bold tracking-tight text-white">Bhemu Calculator</span>
			</div>

			{/* Center Section: Premium visual & Title */}
			<div className="my-auto max-w-lg z-10 flex flex-col gap-8">
				<div className="flex flex-col gap-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-secondary text-xs font-semibold w-fit uppercase tracking-wider">
						<GraduationCap className="w-4 h-4" /> Powered by Academic AI
					</div>
					<h1 className="text-4xl xl:text-5xl font-extrabold leading-tight text-white tracking-tight drop-shadow-md">
						{title}
					</h1>
					<p className="text-gray-400 text-lg leading-relaxed">{subtitle}</p>
				</div>

				{/* Beautiful Interactive Glass Panel if Testimonial is enabled */}
				{testimonial && (
					<div
						className="p-6 rounded-2xl relative overflow-hidden group"
						style={{
							background: "rgba(255, 255, 255, 0.02)",
							backdropFilter: "blur(20px)",
							border: "1px solid rgba(255, 255, 255, 0.08)",
							boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
						}}
					>
						{/* Hover glow line */}
						<div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
						
						<div className="flex gap-1.5 mb-3">
							{[...Array(5)].map((_, i) => (
								<Star key={i} className="w-4 h-4 fill-secondary text-secondary" />
							))}
						</div>
						<p className="text-gray-300 text-sm italic mb-4 leading-relaxed">
							&ldquo;Bhemu Calculator revolutionized how I track my grades and calculate my GPA goal. The collaborative features allowed me to work perfectly with my study group!&rdquo;
						</p>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-xs font-bold text-white shadow-inner">
								AS
							</div>
							<div>
								<h4 className="text-white text-xs font-bold">Alex Sterling</h4>
								<p className="text-gray-500 text-[10px]">Computer Science Student</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Footer Info */}
			<div className="text-xs text-gray-500 z-10 flex justify-between items-center w-full">
				<span>© 2026 Bhemu Calculator. All rights reserved.</span>
				<div className="flex gap-4">
					<a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
					<a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
				</div>
			</div>
		</div>
	);
}
