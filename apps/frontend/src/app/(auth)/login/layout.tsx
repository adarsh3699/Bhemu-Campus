import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Sign In",
	description: "Sign in to bCampus to sync your grades, track CGPA, and access your academic data across devices.",
	path: "/login",
	noIndex: true,
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
