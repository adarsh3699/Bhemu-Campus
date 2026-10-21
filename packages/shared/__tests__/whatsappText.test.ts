import { describe, expect, it } from "vitest";
import { parseWhatsAppText, whatsappNotificationPreview, whatsappTextToPlainText } from "../src";

describe("WhatsApp text formatting", () => {
	it("parses inline styles and links without changing the source text", () => {
		expect(parseWhatsAppText("*bold* _italic_ ~deleted~ `code` https://example.com.")).toEqual([
			{
				type: "text",
				children: [
					{ type: "bold", children: [{ type: "text", text: "bold" }] },
					{ type: "text", text: " " },
					{ type: "italic", children: [{ type: "text", text: "italic" }] },
					{ type: "text", text: " " },
					{ type: "strikethrough", children: [{ type: "text", text: "deleted" }] },
					{ type: "text", text: " " },
					{ type: "monospace", children: [{ type: "text", text: "code" }] },
					{ type: "text", text: " " },
					{ type: "link", url: "https://example.com" },
					{ type: "text", text: "." },
				],
			},
		]);
	});

	it("parses WhatsApp lists, quotes, blank lines, and code blocks", () => {
		expect(parseWhatsAppText("- one\n* two\n1. first\n2. second\n> quoted\n\n```\nconst answer = 42;\n```")).toEqual([
			{ type: "bullet", children: [{ type: "text", text: "one" }] },
			{ type: "bullet", children: [{ type: "text", text: "two" }] },
			{ type: "numbered", number: "1", children: [{ type: "text", text: "first" }] },
			{ type: "numbered", number: "2", children: [{ type: "text", text: "second" }] },
			{ type: "quote", children: [{ type: "text", text: "quoted" }] },
			{ type: "text", children: [] },
			{ type: "code", text: "const answer = 42;" },
		]);
	});

	it("keeps unmatched markers and underscores inside words as plain text", () => {
		expect(parseWhatsAppText("snake_case and *unfinished formatting")).toEqual([
			{
				type: "text",
				children: [{ type: "text", text: "snake_case and *unfinished formatting" }],
			},
		]);
	});

	it("supports nested inline formatting", () => {
		expect(parseWhatsAppText("*_bold italic_*")).toEqual([
			{
				type: "text",
				children: [
					{
						type: "bold",
						children: [{ type: "italic", children: [{ type: "text", text: "bold italic" }] }],
					},
				],
			},
		]);
	});

	it("creates clean notification text and truncates long previews", () => {
		const content = "*Heading*\n\n- *First item*\n> Read `CSE329`";
		expect(whatsappTextToPlainText(content)).toBe("Heading\n\n• First item\n│ Read CSE329");
		expect(whatsappNotificationPreview(content, 16)).toBe("Heading\n\n• Firs…");
	});
});
