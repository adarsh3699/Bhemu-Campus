// ============================================================
// bCampus Chat Worker — Zod Validation Helper
// ============================================================
// Validates request body / query and throws AppError on failure.

import type { ZodSchema } from "zod";
import { Errors } from "../../lib/errors";

export function validateBody<T>(schema: ZodSchema<T>, data: unknown): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const first = result.error.issues[0];
		throw Errors.validationError(
			first ? `${first.path.join(".")}: ${first.message}` : "Validation failed.",
		);
	}
	return result.data;
}

export function validateQuery<T>(schema: ZodSchema<T>, data: unknown): T {
	return validateBody(schema, data);
}
