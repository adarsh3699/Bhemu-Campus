import type { Metadata } from "next";
import { fetchLeaderboardEntry } from "@/lib/fetchLeaderboardEntry";
import { formatProgramLabel } from "@/lib/programUtils";
import { SITE_CONFIG } from "@/lib/seo";
import { getPercentile, getAchievementLabel, getRankTier } from "@/components/Rank/lib/rankUtils";
import RankCardView from "@/components/Rank/RankCardView";
import RankNotFound from "@/components/Rank/RankNotFound";

interface Props {
	params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const entry = await fetchLeaderboardEntry(id);

	if (!entry) {
		return {
			title: "Rank Not Found | Bhemu Calculator",
			robots: { index: false, follow: false },
		};
	}

	const programLabel = formatProgramLabel(entry.programName, entry.branch);
	const title = `${entry.name} — Rank #${entry.rank} | Bhemu Calculator`;
	const description = `${entry.name} is ranked #${entry.rank} among ${entry.totalStudents} ${programLabel} students (Batch ${entry.batchYear}) with a CGPA of ${entry.cgpa.toFixed(2)}.`;
	const ogTitle = `${entry.name} — Rank #${entry.rank}`;
	const ogImageUrl = `${SITE_CONFIG.url}/api/og?id=${encodeURIComponent(id)}&title=${encodeURIComponent(ogTitle)}&description=${encodeURIComponent(description)}`;

	return {
		title,
		description,
		metadataBase: new URL(SITE_CONFIG.url),
		openGraph: {
			title,
			description,
			url: `${SITE_CONFIG.url}/rank/${id}`,
			siteName: SITE_CONFIG.openGraph.siteName,
			images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
			type: "website",
		},
		twitter: {
			card: SITE_CONFIG.twitter.card,
			title,
			description,
			images: [ogImageUrl],
		},
	};
}

export default async function RankPage({ params }: Props) {
	const { id } = await params;
	const entry = await fetchLeaderboardEntry(id);

	if (!entry) {
		return <RankNotFound />;
	}

	const programLabel = formatProgramLabel(entry.programName, entry.branch);
	const percentile = getPercentile(entry.rank, entry.totalStudents);
	const achievementLabel = getAchievementLabel(entry.rank, entry.totalStudents);
	const tier = getRankTier(entry.rank);

	return (
		<RankCardView
			entry={entry}
			programLabel={programLabel}
			percentile={percentile}
			achievementLabel={achievementLabel}
			tier={tier}
		/>
	);
}
