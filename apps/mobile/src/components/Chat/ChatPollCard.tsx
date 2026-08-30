import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, Clock3, LockKeyhole } from "lucide-react-native";
import { getChatPollOptionPercentage, getChatPollTotalVotes, toggleChatPollOption, type ChatPoll } from "@bhemu/shared";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";

interface Props {
	poll: ChatPoll;
	isOwn: boolean;
	canClose: boolean;
	onVote: (pollId: string, optionIds: string[]) => Promise<void>;
	onClose: (pollId: string) => Promise<void>;
}

export default function ChatPollCard({ poll, isOwn, canClose, onVote, onClose }: Props) {
	const [selection, setSelection] = useState<{ pollId: string; optionIds: string[] }>({ pollId: "", optionIds: [] });
	const [submitting, setSubmitting] = useState(false);
	const [expiredPollId, setExpiredPollId] = useState<string | null>(null);

	useEffect(() => {
		if (!poll.closesAt) return;
		const deadline = Date.parse(poll.closesAt);
		if (!Number.isFinite(deadline)) return;
		const timeout = setTimeout(() => setExpiredPollId(poll.id), Math.max(0, deadline - Date.now()) + 1);
		return () => clearTimeout(timeout);
	}, [poll.closesAt, poll.id]);

	const totalVotes = useMemo(() => getChatPollTotalVotes(poll.options), [poll.options]);
	const selected = selection.pollId === poll.id ? selection.optionIds : [];
	const expired = expiredPollId === poll.id;
	const closed = poll.isClosed || expired;

	const toggleOption = (optionId: string) => {
		if (closed || submitting) return;
		setSelection((current) => {
			const currentOptions = current.pollId === poll.id ? current.optionIds : [];
			const optionIds = toggleChatPollOption(currentOptions, optionId, poll.multipleChoice);
			return { pollId: poll.id, optionIds };
		});
	};

	const submitVote = async () => {
		if (closed || selected.length === 0 || submitting) return;
		setSubmitting(true);
		try {
			await onVote(poll.id, selected);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<View style={[local.card, isOwn && local.ownCard]}>
			<View style={local.header}>
				<Text style={local.instruction}>
					{poll.multipleChoice ? "Choose all that apply" : "Choose one option"}
				</Text>
				{closed ? (
					<View style={local.status}>
						<LockKeyhole size={13} color={Colors.textMuted} />
						<Text style={local.statusText}>Closed</Text>
					</View>
				) : poll.closesAt ? (
					<View style={local.status}>
						<Clock3 size={13} color={Colors.textMuted} />
						<Text style={local.statusText}>{new Date(poll.closesAt).toLocaleDateString()}</Text>
					</View>
				) : null}
			</View>

			{poll.options.map((option) => {
				const isSelected = selected.includes(option.id);
				const percentage = getChatPollOptionPercentage(option, totalVotes);
				return (
					<Pressable
						key={option.id}
						disabled={closed || submitting}
						onPress={() => toggleOption(option.id)}
						accessibilityRole="button"
						accessibilityLabel={`${option.optionText}, ${percentage}%`}
						accessibilityState={{ selected: isSelected, disabled: closed || submitting }}
						style={({ pressed }) => [
							local.option,
							isSelected && local.selectedOption,
							pressed && local.pressed,
							closed && local.closedOption,
						]}
					>
						{totalVotes > 0 ? (
							<View
								pointerEvents="none"
								style={[local.progress, isSelected ? local.selectedProgress : local.defaultProgress, { width: `${percentage}%` }]}
							/>
						) : null}
						<View style={local.optionContent}>
							<View
								style={[
									local.selector,
									poll.multipleChoice ? local.checkbox : local.radio,
									isSelected && local.selectedSelector,
								]}
							>
								{isSelected ? (
									poll.multipleChoice ? (
										<Check size={12} color={Colors.textPrimary} strokeWidth={3} />
									) : (
										<View style={local.radioDot} />
									)
								) : null}
							</View>
							<Text numberOfLines={1} style={[local.optionText, isSelected && local.selectedText]}>
								{option.optionText}
							</Text>
							<Text style={[local.percentage, isSelected && local.selectedPercentage]}>
								{percentage}%
							</Text>
						</View>
					</Pressable>
				);
			})}

			<View style={local.footer}>
				<Text style={local.votes}>
					{totalVotes} {totalVotes === 1 ? "vote" : "votes"}
				</Text>
				<View style={local.footerActions}>
					{canClose && !closed ? (
						<Pressable
							accessibilityRole="button"
							onPress={() => void onClose(poll.id)}
							disabled={submitting}
							style={({ pressed }) => [local.closeButton, pressed && local.pressed]}
						>
							<Text style={local.closeText}>Close poll</Text>
						</Pressable>
					) : null}
					{!closed ? (
						<Pressable
							accessibilityRole="button"
							onPress={() => void submitVote()}
							disabled={selected.length === 0 || submitting}
							style={({ pressed }) => [
								local.voteButton,
								(selected.length === 0 || submitting) && local.disabledButton,
								pressed && local.pressed,
							]}
						>
							{selected.length > 0 && submitting ? (
								<ActivityIndicator size="small" color={Colors.textPrimary} />
							) : (
								<Text style={local.voteText}>Vote</Text>
							)}
						</Pressable>
					) : null}
				</View>
			</View>
		</View>
	);
}

const local = StyleSheet.create({
	card: {
		width: "100%",
		maxWidth: 320,
		marginTop: Spacing.xs,
		padding: Spacing.sm,
		borderWidth: 1,
		borderColor: Colors.border,
		borderRadius: Radius.lg,
		backgroundColor: Colors.surface,
	},
	ownCard: { borderColor: "rgba(255,255,255,0.16)", backgroundColor: "rgba(8,25,28,0.92)" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
		marginBottom: Spacing.sm,
	},
	instruction: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textMuted },
	status: { flexDirection: "row", alignItems: "center", gap: 4 },
	statusText: { fontSize: FontSize.xs, color: Colors.textMuted },
	option: {
		minHeight: 42,
		position: "relative",
		justifyContent: "center",
		marginBottom: Spacing.xs,
		overflow: "hidden",
		borderWidth: 1,
		borderColor: Colors.borderLight,
		borderRadius: Radius.md,
		backgroundColor: Colors.surfaceElevated,
	},
	selectedOption: { borderColor: Colors.primary },
	closedOption: { opacity: 0.72 },
	progress: {
		position: "absolute",
		top: 0,
		bottom: 0,
		left: 0,
	},
	defaultProgress: { backgroundColor: "rgba(255,255,255,0.07)" },
	selectedProgress: { backgroundColor: "rgba(3,152,172,0.24)" },
	optionContent: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		paddingHorizontal: Spacing.sm,
		paddingVertical: Spacing.xs,
	},
	selector: {
		width: 20,
		height: 20,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: Colors.textSubtle,
	},
	radio: { borderRadius: Radius.full },
	checkbox: { borderRadius: Radius.sm },
	selectedSelector: { borderColor: Colors.primary, backgroundColor: Colors.primary },
	radioDot: { width: 7, height: 7, borderRadius: Radius.full, backgroundColor: Colors.textPrimary },
	optionText: { flex: 1, fontSize: FontSize.md, color: Colors.textBody },
	selectedText: { color: Colors.textPrimary, fontWeight: FontWeight.medium },
	percentage: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textMuted },
	selectedPercentage: { color: Colors.secondary },
	footer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: Spacing.sm,
		paddingTop: Spacing.sm,
		borderTopWidth: 1,
		borderTopColor: Colors.border,
	},
	votes: { fontSize: FontSize.sm, color: Colors.textMuted },
	footerActions: { minWidth: 144, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: Spacing.xs },
	closeButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
	closeText: { fontSize: FontSize.sm, color: Colors.textMuted },
	voteButton: {
		minWidth: 66,
		minHeight: 40,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
		backgroundColor: Colors.primary,
	},
	disabledButton: { backgroundColor: Colors.border },
	voteText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
	pressed: { opacity: 0.78 },
});
