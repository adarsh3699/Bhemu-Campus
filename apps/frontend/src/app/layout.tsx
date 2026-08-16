import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AuthProvider } from "@/firebase/AuthContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { GpaDataProvider } from "@/contexts/GpaDataContext";
import { AttendanceDataProvider } from "@/contexts/AttendanceDataContext";
import { MarksDataProvider } from "@/contexts/MarksDataContext";
import AppShell from "@/components/layout/AppShell";
import GlobalHandlers from "@/components/layout/GlobalHandlers";
import { generatePageMetadata, generateWebsiteJsonLd, generateWebAppJsonLd } from "@/lib/seo";

const inter = localFont({
	src: [
		{ path: "../../public/Inter-Regular.ttf", weight: "400", style: "normal" },
		{ path: "../../public/Inter-Bold.ttf", weight: "700", style: "normal" },
	],
	variable: "--font-inter",
	display: "swap",
});

// ── Root metadata (individual pages override specific fields) ────────────────
export const metadata: Metadata = {
	...generatePageMetadata(),
	icons: {
		icon: "/myLogo.webp",
		shortcut: "/myLogo.webp",
		apple: "/myLogo.webp",
		other: [
			{ rel: "icon", type: "image/webp", sizes: "32x32", url: "/myLogo.webp" },
			{ rel: "icon", type: "image/webp", sizes: "16x16", url: "/myLogo.webp" },
		],
	},
	manifest: "/manifest.json",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const jsonLd = [generateWebsiteJsonLd(), generateWebAppJsonLd()];

	return (
		<html lang="en" className={`${inter.variable} h-full antialiased dark`} data-scroll-behavior="smooth">
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="theme-color" content="#080d0f" />
				{/* DNS prefetch for Firebase */}
				<link rel="dns-prefetch" href="https://firestore.googleapis.com" />
				<link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
			</head>
			<body className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden">
				{/* Global JSON-LD: WebSite + WebApplication schemas */}
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
				<GlobalHandlers />
				<AuthProvider>
					<MessageProvider>
						<GpaDataProvider>
							<AttendanceDataProvider>
								<MarksDataProvider>
									<AppShell>{children}</AppShell>
								</MarksDataProvider>
							</AttendanceDataProvider>
						</GpaDataProvider>
					</MessageProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
