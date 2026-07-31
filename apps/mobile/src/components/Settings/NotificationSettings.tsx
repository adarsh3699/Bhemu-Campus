import { useState } from "react";
import {
	ActivityIndicator,
	Linking,
	Modal,
	Pressable,
	Switch,
	Text,
	TouchableOpacity,
	View,
	StyleSheet,
} from "react-native";
import { Bell, CalendarDays, Clock3, Send, Settings2 } from "lucide-react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { useMessage } from "@/contexts/MessageContext";
import { useNotificationSettings } from "@/features/notifications/useNotificationSettings";
import {
	EXAM_DAYS_BEFORE,
	EXAM_REMINDER_HOURS,
	REMINDER_MINUTES,
	type NotificationSettings as NotificationSettingsValue,
} from "@/features/notifications/notificationSettings";

type PickerKey =
	| "firstClassMinutes"
	| "otherClassMinutes"
	| "examDaysBefore"
	| "examReminderHour";

function formatHour(hour: number): string {
	const suffix = hour >= 12 ? "PM" : "AM";
	const displayHour = hour % 12 || 12;
	return `${displayHour}:00 ${suffix}`;
}

function formatDays(days: number): string {
	return `${days} day${days === 1 ? "" : "s"} before`;
}

function getPickerData(picker: PickerKey | null) {
	if (picker === "firstClassMinutes" || picker === "otherClassMinutes") {
		return {
			title: picker === "firstClassMinutes" ? "First class reminder" : "Other class reminders",
			options: REMINDER_MINUTES.map((value) => ({ value, label: `${value} minutes before` })),
		};
	}
	if (picker === "examDaysBefore") {
		return {
			title: "Exam reminder timing",
			options: EXAM_DAYS_BEFORE.map((value) => ({ value, label: formatDays(value) })),
		};
	}
	if (picker === "examReminderHour") {
		return {
			title: "Exam reminder time",
			options: EXAM_REMINDER_HOURS.map((value) => ({ value, label: formatHour(value) })),
		};
	}
	return null;
}

function SwitchControl({ value, onValueChange, disabled = false }: {
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
}) {
	return (
		<Switch
			value={value}
			onValueChange={onValueChange}
			disabled={disabled}
			trackColor={{ false: Colors.border, true: Colors.primaryDark }}
			thumbColor={value ? Colors.primary : Colors.textSubtle}
			ios_backgroundColor={Colors.border}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
		/>
	);
}

