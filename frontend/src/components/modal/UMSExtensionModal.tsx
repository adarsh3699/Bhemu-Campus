"use client";

import React from "react";
import { Download, Play, Zap, BarChart2, RefreshCw } from "lucide-react";
import BaseModal from "./BaseModal";

interface UMSExtensionModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function UMSExtensionModal({ isOpen, onClose }: UMSExtensionModalProps) {
	return (
		<BaseModal isOpen={isOpen} onClose={onClose} title="UMS Auto-Fetch Extension" maxWidth="600px">
			<div className="px-6 py-5 flex flex-col gap-5">
				{/* Demo video thumbnail */}
				<div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/8 aspect-video flex items-center justify-center group">
					<iframe
						src="https://www.youtube.com/embed/ohXOqajvmyY?start=163&autoplay=1&modestbranding=1&rel=0&showinfo=0&controls=1"
						title="UMS Extension Demo"
						className="w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
					<div className="absolute bottom-3 left-3 flex items-center gap-1.5 pointer-events-none">
						<Play className="w-3.5 h-3.5 text-white/70" />
						<span className="text-xs text-white/70 font-medium">Demo</span>
					</div>
				</div>

				{/* Features */}
				<div className="grid grid-cols-1 gap-2">
					{[
						{
							icon: <Zap className="w-4 h-4 text-amber-400" />,
							text: "Auto-fetch marks, grades & attendance from UMS portal in one click",
						},
						{
							icon: <BarChart2 className="w-4 h-4 text-teal-400" />,
							text: "Instantly populates your GPA & marks calculator",
						},
						{
							icon: <RefreshCw className="w-4 h-4 text-blue-400" />,
							text: "Sync anytime — keeps your data up to date",
						},
					].map(({ icon, text }) => (
						<div
							key={text}
							className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/8"
						>
							<div className="shrink-0">{icon}</div>
							<span className="text-sm text-neutral-300">{text}</span>
						</div>
					))}
				</div>

				{/* CTA */}
				<a
					href="https://chromewebstore.google.com/detail/bfmmcngnpcmnopnjacnebpnfcohhigkp?utm_source=item-share-cb"
					target="_blank"
					rel="noopener noreferrer"
					className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
				>
					<Download className="w-4 h-4" />
					Install Chrome Extension — Free
				</a>
				<p className="text-center text-xs text-neutral-500">Works on Chrome & Chromium-based browsers</p>
			</div>
		</BaseModal>
	);
}
