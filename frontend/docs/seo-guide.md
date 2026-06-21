# Next.js SEO — Complete Reference Guide

> Derived from: **My-New-Portfolio** (`bhemu.in`)
> Stack: **Next.js 15 App Router · TypeScript**
> Purpose: Reusable reference for applying the same SEO pattern to any future Next.js project.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Central SEO Config — `SITE_CONFIG`](#2-central-seo-config--site_config)
3. [The `generateMetadata()` Helper](#3-the-generatemetadata-helper)
4. [Applying Metadata — Per Page Pattern](#4-applying-metadata--per-page-pattern)
5. [Structured Data (JSON-LD)](#5-structured-data-json-ld)
6. [Sitemap — Structure & Priority Strategy](#6-sitemap--structure--priority-strategy)
7. [Robots.txt](#7-robotstxt)
8. [PWA Web Manifest](#8-pwa-web-manifest)
9. [HTTP Headers in `next.config.ts`](#9-http-headers-in-nextconfigts)
10. [Root Layout Wiring](#10-root-layout-wiring)
11. [Environment Variables for Verification](#11-environment-variables-for-verification)
12. [Checklist — New Project Setup](#12-checklist--new-project-setup)

---

## 1. Architecture Overview

```
src/
├── lib/
│   └── seo.ts                  ← Single source of truth for all SEO logic
├── app/
│   ├── layout.tsx              ← Root metadata + JSON-LD injection
│   ├── page.tsx                ← Home page metadata
│   ├── robots.ts               ← Robots rules (auto-generates /robots.txt)
│   ├── sitemap.ts              ← Sitemap (auto-generates /sitemap.xml)
│   ├── about/
│   │   └── page.tsx            ← Page-level metadata
│   ├── experience/
│   │   └── page.tsx
│   ├── contact/
│   │   └── page.tsx
│   └── projects/
│       ├── layout.tsx          ← Section-level metadata
│       └── [id]/
│           └── layout.tsx      ← Dynamic page metadata + project JSON-LD
public/
└── manifest.json               ← PWA manifest
next.config.ts                  ← Performance + security + cache headers
```

**Key design principle:** All SEO configuration lives in **one file** (`lib/seo.ts`). Pages only call helpers and pass page-specific overrides. This avoids duplication and makes site-wide changes a one-line edit.

---

## 2. Central SEO Config — `SITE_CONFIG`

**File:** [`src/lib/seo.ts`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/lib/seo.ts)

```ts
// src/lib/seo.ts
import type { Metadata } from "next";

export const SITE_CONFIG = {
  name: "Your Name - Full Stack Developer",
  description: "Your site description (150-160 chars for best snippet display)",
  url: "https://yourdomain.com",          // No trailing slash
  creator: "Your Name",
  keywords: [
    "Full Stack Developer",
    "Next.js",
    "React",
    "TypeScript",
    // ... add your core skills
  ],
  authors: [{ name: "Your Name", url: "https://yourdomain.com" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Your Name - Full Stack Developer Portfolio",
    description: "Short OG description (≤ 200 chars)",
    siteName: "Your Name Portfolio",
    url: "https://yourdomain.com",
    images: [
      {
        url: "https://yourdomain.com/images/og-image.jpg", // 1200×630px
        width: 1200,
        height: 630,
        alt: "Your Name - Full Stack Developer Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@yourhandle",
    title: "Your Name - Full Stack Developer",
    description: "Short Twitter card description",
    images: ["https://yourdomain.com/images/og-image.jpg"],
  },
};
```

> [!IMPORTANT]
> The OG image (`og-image.jpg`) must be **1200 × 630 px**. This is the universal size for all social platforms (Facebook, LinkedIn, Twitter/X, Slack, iMessage previews).

---

## 3. The `generateMetadata()` Helper

**File:** [`src/lib/seo.ts`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/lib/seo.ts)

This single function generates the full `Metadata` object for any page by merging `SITE_CONFIG` defaults with page-specific overrides.

```ts
export function generateMetadata({
  title,
  description,
  path = "",
  keywords = [],
  image,
  noIndex = false,
}: {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  // "About Me | Your Name - Full Stack Developer"
  const pageTitle = title ? `${title} | ${SITE_CONFIG.name}` : SITE_CONFIG.name;
  const pageDescription = description || SITE_CONFIG.description;
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const pageImage = image || SITE_CONFIG.openGraph.images[0].url;
  const allKeywords = [...SITE_CONFIG.keywords, ...keywords];

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: allKeywords,
    authors: SITE_CONFIG.authors,
    creator: SITE_CONFIG.creator,
    metadataBase: new URL(SITE_CONFIG.url),  // Required for relative OG image URLs
    alternates: {
      canonical: pageUrl,  // Prevents duplicate content penalty
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-video-preview": -1,       // No video snippet limit
        "max-image-preview": "large",  // Allow large image previews
        "max-snippet": -1,             // No snippet length limit
      },
    },
    openGraph: {
      type: "website",
      locale: SITE_CONFIG.openGraph.locale,
      title: pageTitle,
      description: pageDescription,
      siteName: SITE_CONFIG.openGraph.siteName,
      url: pageUrl,
      images: [{ url: pageImage, width: 1200, height: 630, alt: pageTitle }],
    },
    twitter: {
      card: SITE_CONFIG.twitter.card as "summary_large_image",
      creator: SITE_CONFIG.twitter.creator,
      title: pageTitle,
      description: pageDescription,
      images: [pageImage],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      // yandex: process.env.YANDEX_VERIFICATION,
      // bing: process.env.BING_VERIFICATION,
    },
  };
}
```

### Parameter Guide

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `title` | `string` | — | Page title. Formatted as `"Title \| Site Name"` |
| `description` | `string` | `SITE_CONFIG.description` | Meta description (aim for 140–160 chars) |
| `path` | `string` | `""` | URL path for canonical URL (e.g. `"/about"`) |
| `keywords` | `string[]` | `[]` | Page-specific keywords merged with global ones |
| `image` | `string` | Global OG image | Override OG/Twitter card image for this page |
| `noIndex` | `boolean` | `false` | Set `true` for 404, admin, or private pages |

---

## 4. Applying Metadata — Per Page Pattern

### Static Page (e.g. About, Experience, Contact)

```ts
// src/app/about/page.tsx
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata = generateSEOMetadata({
  title: "About Me",
  description: "Learn about my journey as a full-stack developer...",
  path: "/about",
  keywords: ["about", "developer story", "technical skills", "education"],
});

export default function AboutPage() {
  return <main>...</main>;
}
```

### Section Layout (e.g. `/projects` parent)

Use a `layout.tsx` so child dynamic pages inherit the section's base SEO data and override only what differs:

```ts
// src/app/projects/layout.tsx
import { generateMetadata as generateSEOMetadata } from "@/lib/seo";

export const metadata = generateSEOMetadata({
  title: "Projects",
  description: "Explore my web development projects...",
  path: "/projects",
  keywords: ["projects", "portfolio", "react projects", "nextjs projects"],
});

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

### Dynamic Page (e.g. `/projects/[id]`)

Use `generateMetadata` as an **async function** to resolve params and fetch data:

```ts
// src/app/projects/[id]/layout.tsx
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { projects } from "@/data";
import { generateMetadata as generateSEOMetadata, generateProjectJsonLd } from "@/lib/seo";

// 1. Dynamic metadata — runs server-side, per request
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);

  // Not found → noIndex the page
  if (!project) {
    return generateSEOMetadata({
      title: "Project Not Found",
      description: "The requested project could not be found.",
      noIndex: true,
    });
  }

  return generateSEOMetadata({
    title: project.name,
    description: project.description,
    path: `/projects/${project.id}`,
    keywords: [...project.technologies, project.category, "project", project.name.toLowerCase()],
    image: project.screenshots?.[0]?.url, // Use first screenshot as OG image
  });
}

// 2. Static generation — pre-renders all project pages at build time
export async function generateStaticParams() {
  return projects.map((project) => ({ id: project.id }));
}

// 3. Layout — inject page-specific JSON-LD
export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  const projectJsonLd = generateProjectJsonLd({ ...project });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />
      {children}
    </>
  );
}
```

> [!TIP]
> Put metadata in `layout.tsx` (not `page.tsx`) for dynamic routes when you also need to inject JSON-LD structured data. This keeps the page component clean.

---

## 5. Structured Data (JSON-LD)

JSON-LD tells search engines *who you are* and *what this page is about* in a machine-readable format. Three schemas are used in this project:

### 5a. Person Schema (global — in root layout)

```ts
export function generatePersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Your Name",
    url: "https://yourdomain.com",
    jobTitle: "Full Stack Developer",
    description: "Your professional description",
    image: "https://yourdomain.com/images/profile-avatar.jpg",
    sameAs: [
      "https://github.com/yourusername",
      "https://linkedin.com/in/yourusername",
      "https://x.com/yourusername",
    ],
    knowsAbout: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js"],
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "Your University Name",
    },
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
  };
}
```

### 5b. WebSite Schema (global — in root layout)

```ts
export function generateWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Your Name Portfolio",
    url: "https://yourdomain.com",
    description: SITE_CONFIG.description,
    author: { "@type": "Person", name: "Your Name" },
    // Enables sitelinks search box in Google
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://yourdomain.com/projects?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };
}
```

### 5c. SoftwareApplication Schema (per project page)

```ts
export function generateProjectJsonLd(project: {
  name: string;
  description: string;
  url?: string;
  githubUrl?: string;
  technologies: string[];
  createdAt: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    description: project.description,
    url: project.url,
    codeRepository: project.githubUrl,
    programmingLanguage: project.technologies,
    dateCreated: project.createdAt,
    creator: { "@type": "Person", name: "Your Name", url: "https://yourdomain.com" },
    author: { "@type": "Person", name: "Your Name" },
  };
}
```

### Injecting JSON-LD in Root Layout

Inject **multiple** schemas as a JSON array in a single script tag:

```tsx
// src/app/layout.tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify([generatePersonJsonLd(), generateWebsiteJsonLd()]),
  }}
/>
```

---

## 6. Sitemap — Structure & Priority Strategy

**File:** [`src/app/sitemap.ts`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/sitemap.ts)

Next.js auto-generates `/sitemap.xml` from this file. It supports both static and dynamic routes.

```ts
// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo";
import { projects } from "@/data/projects"; // Your dynamic data source

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url;

  // 1. Static routes — manually defined
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,           // Highest — homepage
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/experience`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,         // High — frequently updated listing page
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  // 2. Dynamic routes — generated from data
  const projectRoutes = projects.map((project) => ({
    url: `${baseUrl}/projects/${project.id}`,
    lastModified: new Date(project.createdAt),  // Use actual date, not `new Date()`
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...projectRoutes];
}
```

### Sitemap Priority Table

| Route | `priority` | `changeFrequency` | Rationale |
|-------|-----------|-------------------|-----------|
| `/` (Homepage) | `1.0` | `weekly` | Most important; updated often |
| `/projects` (listing) | `0.9` | `weekly` | Key content, updated when new projects added |
| `/about` | `0.8` | `monthly` | Important profile page, rarely changes |
| `/projects/[id]` | `0.7` | `monthly` | Individual project; stable once published |
| `/experience` | `0.7` | `monthly` | Stable career info |
| `/contact` | `0.6` | `monthly` | Utility page; rarely changes |
| API routes | **omitted** | — | Never include API/private routes |

### Priority Rules of Thumb

- `1.0` — Homepage only
- `0.8–0.9` — Primary content pages (portfolio listing, key landing pages)
- `0.6–0.7` — Secondary pages, dynamic detail pages
- `0.4–0.5` — Tag pages, pagination, archives
- Omit or `noIndex` — API routes, admin, `/api/*`, `/_next/*`

> [!NOTE]
> `priority` is a **hint** to crawlers, not a guarantee. The real impact comes from `lastModified` being accurate — always use the actual content modification date for dynamic routes, not `new Date()`.

---

## 7. Robots.txt

**File:** [`src/app/robots.ts`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/robots.ts)

Next.js generates `/robots.txt` from this file automatically.

```ts
// src/app/robots.ts
import { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",                  // All crawlers
        allow: "/",
        disallow: [
          "/api/",                       // Never expose API endpoints
          "/_next/",                     // Next.js internal routes
          "/admin/",                     // Admin if present
          "*.json$",                     // Raw JSON files
        ],
      },
      {
        userAgent: "Googlebot",          // Google-specific rules
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/"],
        // Googlebot doesn't need to block *.json since it ignores non-HTML anyway
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
    host: SITE_CONFIG.url,
  };
}
```

**Output (`/robots.txt`):**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/
Disallow: *.json$

User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /_next/
Disallow: /admin/

Sitemap: https://yourdomain.com/sitemap.xml
Host: https://yourdomain.com
```

---

## 8. PWA Web Manifest

**File:** [`public/manifest.json`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/public/manifest.json)

The manifest enables "Add to Home Screen" on mobile and improves discoverability. Reference it in the root layout's metadata.

```json
{
  "name": "Your Name - Full Stack Developer Portfolio",
  "short_name": "Your Portfolio",
  "description": "Your portfolio description",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/newLogo192.webp",
      "sizes": "192x192",
      "type": "image/webp",
      "purpose": "maskable"
    },
    {
      "src": "/newLogo512.webp",
      "sizes": "512x512",
      "type": "image/webp",
      "purpose": "any"
    }
  ],
  "categories": ["portfolio", "developer", "technology"],
  "lang": "en-US",
  "dir": "ltr"
}
```

**Linking in root layout metadata:**
```ts
export const metadata: Metadata = {
  ...generateMetadata(),
  icons: {
    icon: "/myLogo.webp",
    shortcut: "/myLogo.webp",
    apple: "/myLogo.webp",
  },
  manifest: "/manifest.json",
};
```

---

## 9. HTTP Headers in `next.config.ts`

**File:** [`next.config.ts`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/next.config.ts)

Security and cache headers both affect SEO — Google penalizes insecure sites and rewards fast ones.

```ts
// next.config.ts
const nextConfig: NextConfig = {
  // Performance — tree-shake large icon libraries
  experimental: {
    optimizePackageImports: ["@heroicons/react", "motion"],
  },

  // Remove console.log in production (smaller bundle)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Image optimization — serve WebP/AVIF automatically
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year cache for images
  },

  async headers() {
    return [
      // Security headers — applied to all routes
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },        // Prevents clickjacking
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
        ],
      },
      // Cache the sitemap for 24 hours
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=43200" },
        ],
      },
      // Cache robots.txt for 24 hours
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};
```

---

## 10. Root Layout Wiring

**File:** [`src/app/layout.tsx`](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/layout.tsx)

The root layout is where everything comes together:

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { generateMetadata, generatePersonJsonLd, generateWebsiteJsonLd } from "@/lib/seo";

// Global metadata (pages override specific fields via their own export)
export const metadata: Metadata = {
  ...generateMetadata(),
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* DNS prefetch for external APIs used in the app */}
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Global JSON-LD: Person + WebSite schemas */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([generatePersonJsonLd(), generateWebsiteJsonLd()]),
          }}
        />
        {children}
      </body>
    </html>
  );
}
```

