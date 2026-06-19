import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/firebase/AuthContext";
import { MessageProvider } from "@/components/common/MessageProvider";
import { GpaDataProvider } from "@/hooks/GpaDataContext";
import AppShell from "@/components/layout/AppShell";
import { generatePageMetadata, generateWebsiteJsonLd, generateWebAppJsonLd } from "@/lib/seo";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
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
		<html lang="en" className={`${inter.variable} h-full antialiased dark`}>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				{/* DNS prefetch for Firebase */}
				<link rel="dns-prefetch" href="https://firestore.googleapis.com" />
				<link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
			</head>
			<body className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden">
				{/* Global JSON-LD: WebSite + WebApplication schemas */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<AuthProvider>
					<MessageProvider>
						<GpaDataProvider>
							<AppShell>{children}</AppShell>
						</GpaDataProvider>
					</MessageProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
