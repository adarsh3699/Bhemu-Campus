import AttendanceCalculatorView from "@/components/AttendanceCalculator/AttendanceCalculatorView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Attendance Calculator",
	description:
		"Track your class attendance per subject and semester. Get real-time percentage updates and warnings when attendance falls below your threshold.",
	path: "/attendance-calculator",
	keywords: [
		"attendance calculator",
		"class attendance tracker",
		"attendance percentage",
		"university attendance",
		"LPU attendance",
	],
});

export default function AttendanceCalculatorPage() {
	return <AttendanceCalculatorView />;
}
