import { useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, Switch, Text, View, StyleSheet } from "react-native";
import { Bell, CalendarDays, ChevronDown, ChevronRight, ChevronUp, Clock3, Send, Settings2 } from "lucide-react-native";
import { Colors, FontSize, FontWeight, Radius, Spacing } from "@/constants/Theme";
import { useGpaProfiles } from "@/contexts/GpaDataContext";
import { formatMinutesToAmPm } from "@bhemu/shared";
import { useMessage } from "@/contexts/MessageContext";
import { useNotificationSettings } from "@/features/notifications/useNotificationSettings";
import { SettingsCard, SettingsDivider, SettingsHeader, SettingsRow } from "@/components/Settings/SettingsPrimitives";
import {
	EXAM_DAYS_BEFORE,
	EXAM_REMINDER_HOURS,
	REMINDER_MINUTES,
	type NotificationSettings as NotificationSettingsValue,
} from "@/features/notifications/notificationSettings";

type PickerKey = "firstClassMinutes" | "otherClassMinutes" | "examDaysBefore" | "examReminderHour";

function formatHour(hour: number): string {
	return formatMinutesToAmPm(hour * 60);
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

function SwitchControl({
	value,
	onValueChange,
	disabled = false,
}: {
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
	const [showTimetableOptions, setShowTimetableOptions] = useState(false);
	const [showExamOptions, setShowExamOptions] = useState(false);
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
		<SettingsCard>
			<SettingsHeader
				icon={<Bell size={19} color={Colors.primary} />}
				title="Notifications"
				subtitle="Manage academic reminders on this device"
				tone="teal"
			/>

			<SettingsDivider />

			<SettingsRow
				icon={<Bell size={17} color={notificationsEnabled ? Colors.primary : Colors.textSubtle} />}
				title="Academic notifications"
				subtitle={
					notificationsBlocked
						? "Blocked in phone settings"
						: permissionStatus === "undetermined"
							? "Permission will be requested when reminders are scheduled"
							: settings.enabled
								? "Reminders are enabled"
								: "All academic reminders are paused"
				}
				trailing={
					!loading ? <SwitchControl value={notificationsEnabled} onValueChange={handleMasterToggle} /> : null
				}
			/>

			{process.env.EXPO_PUBLIC_DEVELOPER_MODE === "true" && notificationsEnabled && !loading ? (
				<SettingsRow
					icon={<Send size={17} color={Colors.primary} />}
					title="Send test notification"
					subtitle="Check that notifications work on this device"
					onPress={() => void handleTestNotification()}
					disabled={sendingTest}
					accessibilityLabel="Send test notification"
					trailing={
						sendingTest ? (
							<ActivityIndicator size="small" color={Colors.primary} />
						) : (
							<ChevronRight size={17} color={Colors.textSubtle} />
						)
					}
				/>
			) : null}

			{notificationsBlocked && permissionStatus === "denied" ? (
				<SettingsRow
					icon={<Settings2 size={17} color={Colors.warning} />}
					title="Notifications are off for bCampus"
					subtitle="Turn them on in phone settings to receive reminders."
					onPress={openNotificationSettings}
					accessibilityLabel="Open phone notification settings"
					trailing={<ChevronRight size={17} color={Colors.textSubtle} />}
				/>
			) : null}

			{notificationsEnabled && !loading && (
				<>
					<View style={local.preferenceGroup}>
						<Pressable
							style={({ pressed }) => [local.sectionHeader, pressed && local.pressed]}
							onPress={() => setShowTimetableOptions((visible) => !visible)}
							accessibilityRole="button"
							accessibilityLabel="Class reminder settings"
							accessibilityState={{ expanded: showTimetableOptions }}
						>
							<View style={local.rowIcon}>
								<CalendarDays
									size={17}
									color={settings.timetableEnabled ? Colors.primary : Colors.textSubtle}
								/>
							</View>
							<View style={local.rowContent}>
								<Text style={local.rowTitle}>Class reminders</Text>
								<Text style={local.rowSub}>
									{settings.timetableEnabled
										? "Notify before scheduled classes"
										: "Class reminders are paused"}
								</Text>
							</View>
							<SwitchControl
								value={settings.timetableEnabled}
								onValueChange={(timetableEnabled) => void updateSettings({ timetableEnabled })}
							/>
							{showTimetableOptions ? (
								<ChevronUp size={17} color={Colors.textSubtle} />
							) : (
								<ChevronDown size={17} color={Colors.textSubtle} />
							)}
						</Pressable>

						{settings.timetableEnabled && showTimetableOptions ? (
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
						) : null}
					</View>

					<View style={local.preferenceGroup}>
						<Pressable
							style={({ pressed }) => [local.sectionHeader, pressed && local.pressed]}
							onPress={() => setShowExamOptions((visible) => !visible)}
							accessibilityRole="button"
							accessibilityLabel="Exam reminder settings"
							accessibilityState={{ expanded: showExamOptions }}
						>
							<View style={local.rowIcon}>
								<Clock3 size={17} color={settings.examEnabled ? Colors.warning : Colors.textSubtle} />
							</View>
							<View style={local.rowContent}>
								<Text style={local.rowTitle}>Exam reminders</Text>
								<Text style={local.rowSub}>
									{settings.examEnabled
										? "Get notified before exam day"
										: "Exam reminders are paused"}
								</Text>
							</View>
							<SwitchControl
								value={settings.examEnabled}
								onValueChange={(examEnabled) => void updateSettings({ examEnabled })}
							/>
							{showExamOptions ? (
								<ChevronUp size={17} color={Colors.textSubtle} />
							) : (
								<ChevronDown size={17} color={Colors.textSubtle} />
							)}
						</Pressable>

						{settings.examEnabled && showExamOptions ? (
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
						) : null}
					</View>

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
									<Pressable
										key={option.value}
										style={({ pressed }) => [
											local.choice,
											selected && local.choiceSelected,
											pressed && local.pressed,
										]}
										onPress={() => selectPickerValue(option.value)}
										accessibilityRole="radio"
										accessibilityState={{ selected }}
									>
										<Text style={[local.choiceText, selected && local.choiceTextSelected]}>
											{option.label}
										</Text>
										{selected && <View style={local.choiceDot} />}
									</Pressable>
								);
							})}
							<Pressable
								style={({ pressed }) => [local.modalCancel, pressed && local.pressed]}
								onPress={() => setPicker(null)}
							>
								<Text style={local.modalCancelText}>Cancel</Text>
							</Pressable>
						</View>
					</View>
				</Modal>
			)}
		</SettingsCard>
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
		<Pressable
			style={({ pressed }) => [local.optionRow, pressed && local.pressed]}
			onPress={onPress}
			accessibilityRole="button"
			accessibilityLabel={`${title}: ${value}`}
		>
			<View style={local.rowContent}>
				<Text style={local.optionTitle}>{title}</Text>
				<Text style={local.rowSub}>{subtitle}</Text>
			</View>
			<View style={local.valuePill}>
				<Text style={local.valueText}>{value}</Text>
			</View>
			<ChevronRight size={16} color={Colors.textSubtle} />
		</Pressable>
	);
}

const local = StyleSheet.create({
	rowIcon: { width: 32, alignItems: "center", justifyContent: "center" },
	rowContent: { flex: 1, gap: 3 },
	rowTitle: { fontSize: FontSize.base, fontWeight: FontWeight.medium, color: Colors.textPrimary },
	rowSub: { fontSize: FontSize.xs, lineHeight: 16, color: Colors.textMuted },
	preferenceGroup: {
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors.border,
	},
	sectionHeader: {
		minHeight: 72,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.md,
		paddingHorizontal: Spacing.xl,
		paddingVertical: Spacing.sm,
	},
	optionsGroup: {
		marginLeft: Spacing.xl + Spacing.xxl + Spacing.md,
		marginRight: Spacing.xl,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: Colors.border,
	},
	optionRow: {
		minHeight: 64,
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.sm,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: Colors.border,
	},
	pressed: { opacity: 0.78 },
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