export default function NotificationSettings() {
	const { settings, loading, permissionStatus, updateSettings } = useNotificationSettings();
	const { currentProfile } = useGpaProfiles();
	const { showMessage } = useMessage();
	const [picker, setPicker] = useState<PickerKey | null>(null);
	const [sendingTest, setSendingTest] = useState(false);
	const notificationsBlocked = permissionStatus === "denied" || permissionStatus === "unavailable";
	const notificationsEnabled = settings.enabled && !notificationsBlocked;
	const currentProfileName = currentProfile?.name?.trim() || "Current profile";

	const openNotificationSettings = () => {
		void Linking.openSettings();
	};

	const handleMasterToggle = (enabled: boolean) => {
		if (enabled && notificationsBlocked) {
			openNotificationSettings();
			return;
		}
		void updateSettings({ enabled });
	};

	const handleTestNotification = async () => {
		if (sendingTest) return;
		setSendingTest(true);
		try {
			const { sendTestNotification } = await import("@/features/notifications/notificationService");
			const sent = await sendTestNotification(currentProfileName);
			showMessage(
				sent
					? "Test notification sent. Check your notification tray."
					: "Notifications are blocked. Allow notification permission in phone settings and try again.",
				sent ? "success" : "warning"
			);
		} catch {
			showMessage("Unable to send a test notification. Please try again.", "error");
		} finally {
			setSendingTest(false);
		}
	};

	const pickerData = getPickerData(picker);

	const currentPickerValue = picker ? settings[picker] : null;

	const selectPickerValue = (value: number) => {
		if (!picker) return;
		void updateSettings({ [picker]: value } as Partial<NotificationSettingsValue>);
		setPicker(null);
	};

	return (
		<View style={local.card}>
			<View style={local.header}>
				<View style={local.headerIcon}>
					<Bell size={15} color={Colors.primary} />
				</View>
				<View style={local.headerText}>
					<Text style={local.headerTitle}>Notifications</Text>
					<Text style={local.headerSub}>Manage academic reminders on this device</Text>
				</View>
			</View>

			<View style={local.divider} />

			<View style={local.row}>
				<View style={local.rowIcon}>
					<Bell size={16} color={notificationsEnabled ? Colors.primary : Colors.textSubtle} />
				</View>
				<View style={local.rowContent}>
					<Text style={local.rowTitle}>Academic notifications</Text>
					<Text style={local.rowSub}>
						{notificationsBlocked
							? "Blocked in phone settings"
							: permissionStatus === "undetermined"
								? "Permission will be requested when reminders are scheduled"
							: settings.enabled
								? "Reminders are enabled"
								: "All academic reminders are paused"}
					</Text>
				</View>
				{!loading && (
					<SwitchControl
						value={notificationsEnabled}
						onValueChange={handleMasterToggle}
					/>
				)}
			</View>

			{!loading && (
				<Pressable
					style={[local.testButton, sendingTest && local.testButtonDisabled]}
					onPress={() => void handleTestNotification()}
					disabled={sendingTest}
					android_ripple={{ color: Colors.border }}
					accessibilityRole="button"
					accessibilityLabel="Send test notification"
				>
					<View style={local.testButtonIcon}>
						<Send size={15} color={Colors.primary} />
					</View>
					<View style={local.testButtonContent}>
						<Text style={local.testButtonTitle}>Send test notification</Text>
						<Text style={local.testButtonSub}>Check that notifications work on this device</Text>
					</View>
					{sendingTest ? <ActivityIndicator size="small" color={Colors.primary} /> : <Send size={18} color={Colors.textMuted} />}
				</Pressable>
			)}

			{notificationsBlocked && permissionStatus === "denied" && (
				<TouchableOpacity style={local.systemNotice} onPress={openNotificationSettings} activeOpacity={0.7}>
					<Settings2 size={16} color={Colors.warning} />
					<View style={local.systemNoticeContent}>
						<Text style={local.systemNoticeTitle}>Notifications are off for bCampus</Text>
						<Text style={local.systemNoticeText}>Turn them on in phone settings to receive reminders.</Text>
					</View>
				</TouchableOpacity>
			)}

			{notificationsEnabled && !loading && (
				<>
					<Text style={local.sectionLabel}>TIMETABLE</Text>
					<View style={local.row}>
						<View style={local.rowIcon}>
							<CalendarDays size={16} color={settings.timetableEnabled ? Colors.primary : Colors.textSubtle} />
						</View>
						<View style={local.rowContent}>
							<Text style={local.rowTitle}>Class reminders</Text>
							<Text style={local.rowSub}>Notify before scheduled classes</Text>
						</View>
						<SwitchControl
							value={settings.timetableEnabled}
							onValueChange={(timetableEnabled) => void updateSettings({ timetableEnabled })}
						/>
					</View>

					{settings.timetableEnabled && (
						<View style={local.optionsGroup}>
							<OptionRow
								title="First class of the day"
								subtitle="How early should the first class alert arrive?"
								value={`${settings.firstClassMinutes} min before`}
								onPress={() => setPicker("firstClassMinutes")}
							/>
							<OptionRow
								title="Other classes"
								subtitle="How early should later class alerts arrive?"
								value={`${settings.otherClassMinutes} min before`}
								onPress={() => setPicker("otherClassMinutes")}
							/>
						</View>
					)}

					<Text style={local.sectionLabel}>EXAMS</Text>
					<View style={local.row}>
						<View style={local.rowIcon}>
							<Clock3 size={16} color={settings.examEnabled ? Colors.warning : Colors.textSubtle} />
						</View>
						<View style={local.rowContent}>
							<Text style={local.rowTitle}>Exam seating reminders</Text>
							<Text style={local.rowSub}>Get notified before exam day</Text>
						</View>
						<SwitchControl
							value={settings.examEnabled}
							onValueChange={(examEnabled) => void updateSettings({ examEnabled })}
						/>
					</View>

					{settings.examEnabled && (
						<View style={local.optionsGroup}>
							<OptionRow
								title="Exam reminder"
								subtitle="Choose how many days before the exam"
								value={formatDays(settings.examDaysBefore)}
								onPress={() => setPicker("examDaysBefore")}
							/>
							<OptionRow
								title="Reminder time"
								subtitle="Local time on the reminder day"
								value={formatHour(settings.examReminderHour)}
								onPress={() => setPicker("examReminderHour")}
							/>
						</View>
					)}

					<Text style={local.helperText}>Changes automatically replace the reminders already scheduled.</Text>
				</>
			)}

			{pickerData && (
				<Modal visible transparent animationType="fade" onRequestClose={() => setPicker(null)}>
					<View style={local.modalBackdrop}>
						<View style={local.modalCard}>
							<Text style={local.modalTitle}>{pickerData.title}</Text>
							{pickerData.options.map((option) => {
								const selected = option.value === currentPickerValue;
								return (
									<TouchableOpacity
										key={option.value}
										style={[local.choice, selected && local.choiceSelected]}
										onPress={() => selectPickerValue(option.value)}
										activeOpacity={0.7}
										accessibilityRole="radio"
										accessibilityState={{ selected }}
									>
										<Text style={[local.choiceText, selected && local.choiceTextSelected]}>{option.label}</Text>
										{selected && <View style={local.choiceDot} />}
									</TouchableOpacity>
								);
							})}
							<TouchableOpacity style={local.modalCancel} onPress={() => setPicker(null)} activeOpacity={0.7}>
								<Text style={local.modalCancelText}>Cancel</Text>
							</TouchableOpacity>
						</View>
					</View>
				</Modal>
			)}
		</View>
	);
}

