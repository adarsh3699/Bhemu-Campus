import AboutView from "@/components/About/AboutView";
import { generatePageMetadata } from "@/lib/seo";

export const metadata = generatePageMetadata({
	title: "About the Developer",
	description:
		"Learn about Adarsh Suman, the full-stack developer behind Bhemu Calculator — his skills, projects, and the technology stack powering the app.",
	path: "/about",
	keywords: [
		"Adarsh Suman",
		"full stack developer",
		"Bhemu Calculator developer",
		"React Next.js developer India",
		"TypeScript Firebase developer",
	],
});

export default function AboutPage() {
	return <AboutView />;
}
