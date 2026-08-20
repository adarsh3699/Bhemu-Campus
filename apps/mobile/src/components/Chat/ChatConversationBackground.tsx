import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { Colors } from "@/constants/Theme";

const TILE_SIZE = 180;

export default function ChatConversationBackground() {
	const { width, height } = useWindowDimensions();
	const columns = Math.ceil(width / TILE_SIZE) + 1;
	const rows = Math.ceil(height / TILE_SIZE) + 1;

	return (
		<Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
			<Rect width="100%" height="100%" fill={Colors.chatCanvas} />
			{Array.from({ length: rows }, (_row, row) =>
				Array.from({ length: columns }, (_column, column) => (
					<G key={`${row}-${column}`} transform={`translate(${column * TILE_SIZE},${row * TILE_SIZE})`} opacity={0.38}>
						<Path
							d="M25 31c13-15 30-15 39-3 8 10 1 24-13 27-14 3-28-8-26-24ZM116 20c2 13 13 22 26 21 12-1 18-15 10-25-7-10-25-9-36 4ZM18 120c11-14 31-15 42-1 8 11-1 28-15 29-16 1-30-13-27-28Z"
							fill="none"
							stroke={Colors.chatPattern}
							strokeWidth={1.25}
						/>
						<Circle cx={139} cy={120} r={17} fill="none" stroke={Colors.chatPattern} strokeWidth={1.25} />
						<Path d="m121 120 11-8 10 8 12-8 10 8M83 83c11-12 25-12 35 0-10 13-24 13-35 0Z" fill="none" stroke={Colors.chatPattern} strokeWidth={1.25} />
						<Path d="m94 83 7-6 7 6-7 7-7-7Z" fill="none" stroke={Colors.chatPattern} strokeWidth={1.25} />
					</G>
				)),
			)}
		</Svg>
	);
}