function OptionRow({
	title,
	subtitle,
	value,
	onPress,
}: {
	title: string;
	subtitle: string;
	value: string;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity style={local.optionRow} onPress={onPress} activeOpacity={0.7}>
			<View style={local.rowContent}>
				<Text style={local.optionTitle}>{title}</Text>
				<Text style={local.rowSub}>{subtitle}</Text>
			</View>
			<View style={local.valuePill}>
				<Text style={local.valueText}>{value}</Text>
			</View>
		</TouchableOpacity>
	);
}

const local = StyleSheet.create({
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: Colors.border,
		overflow: "hidden",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		padding: Spacing.lg,
	},
	headerIcon: {
		width: 30,
		height: 30,
		borderRadius: Radius.md,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(3,152,172,0.12)",
	},
	headerText: { flex: 1, gap: 2 },
	headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	headerSub: { fontSize: FontSize.xs, color: Colors.textSubtle },
	divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
	systemNotice: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		margin: Spacing.lg,
		padding: Spacing.md,
		borderRadius: Radius.md,
		backgroundColor: "rgba(245,158,11,0.1)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(245,158,11,0.28)",
	},
	systemNoticeContent: { flex: 1, gap: 2 },
	systemNoticeTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.warning },
	systemNoticeText: { fontSize: FontSize.xs, lineHeight: 16, color: Colors.textMuted },
	row: {
		minHeight: 64,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm,
	},
	rowIcon: { width: 24, alignItems: "center" },
	rowContent: { flex: 1, gap: 3 },
	rowTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
	rowSub: { fontSize: FontSize.xs, lineHeight: 16, color: Colors.textMuted },
	testButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		marginHorizontal: Spacing.lg,
		marginTop: Spacing.sm,
		padding: Spacing.md,
		borderRadius: Radius.md,
		backgroundColor: "rgba(3,152,172,0.08)",
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: "rgba(3,152,172,0.28)",
	},
	testButtonDisabled: { opacity: 0.6 },
	testButtonIcon: {
		width: 30,
		height: 30,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: Radius.md,
		backgroundColor: "rgba(3,152,172,0.12)",
	},
	testButtonContent: { flex: 1, gap: 2 },
	testButtonTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
	testButtonSub: { fontSize: FontSize.xs, color: Colors.textMuted },
	sectionLabel: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.md,
		paddingBottom: Spacing.xs,
		fontSize: 10,
		fontWeight: FontWeight.bold,
		letterSpacing: 1,
		color: Colors.textSubtle,
	},
	optionsGroup: {
		marginHorizontal: Spacing.lg,
		marginLeft: Spacing.xxl + Spacing.lg,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors.border,
	},
	optionRow: {
		minHeight: 58,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: Colors.border,
	},
	optionTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
	valuePill: {
		minHeight: 40,
		justifyContent: "center",
		paddingHorizontal: Spacing.sm,
		borderRadius: Radius.md,
		backgroundColor: "rgba(3,152,172,0.12)",
	},
	valueText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.primary },
	helperText: {
		paddingHorizontal: Spacing.lg,
		paddingTop: Spacing.md,
		paddingBottom: Spacing.lg,
		fontSize: FontSize.xs,
		lineHeight: 16,
		color: Colors.textSubtle,
	},
	modalBackdrop: {
		flex: 1,
		justifyContent: "center",
		padding: Spacing.xl,
		backgroundColor: "rgba(0,0,0,0.6)",
	},
	modalCard: {
		padding: Spacing.lg,
		borderRadius: Radius.xl,
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.borderLight,
	},
	modalTitle: {
		marginBottom: Spacing.md,
		fontSize: FontSize.lg,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	choice: {
		minHeight: 48,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: Spacing.md,
		borderRadius: Radius.md,
	},
	choiceSelected: { backgroundColor: "rgba(3,152,172,0.14)" },
	choiceText: { fontSize: FontSize.base, color: Colors.textMuted },
	choiceTextSelected: { fontWeight: FontWeight.semibold, color: Colors.primary },
	choiceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
	modalCancel: {
		minHeight: 44,
		alignItems: "center",
		justifyContent: "center",
		marginTop: Spacing.sm,
		borderRadius: Radius.md,
		backgroundColor: Colors.border,
	},
	modalCancelText: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
});