---

## 11. Environment Variables for Verification

**File:** `.env` / `.env.local`

```bash
# Google Search Console verification
GOOGLE_SITE_VERIFICATION=your_verification_token_here

# Optional: Bing Webmaster Tools
# BING_VERIFICATION=your_token_here

# Optional: Yandex
# YANDEX_VERIFICATION=your_token_here
```

These are referenced in `generateMetadata()`:
```ts
verification: {
  google: process.env.GOOGLE_SITE_VERIFICATION,
},
```

This generates the `<meta name="google-site-verification" content="..." />` tag automatically.

---

## 12. Checklist — New Project Setup

Copy this checklist when applying this SEO pattern to a new Next.js project:

### Foundation
- [ ] Create `src/lib/seo.ts` with `SITE_CONFIG`, `generateMetadata()`, and JSON-LD generators
- [ ] Update all values in `SITE_CONFIG` (name, url, description, social handles)
- [ ] Create `public/manifest.json` with correct name, icons, and colors
- [ ] Create OG image at `public/images/og-image.jpg` (1200×630 px)
- [ ] Create profile image at `public/images/profile-avatar.jpg`

### Files to Create
- [ ] `src/app/sitemap.ts` — add all static routes + map dynamic data sources
- [ ] `src/app/robots.ts` — add correct disallow rules and sitemap URL
- [ ] `src/app/layout.tsx` — wire metadata export, JSON-LD scripts, dns-prefetch hints

