import GpaGoalPlannerView from "@/components/GpaGoalPlanner/GpaGoalPlannerView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "GPA Goal Planner",
	description:
		"Plan your future target semesters to hit your dream CGPA milestone. Simulate required marks and visualise the exact path to your GPA goal.",
	path: "/gpa-goal-planner",
	keywords: [
		"GPA goal planner",
		"CGPA target calculator",
		"improve CGPA",
		"semester goal tracker",
		"academic goal planner",
		"required marks calculator",
		"dream CGPA simulator",
	],
});

export default function GpaGoalPlannerPage() {
	return <GpaGoalPlannerView />;
}
