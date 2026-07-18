import { redirect } from "next/navigation";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({ noIndex: true });

export default function MarksAnalysisPage() {
	redirect("/gpa-calculator");
}
