// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
	const base = SITE_CONFIG.url;
	const now = new Date();

	return [
		// ── Primary tool pages ──────────────────────────────────────────────
		{
			url: `${base}/gpa-calculator`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 1.0, // core product page
		},
		{
			url: `${base}/reappear-calculator`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.9,
		},
		{
			url: `${base}/gpa-goal-planner`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.9,
		},
		// ── Dashboard ───────────────────────────────────────────────────────
		{
			url: `${base}/dashboard`,
			lastModified: now,
			changeFrequency: "weekly",
			priority: 0.8,
		},
		// ── Info / utility pages ────────────────────────────────────────────
		{
			url: `${base}/about`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.6,
		},
		{
			url: `${base}/settings`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.4,
		},
		// ── Auth pages — low priority, rarely need crawling ─────────────────
		{
			url: `${base}/login`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${base}/register`,
			lastModified: now,
			changeFrequency: "monthly",
			priority: 0.3,
		},
	];
}
