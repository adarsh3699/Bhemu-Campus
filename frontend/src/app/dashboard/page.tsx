import DashboardView from "@/components/Dashboard/DashboardView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Dashboard",
	description:
		"Your academic overview — CGPA stats, semester performance chart, roadmap, and recent subjects at a glance.",
	path: "/dashboard",
	keywords: ["academic dashboard", "CGPA overview", "semester performance", "grade summary"],
});

export default function DashboardPage() {
	return <DashboardView />;
}
