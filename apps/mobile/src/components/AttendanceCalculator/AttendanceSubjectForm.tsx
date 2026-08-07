import { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import type { TextInput } from "react-native";
import { Plus, ChevronDown } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";
import AppInput from "@/components/ui/AppInput";

export interface AttendanceFormState {
	id: string;
	name: string;
	totalClasses: string;
	attended: string;
	threshold: string;
}

interface Props {
	form: AttendanceFormState;
	editingId: string | null;
	saving?: boolean;
	onChange: (name: string, value: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
	focusField?: "name" | "total";
}

export default function AttendanceSubjectForm({ form, editingId, saving = false, onChange, onSubmit, onCancel, focusField }: Props) {
	const [open, setOpen] = useState(false);
	const isFormOpen = open || !!editingId;
	const nameRef = useRef<TextInput>(null);
	const totalRef = useRef<TextInput>(null);
	const attendedRef = useRef<TextInput>(null);
	const thresholdRef = useRef<TextInput>(null);

	// Auto-focus after open
	useEffect(() => {
		if (!isFormOpen) return;
		const timer = setTimeout(() => {
			if (focusField === "total") totalRef.current?.focus();
			else nameRef.current?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, [isFormOpen, focusField, editingId]);

	const handleCancel = () => {
		onCancel();
		setOpen(false);
	};

	const handleSubmit = () => {
		onSubmit();
		if (!editingId) setOpen(false);
	};

	const nameValid = form.name.trim().length > 0;
	const totalValid = form.totalClasses.trim().length > 0;
	const attendedValid = form.attended.trim().length > 0;

	return (
		<View style={local.wrap}>
			{/* Toggle button — always shows cancel when open */}
			<TouchableOpacity
				style={[local.toggleBtn, isFormOpen && local.toggleBtnOpen]}
				onPress={isFormOpen ? handleCancel : () => setOpen(true)}
				activeOpacity={0.8}
			>
				{isFormOpen ? (
					<>
						<ChevronDown size={16} color={Colors.textMuted} />
						<Text style={local.toggleTextMuted}>Cancel</Text>
					</>
				) : (
					<>
						<Plus size={16} color={Colors.textPrimary} />
						<Text style={local.toggleText}>Add Subject</Text>
					</>
				)}
			</TouchableOpacity>

			{/* Expandable form */}
			{isFormOpen && (
				<View style={local.card}>
					{/* Subject name */}
					<AppInput
						ref={nameRef}
						label={<>Subject Name <Text style={local.req}>*</Text></>}
						size="md"
						error={!nameValid && form.name !== ""}
						value={form.name}
						onChangeText={(v) => onChange("name", v)}
						placeholder='e.g. "Mathematics"'
						returnKeyType="next"
						onSubmitEditing={() => totalRef.current?.focus()}
						submitBehavior="submit"
					/>

					{/* Numeric row */}
					<View style={local.numRow}>
						<AppInput
							ref={totalRef}
							label={<>Total <Text style={local.req}>*</Text></>}
							size="md"
							error={!totalValid && form.totalClasses !== ""}
							containerStyle={local.numField}
							value={form.totalClasses}
							onChangeText={(v) => onChange("totalClasses", v)}
							placeholder="40"
							keyboardType="number-pad"
							returnKeyType="next"
							onSubmitEditing={() => attendedRef.current?.focus()}
							submitBehavior="submit"
						/>
						<AppInput
							ref={attendedRef}
							label={<>Attended <Text style={local.req}>*</Text></>}
							size="md"
							error={!attendedValid && form.attended !== ""}
							containerStyle={local.numField}
							value={form.attended}
							onChangeText={(v) => onChange("attended", v)}
							placeholder="32"
							keyboardType="number-pad"
							returnKeyType="next"
							onSubmitEditing={() => thresholdRef.current?.focus()}
							submitBehavior="submit"
						/>
						<AppInput
							ref={thresholdRef}
							label="Threshold %"
							size="md"
							containerStyle={local.numField}
							value={form.threshold}
							onChangeText={(v) => onChange("threshold", v)}
							placeholder="Default"
							keyboardType="number-pad"
							returnKeyType="done"
							onSubmitEditing={handleSubmit}
						/>
					</View>

					{/* Action button */}
					<TouchableOpacity style={[local.submitBtn, saving && local.submitBtnDisabled]} onPress={handleSubmit} activeOpacity={0.8} disabled={saving}>
						{saving ? (
							<ActivityIndicator size="small" color={Colors.textPrimary} />
						) : (
							<Plus size={16} color={Colors.textPrimary} />
						)}
						<Text style={local.submitText}>{saving ? (editingId ? "Updating…" : "Adding…") : (editingId ? "Update" : "Add")}</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

const local = StyleSheet.create({
	wrap: { gap: Spacing.sm },
	toggleBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.xs,
		height: 48,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
	},
	toggleBtnOpen: {
		backgroundColor: Colors.surfaceElevated,
		borderWidth: 1,
		borderColor: Colors.border,
	},
	toggleText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	toggleTextMuted: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},
	card: {
		backgroundColor: Colors.surface,
		borderRadius: Radius.xl,
		borderWidth: 1,
		borderColor: Colors.border,
		padding: Spacing.lg,
		gap: Spacing.md,
	},
	numRow: { flexDirection: "row", gap: Spacing.sm },
	numField: { flex: 1 },
	req: { color: Colors.textMuted },
	submitBtn: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: Spacing.xs,
		height: 48,
		backgroundColor: Colors.primary,
		borderRadius: Radius.lg,
	},
	submitBtnDisabled: {
		opacity: 0.6,
	},
	submitText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},

});