### Per Page
- [ ] `src/app/page.tsx` — export `metadata` with `generateSEOMetadata({ path: "/" })`
- [ ] Each static page — export `metadata` with page-specific title, description, path, keywords
- [ ] Each dynamic route `layout.tsx` — use async `generateMetadata()` + inject page JSON-LD

### `next.config.ts`
- [ ] Add security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
- [ ] Add cache headers for `/sitemap.xml` and `/robots.txt`
- [ ] Configure `images.formats: ["image/webp", "image/avif"]`

### Environment
- [ ] Add `GOOGLE_SITE_VERIFICATION` to `.env`
- [ ] Add domain to Google Search Console and submit sitemap
- [ ] Verify `yourdomain.com/sitemap.xml` renders correctly
- [ ] Verify `yourdomain.com/robots.txt` renders correctly
- [ ] Test OG tags at [opengraph.xyz](https://www.opengraph.xyz) or [metatags.io](https://metatags.io)
- [ ] Validate JSON-LD at [schema.org/validator](https://validator.schema.org)

---

## Quick Reference — File Locations in This Project

| SEO Concern | File |
|-------------|------|
| Central config + helpers | [src/lib/seo.ts](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/lib/seo.ts) |
| Root metadata + JSON-LD | [src/app/layout.tsx](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/layout.tsx) |
| Sitemap | [src/app/sitemap.ts](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/sitemap.ts) |
| Robots rules | [src/app/robots.ts](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/robots.ts) |
| PWA manifest | [public/manifest.json](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/public/manifest.json) |
| Performance headers | [next.config.ts](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/next.config.ts) |
| Home page metadata | [src/app/page.tsx](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/page.tsx) |
| About page metadata | [src/app/about/page.tsx](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/about/page.tsx) |
| Projects section metadata | [src/app/projects/layout.tsx](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/projects/layout.tsx) |
| Dynamic project metadata | [src/app/projects/[id]/layout.tsx](file:///Users/adarsh3699/Documents/Projects/My-New-Portfolio/src/app/projects/%5Bid%5D/layout.tsx) |
