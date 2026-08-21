import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from "@/constants/Theme";
import type { AppUpdateManifest, DownloadProgress } from "./types";

interface AppUpdateDialogProps {
	visible: boolean;
	manifest: AppUpdateManifest | null;
	progress: DownloadProgress | null;
	status: "available" | "downloading" | "error";
	errorMessage: string | null;
	onUpdate: () => void;
	onLater: () => void;
	onRetry: () => void;
	onOpenSettings: () => void;
	onOpenWebsite: () => void;
}

export default function AppUpdateDialog({
	visible,
	manifest,
	progress,
	status,
	errorMessage,
	onUpdate,
	onLater,
	onRetry,
	onOpenSettings,
	onOpenWebsite,
}: AppUpdateDialogProps) {
	if (!manifest) return null;

	const isDownloading = status === "downloading";
	const isError = status === "error";
	const percent = progress?.progress == null ? null : Math.min(100, Math.max(0, Math.round(progress.progress * 100)));

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={manifest.mandatory ? undefined : onLater}>
			<View style={local.overlay}>
				<View style={local.card} accessibilityViewIsModal>
					<View style={local.badge}><Text style={local.badgeText}>NEW VERSION</Text></View>
					<Text style={local.title}>Update bCampus</Text>
					<Text style={local.message}>
						Version {manifest.version} is ready{manifest.mandatory ? " and required to continue" : " with improvements for your app"}.
					</Text>

					{manifest.releaseNotes.length > 0 ? (
						<View style={local.notes}>
							{manifest.releaseNotes.map((note) => <Text key={note} style={local.note}>• {note}</Text>)}
						</View>
					) : null}

					{isDownloading ? (
						<View style={local.progressSection} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percent ?? undefined }}>
							<View style={local.progressHeader}>
								<Text style={local.progressLabel}>{percent == null ? "Preparing download…" : "Downloading update…"}</Text>
								{percent == null ? <ActivityIndicator size="small" color={Colors.secondary} /> : <Text style={local.progressPercent}>{`${percent}%`}</Text>}
							</View>
							{percent == null ? (
								<Text style={local.helper}>Connecting to the release server…</Text>
							) : (
								<>
									<View style={local.progressTrack}><View style={[local.progressFill, { width: `${percent}%` }]} /></View>
									<Text style={local.helper}>Keep bCampus open while the APK downloads.</Text>
								</>
							)}
						</View>
					) : null}

					{isError ? <Text style={local.error} accessibilityRole="alert">{errorMessage ?? "The update could not be installed."}</Text> : null}

					{isError ? (
						<View style={local.buttons}>
							<Pressable onPress={onRetry} style={({ pressed }) => [local.primaryButton, pressed && local.pressed]} accessibilityRole="button"><Text style={local.primaryText}>Retry</Text></Pressable>
							<Pressable onPress={onOpenSettings} style={({ pressed }) => [local.secondaryButton, pressed && local.pressed]} accessibilityRole="button"><Text style={local.secondaryText}>Install settings</Text></Pressable>
						</View>
					) : (
						<View style={local.buttons}>
							{manifest.mandatory ? null : <Pressable disabled={isDownloading} onPress={onLater} style={({ pressed }) => [local.secondaryButton, isDownloading && local.disabled, pressed && !isDownloading && local.pressed]} accessibilityRole="button"><Text style={local.secondaryText}>Later</Text></Pressable>}
							<Pressable disabled={isDownloading} onPress={onUpdate} style={({ pressed }) => [local.primaryButton, isDownloading && local.disabled, pressed && !isDownloading && local.pressed]} accessibilityRole="button"><Text style={local.primaryText}>{isDownloading ? "Downloading…" : "Update now"}</Text></Pressable>
						</View>
					)}

					{manifest.websiteUrl ? (
						<Pressable
							disabled={isDownloading}
							onPress={onOpenWebsite}
							style={({ pressed }) => [local.websiteButton, isDownloading && local.disabled, pressed && !isDownloading && local.pressed]}
							accessibilityRole="link"
							accessibilityHint="Opens the bCampus website where you can download the APK"
						>
							<Text style={local.websiteText}>Download from website</Text>
						</Pressable>
					) : null}
				</View>
			</View>
		</Modal>
	);
}

const local = StyleSheet.create({
	overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, backgroundColor: "rgba(0,0,0,0.72)" },
	card: { width: "100%", maxWidth: 420, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.surface, ...Shadow.card },
	badge: { alignSelf: "flex-start", borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6, backgroundColor: "rgba(3,152,172,0.14)" },
	badgeText: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
	title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
	message: { color: Colors.textMuted, fontSize: FontSize.base, lineHeight: 22 },
	notes: { gap: 6, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceElevated },
	note: { color: Colors.textBody, fontSize: FontSize.sm, lineHeight: 19 },
	progressSection: { gap: Spacing.sm, paddingTop: Spacing.sm },
	progressHeader: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.md },
	progressLabel: { color: Colors.textBody, fontSize: FontSize.sm },
	progressPercent: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
	progressTrack: { height: 8, overflow: "hidden", borderRadius: Radius.full, backgroundColor: Colors.border },
	progressFill: { height: "100%", borderRadius: Radius.full, backgroundColor: Colors.primary },
	helper: { color: Colors.textSubtle, fontSize: FontSize.xs },
	error: { color: Colors.destructive, fontSize: FontSize.sm, lineHeight: 20 },
	buttons: { flexDirection: "row", gap: Spacing.sm, paddingTop: Spacing.sm },
	primaryButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, paddingHorizontal: Spacing.md, backgroundColor: Colors.primary },
	secondaryButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
	primaryText: { color: Colors.textPrimary, fontSize: FontSize.base, fontWeight: FontWeight.bold },
	secondaryText: { color: Colors.textMuted, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
	websiteButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.md },
	websiteText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
	disabled: { opacity: 0.5 },
	pressed: { opacity: 0.78 },
});
