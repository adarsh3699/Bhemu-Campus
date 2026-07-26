import { useRef, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Plus, ChevronDown } from "lucide-react-native";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

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
	onChange: (name: string, value: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
	focusField?: "name" | "total";
}

export default function AttendanceSubjectForm({ form, editingId, onChange, onSubmit, onCancel, focusField }: Props) {
	const [open, setOpen] = useState(false);
	const nameRef = useRef<TextInput>(null);
	const totalRef = useRef<TextInput>(null);
	const attendedRef = useRef<TextInput>(null);
	const thresholdRef = useRef<TextInput>(null);

	// Auto-open when editing a subject
	useEffect(() => {
		if (editingId) setOpen(true);
	}, [editingId]);

	// Auto-focus after open
	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(() => {
			if (focusField === "total") totalRef.current?.focus();
			else nameRef.current?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, [open, focusField, editingId]);

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
				style={[local.toggleBtn, open && local.toggleBtnOpen]}
				onPress={open ? handleCancel : () => setOpen(true)}
				activeOpacity={0.8}
			>
				{open ? (
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
			{open && (
				<View style={local.card}>
					{/* Subject name */}
					<View style={local.fieldWrap}>
						<Text style={local.label}>
							Subject Name <Text style={local.req}>*</Text>
						</Text>
						<TextInput
							ref={nameRef}
							style={[local.input, !nameValid && form.name !== "" && local.inputError]}
							value={form.name}
							onChangeText={(v) => onChange("name", v)}
							placeholder='e.g. "Mathematics"'
							placeholderTextColor={Colors.textSubtle}
							returnKeyType="next"
							onSubmitEditing={() => totalRef.current?.focus()}
							submitBehavior="submit"
						/>
					</View>

					{/* Numeric row */}
					<View style={local.numRow}>
						<View style={[local.fieldWrap, local.numField]}>
							<Text style={local.label}>
								Total <Text style={local.req}>*</Text>
							</Text>
							<TextInput
								ref={totalRef}
								style={[local.input, !totalValid && form.totalClasses !== "" && local.inputError]}
								value={form.totalClasses}
								onChangeText={(v) => onChange("totalClasses", v)}
								placeholder="40"
								placeholderTextColor={Colors.textSubtle}
								keyboardType="number-pad"
								returnKeyType="next"
								onSubmitEditing={() => attendedRef.current?.focus()}
								submitBehavior="submit"
							/>
						</View>
						<View style={[local.fieldWrap, local.numField]}>
							<Text style={local.label}>
								Attended <Text style={local.req}>*</Text>
							</Text>
							<TextInput
								ref={attendedRef}
								style={[local.input, !attendedValid && form.attended !== "" && local.inputError]}
								value={form.attended}
								onChangeText={(v) => onChange("attended", v)}
								placeholder="32"
								placeholderTextColor={Colors.textSubtle}
								keyboardType="number-pad"
								returnKeyType="next"
								onSubmitEditing={() => thresholdRef.current?.focus()}
								submitBehavior="submit"
							/>
						</View>
						<View style={[local.fieldWrap, local.numField]}>
							<Text style={local.label}>Threshold %</Text>
							<TextInput
								ref={thresholdRef}
								style={local.input}
								value={form.threshold}
								onChangeText={(v) => onChange("threshold", v)}
								placeholder="Default"
								placeholderTextColor={Colors.textSubtle}
								keyboardType="number-pad"
								returnKeyType="done"
								onSubmitEditing={handleSubmit}
							/>
						</View>
					</View>

					{/* Action button */}
					<TouchableOpacity style={local.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
						<Plus size={16} color={Colors.textPrimary} />
						<Text style={local.submitText}>{editingId ? "Update" : "Add"}</Text>
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
	fieldWrap: { gap: 4 },
	numRow: { flexDirection: "row", gap: Spacing.sm },
	numField: { flex: 1 },
	label: {
		fontSize: FontSize.xs,
		fontWeight: FontWeight.bold,
		color: Colors.textSubtle,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	req: { color: Colors.textMuted },
	input: {
		height: 42,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.md,
		borderWidth: 1,
		borderColor: Colors.borderLight,
		paddingHorizontal: Spacing.md,
		fontSize: FontSize.base,
		color: Colors.textPrimary,
	},
	inputError: {
		borderColor: Colors.destructive,
	},
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
	submitText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
		textTransform: "uppercase",
		letterSpacing: 0.6,
	},

});
