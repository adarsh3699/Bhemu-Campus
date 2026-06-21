import ReappearCalculatorView from "@/components/ReappearCalculator/ReappearCalculatorView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "Reappear Calculator",
	description:
		"Check if you pass or fail based on continuous assessments, mid terms, and end term theory or practical criteria. Instant reappear eligibility check for university students.",
	path: "/reappear-calculator",
	keywords: [
		"reappear calculator",
		"backlog calculator",
		"pass fail checker",
		"university exam eligibility",
		"continuous assessment calculator",
		"mid term end term marks",
		"reappear eligibility India",
	],
});

export default function ReappearCalculatorPage() {
	return <ReappearCalculatorView />;
}
