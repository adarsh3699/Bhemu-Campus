import { useMemo } from "react";
import { Text, Linking, type TextStyle } from "react-native";
import { Colors, FontSize, FontWeight } from "@/constants/Theme";

type Segment =
	| { type: "text"; content: string }
	| { type: "bold"; content: string }
	| { type: "link"; content: string; href: string }
	| { type: "newline" };

function decode(s: string): string {
	return s
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&mdash;/g, "—")
		.replace(/&ndash;/g, "–")
		.replace(/&rsquo;/g, "’")
		.replace(/&lsquo;/g, "‘")
		.replace(/&rdquo;/g, "”")
		.replace(/&ldquo;/g, "“")
		.replace(/&hellip;/g, "…")
		.replace(/&bull;/g, "•")
		.replace(/&trade;/g, "™")
		.replace(/&reg;/g, "®")
		.replace(/&copy;/g, "©")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// Collapse runs of 3+ spaces (LPU uses &nbsp; chains for fake-table alignment)
function collapseSpaces(s: string): string {
	return s.replace(/ {3,}/g, "  ");
}

export function parseHtmlSegments(html: string): Segment[] {
	const segments: Segment[] = [];
	let remaining = html;
	let bold = false;

	const pushText = (raw: string) => {
		// Collapse all whitespace (including \n \r \t from indented HTML) to single space
		const content = collapseSpaces(
			decode(raw)
				.replace(/[\r\n\t]+/g, " ")
				.trim()
		);
		if (!content) return;
		segments.push(bold ? { type: "bold", content } : { type: "text", content });
	};

	while (remaining.length > 0) {
		// <br> variants
		if (/^<br\s*\/?>/i.test(remaining)) {
			segments.push({ type: "newline" });
			remaining = remaining.slice(remaining.match(/^<br\s*\/?>/)![0].length);
			continue;
		}

		// </p> and block-end tags → paragraph break (2 newlines)
		if (/^<\/(p|div|ul|ol|h[1-6]|section|article)>/i.test(remaining)) {
			segments.push({ type: "newline" });
			segments.push({ type: "newline" });
			remaining = remaining.slice(remaining.match(/^<\/[^>]+>/)![0].length);
			continue;
		}

		// </li> → single newline (tight list)
		if (/^<\/li>/i.test(remaining)) {
			segments.push({ type: "newline" });
			remaining = remaining.slice(5);
			continue;
		}

		// <li> → bullet prefix
		if (/^<li>/i.test(remaining)) {
			// collapse any trailing newline before bullet so they aren't double-spaced
			if (segments.length > 0 && segments[segments.length - 1].type !== "newline") {
				segments.push({ type: "newline" });
			}
			segments.push({ type: "text", content: "• " });
			remaining = remaining.slice(4);
			continue;
		}

		// Bold on
		if (/^<(strong|b)\b[^>]*>/i.test(remaining)) {
			bold = true;
			remaining = remaining.slice(remaining.match(/^<[^>]+>/)![0].length);
			continue;
		}

		// Bold off
		if (/^<\/(strong|b)>/i.test(remaining)) {
			bold = false;
			remaining = remaining.slice(remaining.match(/^<\/[^>]+>/)![0].length);
			continue;
		}

		// <a ...>text</a>
		const aMatch = remaining.match(/^<a\b[^>]*>([\s\S]*?)<\/a>/i);
		if (aMatch) {
			const tag = aMatch[0];
			const innerText = decode(aMatch[1].replace(/<[^>]+>/g, " ").trim());
			const hrefMatch = tag.match(/href=["']{0,2}(https?:\/\/[^"'\s>]+)/i);
			const href = hrefMatch ? hrefMatch[1] : "";
			if (innerText) {
				segments.push(href ? { type: "link", content: innerText, href } : { type: "text", content: innerText });
			}
			remaining = remaining.slice(tag.length);
			continue;
		}

		// Skip any other tag
		const tagMatch = remaining.match(/^<[^>]+>/);
		if (tagMatch) {
			remaining = remaining.slice(tagMatch[0].length);
			continue;
		}

		// Plain text until next tag
		const nextTag = remaining.indexOf("<");
		if (nextTag === -1) {
			pushText(remaining);
			break;
		}
		pushText(remaining.slice(0, nextTag));
		remaining = remaining.slice(nextTag);
	}

	// Merge adjacent same-type text/bold segments; ensure space at text↔bold transitions
	const merged: Segment[] = [];
	for (const seg of segments) {
		const prev = merged[merged.length - 1];
		if ((seg.type === "text" || seg.type === "bold") && prev?.type === seg.type) {
			(prev as { type: "text" | "bold"; content: string }).content += seg.content;
		} else {
			// Inline transition between text and bold — add space if neither side has one
			if (
				(seg.type === "text" || seg.type === "bold") &&
				prev && (prev.type === "text" || prev.type === "bold")
			) {
				const prevContent = (prev as { content: string }).content;
				const segContent = (seg as { content: string }).content;
				if (!prevContent.endsWith(" ") && !segContent.startsWith(" ")) {
					(prev as { content: string }).content += " ";
				}
			}
			merged.push({ ...seg });
		}
	}

	// Auto-link bare URLs inside text segments
	const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;
	const result: Segment[] = [];
	for (const seg of merged) {
		if (seg.type !== "text") {
			result.push(seg);
			continue;
		}
		const text = (seg as { type: "text"; content: string }).content;
		let last = 0;
		URL_RE.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = URL_RE.exec(text)) !== null) {
			if (m.index > last) result.push({ type: "text", content: text.slice(last, m.index) });
			result.push({ type: "link", content: m[0], href: m[0] });
			last = m.index + m[0].length;
		}
		if (last < text.length) result.push({ type: "text", content: text.slice(last) });
	}

	// Trim leading/trailing newlines and collapse consecutive newlines to max 2
	const trimmed: Segment[] = [];
	let newlineCount = 0;
	for (const seg of result) {
		if (seg.type === "newline") {
			newlineCount++;
			if (newlineCount <= 2) trimmed.push(seg); // max 1 blank line between blocks
		} else {
			newlineCount = 0;
			trimmed.push(seg);
		}
	}
	while (trimmed.length > 0 && trimmed[0].type === "newline") trimmed.shift();
	while (trimmed.length > 0 && trimmed[trimmed.length - 1].type === "newline") trimmed.pop();

	return trimmed;
}

interface HtmlTextProps {
	html: string;
	style?: TextStyle;
	numberOfLines?: number;
}

export function HtmlText({ html, style, numberOfLines }: HtmlTextProps) {
	const segments = useMemo(() => parseHtmlSegments(html), [html]);
	const baseFontSize = (style as TextStyle | undefined)?.fontSize ?? FontSize.sm;

	return (
		<Text style={style} numberOfLines={numberOfLines}>
			{segments.map((seg, i) => {
				if (seg.type === "newline") return "\n";
				if (seg.type === "bold") {
					return (
						<Text
							key={i}
							style={{
								fontWeight: FontWeight.semibold,
								color: Colors.textPrimary,
								fontSize: baseFontSize,
							}}
						>
							{seg.content}
						</Text>
					);
				}
				if (seg.type === "link") {
					return (
						<Text
							key={i}
							style={{ color: Colors.secondary, fontSize: baseFontSize, textDecorationLine: "underline" }}
							onPress={() => Linking.openURL(seg.href).catch(() => {})}
						>
							{seg.content}
						</Text>
					);
				}
				return seg.content;
			})}
		</Text>
	);
}
