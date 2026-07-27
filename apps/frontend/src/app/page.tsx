import { redirect } from "next/navigation";
import { generatePageMetadata } from "@/lib/seo";

// Let Google index homepage — it redirects to /dashboard (the actual content)
export const metadata = generatePageMetadata();

export default function RootPage() {
	redirect("/dashboard");
}
