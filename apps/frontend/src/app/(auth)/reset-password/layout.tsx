import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Reset Password",
	description: "Set a new password for your bCampus account.",
	path: "/reset-password",
	noIndex: true,
});

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
