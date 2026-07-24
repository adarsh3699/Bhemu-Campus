import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Plus, X } from "lucide-react-native";
import { calculateGPA } from "@bhemu/shared";
import type { GPASemester } from "@bhemu/shared";
import { Colors, Spacing, Radius, FontSize, FontWeight } from "@/constants/Theme";

interface SemesterTabsProps {
	semesters: GPASemester[];
	activeSemester: string | number | null;
	isReadOnly: boolean;
	addSemesterLoading: boolean;
	onSelectSemester: (id: string | number) => void;
	onAddSemester: () => void;
	onDeleteSemester: (id: string | number, name: string) => void;
}

export default function SemesterTabs({
	semesters,
	activeSemester,
	isReadOnly,
	addSemesterLoading,
	onSelectSemester,
	onDeleteSemester,
	onAddSemester,
}: SemesterTabsProps) {
	return (
		<View style={local.container}>
			<View style={local.header}>
				<Text style={local.sectionTitle}>
					{isReadOnly ? "View Semesters" : "Manage Semesters"}
				</Text>
				<TouchableOpacity
					style={[local.addBtn, (isReadOnly || addSemesterLoading) && local.addBtnDisabled]}
					onPress={onAddSemester}
					disabled={isReadOnly || addSemesterLoading}
					activeOpacity={0.8}
				>
					{addSemesterLoading
						? <ActivityIndicator size="small" color={Colors.textPrimary} />
						: <Plus size={16} color={Colors.textPrimary} strokeWidth={2.5} />
					}
					<Text style={local.addBtnText}>
						{isReadOnly ? "Read-Only" : addSemesterLoading ? "Saving..." : "Add Semester"}
					</Text>
				</TouchableOpacity>
			</View>

			{semesters.length > 0 && (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={local.scrollContent}
				>
					{semesters.map((semester) => {
						const isActive = String(activeSemester) === String(semester.id);
						return (
							<TouchableOpacity
								key={String(semester.id)}
								style={[local.tab, isActive && local.tabActive]}
								onPress={() => onSelectSemester(semester.id)}
								activeOpacity={0.75}
							>
								<Text style={[local.tabName, isActive && local.tabNameActive]}>
									{semester.name}
								</Text>
								<Text style={[local.tabGpa, isActive && local.tabGpaActive]}>
									GPA: {calculateGPA(semester.subjects)}
								</Text>
								{!isReadOnly && (
									<TouchableOpacity
										style={local.deleteBtn}
										onPress={() => onDeleteSemester(semester.id, semester.name)}
										hitSlop={6}
									>
										<X size={9} color={Colors.textPrimary} strokeWidth={2.5} />
									</TouchableOpacity>
								)}
							</TouchableOpacity>
						);
					})}
				</ScrollView>
			)}
		</View>
	);
}

const local = StyleSheet.create({
	container: {
		marginBottom: Spacing.sm,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: Spacing.md,
	},
	sectionTitle: {
		fontSize: FontSize.xl,
		fontWeight: FontWeight.semibold,
		color: Colors.textPrimary,
	},
	addBtn: {
		flexDirection: "row",
		alignItems: "center",
		gap: Spacing.xs,
		paddingHorizontal: Spacing.md,
		paddingVertical: Spacing.sm,
		backgroundColor: Colors.success,
		borderRadius: Radius.xl,
		shadowColor: Colors.success,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.35,
		shadowRadius: 8,
		elevation: 5,
	},
	addBtnDisabled: { opacity: 0.5 },
	addBtnText: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.bold,
		color: Colors.textPrimary,
	},
	scrollContent: {
		gap: Spacing.sm,
		paddingVertical: Spacing.sm,
		paddingHorizontal: 2,
	},
	tab: {
		paddingHorizontal: Spacing.lg,
		paddingVertical: Spacing.sm + 2,
		backgroundColor: Colors.surfaceElevated,
		borderRadius: Radius.lg,
		borderWidth: 2,
		borderColor: Colors.border,
		alignItems: "center",
		minWidth: 120,
		position: "relative",
	},
	tabActive: {
		borderColor: Colors.primary,
		backgroundColor: Colors.surface,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.45,
		shadowRadius: 12,
		elevation: 6,
		transform: [{ scale: 1.04 }],
	},
	tabName: {
		fontSize: FontSize.sm,
		fontWeight: FontWeight.semibold,
		color: Colors.textMuted,
		marginBottom: 2,
	},
	tabNameActive: {
		color: Colors.textPrimary,
		fontWeight: FontWeight.bold,
	},
	tabGpa: {
		fontSize: FontSize.xs,
		color: Colors.textSubtle,
	},
	tabGpaActive: {
		color: Colors.primary,
		fontWeight: FontWeight.semibold,
	},
	deleteBtn: {
		position: "absolute",
		top: -7,
		right: -7,
		width: 18,
		height: 18,
		backgroundColor: Colors.destructive,
		borderRadius: 9,
		alignItems: "center",
		justifyContent: "center",
	},
});
