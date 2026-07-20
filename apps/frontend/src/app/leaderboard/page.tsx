import LeaderboardView from "@/components/Leaderboard/LeaderboardView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Leaderboard",
	description:
		"See how you rank among your batchmates by CGPA. Compare your academic performance with fellow students in your program and batch.",
	path: "/leaderboard",
	keywords: ["CGPA leaderboard", "student ranking", "batch toppers", "LPU rank", "CGPA comparison"],
});

export default function LeaderboardPage() {
	return <LeaderboardView />;
}
