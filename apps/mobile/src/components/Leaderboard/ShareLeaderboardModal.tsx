import { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Clipboard, Modal } from "react-native";
import { MessageCircle, Link2, Check, X } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import { formatProgramLabel } from "@bhemu/shared";
import LeaderboardShareCard from "./LeaderboardShareCard";
import type { LeaderboardData } from "@bhemu/shared";

interface Props {
	visible: boolean;
	onClose: () => void;
	leaderboardData: LeaderboardData;
}

function buildShareMessage(data: LeaderboardData): string {
	const { userEntry, userRank, totalStudents } = data;
	if (!userEntry || !userRank) return "";
	const programLabel = formatProgramLabel(userEntry.programName, userEntry.branch, "my program");
	const rankUrl = `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}`;
	return `I'm ranked #${userRank} among ${totalStudents} ${programLabel} students (Batch ${userEntry.batchYear}) with a CGPA of ${userEntry.cgpa.toFixed(2)}! 🏆\n\nTrack your CGPA, plan your goals, and see where you stand — sync your LPU UMS data with Bhemu Calculator.\n${rankUrl}`;
}

export default function ShareLeaderboardModal({ visible, onClose, leaderboardData }: Props) {
	const [copied, setCopied] = useState(false);

	const { userEntry } = leaderboardData;
	const shareUrl = userEntry ? `https://calc.bhemu.in/rank/${userEntry.userId}_${userEntry.profileId}` : null;
	const shareMessage = buildShareMessage(leaderboardData);

	const handleNativeShare = useCallback(async () => {
		try {
			await Share.share({ message: shareMessage, url: shareUrl ?? undefined });
		} catch {
			// user cancelled
		}
	}, [shareMessage, shareUrl]);

	const handleCopyLink = useCallback(() => {
		if (!shareUrl) return;
		Clipboard.setString(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, [shareUrl]);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			statusBarTranslucent
			onRequestClose={onClose}
			presentationStyle="overFullScreen"
		>
			<View style={local.overlay}>
				<TouchableOpacity style={local.backdrop} onPress={onClose} activeOpacity={1} />

				<View style={local.sheet}>
					{/* Drag handle */}
					<View style={local.dragHandle} />

					{/* Header */}
					<View style={local.header}>
						<Text style={local.headerTitle}>Share Your Rank</Text>
						<TouchableOpacity onPress={onClose} hitSlop={8}>
							<X size={20} color={Colors.textMuted} />
						</TouchableOpacity>
					</View>

					<ScrollView
						showsVerticalScrollIndicator={false}
						contentContainerStyle={local.scrollContent}
						bounces={false}
					>
						{/* Card preview */}
						<View style={local.cardPreview}>
							<LeaderboardShareCard leaderboardData={leaderboardData} />
						</View>

						{/* Share button */}
						<View style={local.section}>
							<Text style={local.sectionLabel}>SHARE</Text>
							<TouchableOpacity style={local.shareBtn} onPress={handleNativeShare} activeOpacity={0.8}>
								<MessageCircle size={16} color={Colors.textPrimary} />
								<Text style={local.shareBtnText}>Share My Rank</Text>
							</TouchableOpacity>
						</View>

						{/* Copy link */}
						{shareUrl && (
							<View style={local.section}>
								<Text style={local.sectionLabel}>LINK</Text>
								<View style={local.linkRow}>
									<Link2 size={14} color={Colors.textSubtle} />
									<Text style={local.linkText} numberOfLines={1}>{shareUrl}</Text>
									<TouchableOpacity
										style={[local.copyBtn, copied && local.copyBtnCopied]}
										onPress={handleCopyLink}
										activeOpacity={0.7}
									>
										{copied ? (
											<>
												<Check size={12} color="#10B981" />
												<Text style={[local.copyBtnText, { color: "#10B981" }]}>Copied</Text>
											</>
										) : (
											<>
												<Link2 size={12} color={Colors.primary} />
												<Text style={local.copyBtnText}>Copy</Text>
											</>
										)}
									</TouchableOpacity>
								</View>
							</View>
						)}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.55)",
	},
	backdrop: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	sheet: {
		backgroundColor: Colors.surface,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: "87%",
		borderWidth: 1,
		borderColor: Colors.border,
		borderBottomWidth: 0,
	},
	dragHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: "rgba(255,255,255,0.2)",
		alignSelf: "center",
		marginTop: Spacing.md,
		marginBottom: Spacing.xs,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: Colors.border,
	},
	headerTitle: {
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	scrollContent: {
		padding: Spacing.xl,
		gap: Spacing.xl,
		paddingBottom: Spacing.xxxl,
	},
	cardPreview: {
		alignItems: "center",
	},
	section: {
		gap: Spacing.sm,
	},
	sectionLabel: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		letterSpacing: 1.5,
	},
	shareBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.sm,
		paddingVertical: Spacing.md,
		borderRadius: Radius.lg,
		backgroundColor: Colors.primary,
	},
	shareBtnText: {
		fontSize: FontSize.base,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	linkRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.md,
		backgroundColor: "rgba(255,255,255,0.03)",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		borderRadius: Radius.lg,
	},
	linkText: {
		flex: 1,
		fontSize: FontSize.xs,
		color: "rgba(255,255,255,0.5)",
		fontFamily: "monospace",
	},
	copyBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.xs + 2,
		borderRadius: Radius.md,
		backgroundColor: "rgba(3,152,172,0.12)",
		borderWidth: 1,
		borderColor: "rgba(3,152,172,0.25)",
	},
	copyBtnCopied: {
		backgroundColor: "rgba(16,185,129,0.15)",
		borderColor: "rgba(16,185,129,0.25)",
	},
	copyBtnText: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.semibold,
		color: Colors.primary,
	},
});
