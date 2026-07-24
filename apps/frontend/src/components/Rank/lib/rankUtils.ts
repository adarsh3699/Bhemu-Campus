// Pure rank functions now live in @bhemu/shared — re-exported here for backwards compatibility.
export { getPercentile, getAchievementLabel, getRankTier } from "@bhemu/shared";

export const tierStyles = {
	gold: {
		stripe: "linear-gradient(90deg, #D97706 0%, #FDE68A 40%, #F59E0B 60%, #D97706 100%)",
		rankGradient: "linear-gradient(180deg, #FDE68A 0%, #FBBF24 40%, #F59E0B 80%, #D97706 100%)",
		badgeBg: "rgba(245,158,11,0.1)",
		badgeBorder: "rgba(245,158,11,0.25)",
		badgeText: "#FCD34D",
		glowColor: "rgba(245,158,11,0.18)",
		iconBg: "linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)",
		iconBorder: "rgba(245,158,11,0.3)",
	},
	silver: {
		stripe: "linear-gradient(90deg, #64748B 0%, #CBD5E1 40%, #94A3B8 60%, #64748B 100%)",
		rankGradient: "linear-gradient(180deg, #F1F5F9 0%, #CBD5E1 40%, #94A3B8 80%, #64748B 100%)",
		badgeBg: "rgba(148,163,184,0.1)",
		badgeBorder: "rgba(148,163,184,0.25)",
		badgeText: "#CBD5E1",
		glowColor: "rgba(148,163,184,0.15)",
		iconBg: "linear-gradient(135deg, rgba(148,163,184,0.2) 0%, rgba(100,116,139,0.1) 100%)",
		iconBorder: "rgba(148,163,184,0.3)",
	},
	bronze: {
		stripe: "linear-gradient(90deg, #92400E 0%, #FED7AA 40%, #F97316 60%, #92400E 100%)",
		rankGradient: "linear-gradient(180deg, #FED7AA 0%, #FB923C 40%, #F97316 80%, #C2410C 100%)",
		badgeBg: "rgba(249,115,22,0.1)",
		badgeBorder: "rgba(249,115,22,0.25)",
		badgeText: "#FDBA74",
		glowColor: "rgba(249,115,22,0.15)",
		iconBg: "linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(194,65,12,0.1) 100%)",
		iconBorder: "rgba(249,115,22,0.3)",
	},
	default: {
		stripe: "linear-gradient(90deg, #0398ac 0%, #22d3ee 40%, #0398ac 60%, #004eeb 100%)",
		rankGradient: "linear-gradient(180deg, #67E8F9 0%, #22D3EE 30%, #0398ac 70%, #004eeb 100%)",
		badgeBg: "rgba(3,152,172,0.1)",
		badgeBorder: "rgba(3,152,172,0.25)",
		badgeText: "#22D3EE",
		glowColor: "rgba(3,152,172,0.15)",
		iconBg: "linear-gradient(135deg, rgba(3,152,172,0.2) 0%, rgba(0,78,235,0.1) 100%)",
		iconBorder: "rgba(3,152,172,0.3)",
	},
} as const;
