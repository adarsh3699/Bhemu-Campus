import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Forgot Password",
	description: "Reset your Bhemu Calculator password.",
	path: "/forgot-password",
	noIndex: true,
});

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
