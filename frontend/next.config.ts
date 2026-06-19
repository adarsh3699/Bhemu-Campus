import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Performance — tree-shake large icon/UI libraries
	experimental: {
		optimizePackageImports: ["lucide-react"],
	},

	// Remove console.log statements in production (smaller bundle + no data leakage)
	compiler: {
		removeConsole: process.env.NODE_ENV === "production",
	},

	// Image optimisation — serve WebP/AVIF automatically, long cache TTL
	images: {
		formats: ["image/webp", "image/avif"],
		deviceSizes: [640, 750, 828, 1080, 1200, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
		minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
	},

	async headers() {
		return [
			// ── Security headers applied to all routes ──────────────────────
			{
				source: "/:path*",
				headers: [
					{ key: "X-DNS-Prefetch-Control", value: "on" },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "X-XSS-Protection", value: "1; mode=block" },
					{ key: "Referrer-Policy", value: "origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
			// ── Cache sitemap for 24 h ──────────────────────────────────────
			{
				source: "/sitemap.xml",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=86400, stale-while-revalidate=43200",
					},
				],
			},
			// ── Cache robots.txt for 24 h ───────────────────────────────────
			{
				source: "/robots.txt",
				headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
			},
			// ── Long-term cache for static assets ───────────────────────────
			{
				source: "/(.*\\.webp|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},
};

export default nextConfig;
