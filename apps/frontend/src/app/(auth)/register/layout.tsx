import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Create Account",
	description: "Create a free Bhemu Calculator account to sync your grades, track CGPA, and plan your academic goals.",
	path: "/register",
	noIndex: true,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
