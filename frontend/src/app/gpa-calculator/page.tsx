import GpaCalculatorView from "@/components/GpaCalculator/GpaCalculatorView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "GPA Calculator",
	description:
		"Calculate your semester SGPA and cumulative CGPA in a clean, real-time shared workspace. Add subjects, set credits, and track your academic progress instantly.",
	path: "/gpa-calculator",
	keywords: [
		"SGPA calculator",
		"semester GPA",
		"calculate CGPA",
		"grade point average",
		"university GPA tracker",
		"online GPA calculator India",
	],
});

export default function GpaCalculatorPage() {
	return <GpaCalculatorView />;
}
