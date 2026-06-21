// src/lib/seo.ts
// Single source of truth for all SEO logic — follow the seo-guide.md pattern.
import type { Metadata } from "next";

// ─── Site-wide constants ────────────────────────────────────────────────────

export const SITE_CONFIG = {
	name: "Bhemu Calculator",
	fullName: "Bhemu Calculator - GPA Tracker, SGPA & CGPA Planning",
	description:
		"Track your academic progress, calculate SGPA & CGPA, plan future GPA goals, and collaborate in real-time with Bhemu Calculator.",
	url: "https://bhemu-calculator.vercel.app", // canonical origin — no trailing slash
	creator: "Adarsh Suman",
	keywords: [
		"Bhemu Calculator",
		"GPA Calculator",
		"SGPA Calculator",
		"CGPA Calculator",
		"Academic Tracker",
		"Grade Goal Planner",
		"Reappear Backlog Calculator",
		"semester GPA",
		"cumulative GPA",
		"CGPA planner",
		"university grades",
		"student grade tracker",
	],
	authors: [{ name: "Adarsh Suman", url: "https://bhemu.in" }],
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Bhemu Calculator",
		images: [
			{
				url: "/newLogo512.webp", // resolved against metadataBase
				width: 512,
				height: 512,
				alt: "Bhemu Calculator - GPA Tracker, SGPA & CGPA Planning",
			},
		],
	},
	twitter: {
		card: "summary_large_image" as const,
		creator: "@adarsh3699",
	},
};

// ─── generateMetadata() helper ──────────────────────────────────────────────

export function generatePageMetadata({
	title,
	description,
	path = "",
	keywords = [],
	noIndex = false,
}: {
	title?: string;
	description?: string;
	path?: string;
	keywords?: string[];
	noIndex?: boolean;
} = {}): Metadata {
	const pageTitle = title ? `${title} | ${SITE_CONFIG.name}` : SITE_CONFIG.fullName;
	const pageDescription = description ?? SITE_CONFIG.description;
	const pageUrl = `${SITE_CONFIG.url}${path}`;
	const allKeywords = [...SITE_CONFIG.keywords, ...keywords];

	return {
		title: pageTitle,
		description: pageDescription,
		keywords: allKeywords,
		authors: SITE_CONFIG.authors,
		creator: SITE_CONFIG.creator,
		metadataBase: new URL(SITE_CONFIG.url),
		alternates: {
			canonical: pageUrl,
		},
		robots: {
			index: !noIndex,
			follow: !noIndex,
			googleBot: {
				index: !noIndex,
				follow: !noIndex,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		openGraph: {
			type: "website",
			locale: SITE_CONFIG.openGraph.locale,
			title: pageTitle,
			description: pageDescription,
			siteName: SITE_CONFIG.openGraph.siteName,
			url: pageUrl,
			images: SITE_CONFIG.openGraph.images,
		},
		twitter: {
			card: SITE_CONFIG.twitter.card,
			creator: SITE_CONFIG.twitter.creator,
			title: pageTitle,
			description: pageDescription,
			images: SITE_CONFIG.openGraph.images.map((i) => i.url),
		},
	};
}

// ─── JSON-LD generators ─────────────────────────────────────────────────────

/** WebSite schema — inject once in root layout */
export function generateWebsiteJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_CONFIG.name,
		url: SITE_CONFIG.url,
		description: SITE_CONFIG.description,
		author: { "@type": "Person", name: SITE_CONFIG.creator, url: "https://bhemu.in" },
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: `${SITE_CONFIG.url}/gpa-calculator`,
			},
		},
	};
}

/** WebApplication schema — inject once in root layout */
export function generateWebAppJsonLd() {
	return {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: SITE_CONFIG.name,
		url: SITE_CONFIG.url,
		description: SITE_CONFIG.description,
		applicationCategory: "EducationalApplication",
		operatingSystem: "All",
		browserRequirements: "Requires JavaScript",
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "INR",
		},
		author: {
			"@type": "Person",
			name: SITE_CONFIG.creator,
			url: "https://bhemu.in",
			sameAs: [
				"https://github.com/adarsh3699",
				"https://linkedin.com/in/adarsh3699",
			],
		},
	};
}
