/**
 * The subset of WhatsApp's text formatting that is supported in chat
 * messages. The parser intentionally returns data instead of HTML so both
 * React DOM and React Native can render it without an unsafe HTML sink.
 */
export type WhatsAppInlinePart =
	| { type: "text"; text: string }
	| { type: "bold" | "italic" | "strikethrough" | "monospace"; children: WhatsAppInlinePart[] }
	| { type: "link"; url: string };

export type WhatsAppTextBlock =
	| { type: "text"; children: WhatsAppInlinePart[] }
	| { type: "bullet"; children: WhatsAppInlinePart[] }
	| { type: "numbered"; number: string; children: WhatsAppInlinePart[] }
	| { type: "quote"; children: WhatsAppInlinePart[] }
	| { type: "code"; text: string };

const INLINE_MARKERS = ["```", "*", "_", "~", "`"] as const;
const URL_PATTERN = /^https?:\/\/[^\s]+/i;
const TRAILING_URL_PUNCTUATION = /[.,!?;:)}\]]+$/;

function isWhitespaceOnly(value: string): boolean {
	return value.trim().length === 0;
}

function canOpenMarker(text: string, index: number, marker: string): boolean {
	const next = text[index + marker.length];
	if (!next || isWhitespaceOnly(next)) return false;

	// Underscores inside a word (for example `snake_case`) are not italic
	// markers in WhatsApp-style text.
	if (marker === "_" && index > 0 && /[\p{L}\p{N}]/u.test(text[index - 1] ?? "")) return false;
	return true;
}

function canCloseMarker(text: string, index: number, marker: string): boolean {
	const previous = text[index - 1];
	if (!previous || isWhitespaceOnly(previous)) return false;

	if (marker === "_" && index + marker.length < text.length && /[\p{L}\p{N}]/u.test(text[index + marker.length] ?? "")) {
		return false;
	}
	return true;
}

function findClosingMarker(text: string, start: number, marker: string): number {
	let index = start;
	while (index < text.length) {
		const closingIndex = text.indexOf(marker, index);
		if (closingIndex === -1) return -1;
		if (canCloseMarker(text, closingIndex, marker)) return closingIndex;
		index = closingIndex + marker.length;
	}
	return -1;
}

function trimUrl(url: string): { url: string; trailing: string } {
	const trimmedUrl = url.replace(TRAILING_URL_PUNCTUATION, "");
	return { url: trimmedUrl || url, trailing: trimmedUrl ? url.slice(trimmedUrl.length) : "" };
}

function parseInlineText(text: string): WhatsAppInlinePart[] {
	const parts: WhatsAppInlinePart[] = [];
	let plainStart = 0;

	const pushText = (value: string) => {
		if (value) parts.push({ type: "text", text: value });
	};

	const flushText = (end: number) => {
		pushText(text.slice(plainStart, end));
		plainStart = end;
	};

	let index = 0;
	while (index < text.length) {
		const urlMatch = text.slice(index).match(URL_PATTERN);
		if (urlMatch?.[0]) {
			const { url, trailing } = trimUrl(urlMatch[0]);
			flushText(index);
			parts.push({ type: "link", url });
			if (trailing) pushText(trailing);
			index += urlMatch[0].length;
			plainStart = index;
			continue;
		}

		let marker: (typeof INLINE_MARKERS)[number] | undefined;
		for (const candidate of INLINE_MARKERS) {
			if (text.startsWith(candidate, index) && canOpenMarker(text, index, candidate)) {
				marker = candidate;
				break;
			}
		}

		if (!marker) {
			index += 1;
			continue;
		}

		const closingIndex = findClosingMarker(text, index + marker.length, marker);
		if (closingIndex === -1) {
			index += marker.length;
			continue;
		}

		const innerText = text.slice(index + marker.length, closingIndex);
		if (isWhitespaceOnly(innerText)) {
			index = closingIndex + marker.length;
			continue;
		}

		flushText(index);
		if (marker === "```") {
			parts.push({ type: "monospace", children: [{ type: "text", text: innerText }] });
		} else {
			const type = marker === "*" ? "bold" : marker === "_" ? "italic" : marker === "~" ? "strikethrough" : "monospace";
			parts.push({ type, children: parseInlineText(innerText) });
		}
		index = closingIndex + marker.length;
		plainStart = index;
	}

	flushText(text.length);
	return parts;
}

function parseLine(line: string): WhatsAppTextBlock {
	const bulletMatch = line.match(/^\s*[*-]\s+(.+)$/);
	if (bulletMatch) return { type: "bullet", children: parseInlineText(bulletMatch[1] ?? "") };

	const numberedMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
	if (numberedMatch) {
		return {
			type: "numbered",
			number: numberedMatch[1] ?? "1",
			children: parseInlineText(numberedMatch[2] ?? ""),
		};
	}

	const quoteMatch = line.match(/^\s*>\s?(.*)$/);
	if (quoteMatch) return { type: "quote", children: parseInlineText(quoteMatch[1] ?? "") };

	return { type: "text", children: parseInlineText(line) };
}

/** Parse WhatsApp-style formatting while preserving line breaks and plain text. */
export function parseWhatsAppText(content: string): WhatsAppTextBlock[] {
	const lines = content.replace(/\r\n?/g, "\n").split("\n");
	const blocks: WhatsAppTextBlock[] = [];
	let inCodeBlock = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("```") && trimmed.length === 3) {
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			blocks.push({ type: "code", text: line });
			continue;
		}

		blocks.push(parseLine(line));
	}

	return blocks;
}

function inlinePartsToPlainText(parts: WhatsAppInlinePart[]): string {
	return parts
		.map((part) => {
			if (part.type === "text" || part.type === "link") return part.type === "text" ? part.text : part.url;
			return inlinePartsToPlainText(part.children);
		})
		.join("");
}

/** Convert WhatsApp markup into readable plain text for native notifications. */
export function whatsappTextToPlainText(content: string): string {
	return parseWhatsAppText(content)
		.map((block) => {
			if (block.type === "code") return block.text;
			const text = inlinePartsToPlainText(block.children);
			if (block.type === "bullet") return `• ${text}`;
			if (block.type === "numbered") return `${block.number}. ${text}`;
			if (block.type === "quote") return `│ ${text}`;
			return text;
		})
		.join("\n")
		.trim();
}

/** Keep notification previews useful without exposing raw formatting markers. */
export function whatsappNotificationPreview(content: string, maxLength = 240): string {
	const plainText = whatsappTextToPlainText(content).replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
	if (plainText.length <= maxLength) return plainText;
	return `${plainText.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

/** Return unique HTTP(S) links in a message, in the order they appear. */
export function extractWhatsAppLinks(content: string): string[] {
	const links: string[] = [];
	const seen = new Set<string>();
	const visit = (parts: WhatsAppInlinePart[]) => {
		for (const part of parts) {
			if (part.type === "link") {
				if (!seen.has(part.url)) {
					seen.add(part.url);
					links.push(part.url);
				}
			} else if (part.type !== "text") {
				visit(part.children);
			}
		}
	};

	for (const block of parseWhatsAppText(content)) {
		if (block.type !== "code") visit(block.children);
	}
	return links;
}
