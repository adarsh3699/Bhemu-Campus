// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
	const base = SITE_CONFIG.url;
	const now = new Date();

	return [
		// ── Primary tool pages ──────────────────────────────────────────────
		{ url: `${base}/gpa-calculator`,        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
		{ url: `${base}/reappear-calculator`,   lastModified: now, changeFrequency: "monthly", priority: 0.9 },
		{ url: `${base}/gpa-goal-planner`,      lastModified: now, changeFrequency: "monthly", priority: 0.9 },
		{ url: `${base}/attendance-calculator`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
		{ url: `${base}/leaderboard`,           lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
		// ── Dashboard ───────────────────────────────────────────────────────
		{ url: `${base}/dashboard`,             lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
		// ── Info pages ──────────────────────────────────────────────────────
		{ url: `${base}/about`,                 lastModified: now, changeFrequency: "monthly", priority: 0.6 },
		// ── Auth pages ──────────────────────────────────────────────────────
		{ url: `${base}/login`,                 lastModified: now, changeFrequency: "monthly", priority: 0.3 },
		{ url: `${base}/register`,              lastModified: now, changeFrequency: "monthly", priority: 0.3 },
	];
}
