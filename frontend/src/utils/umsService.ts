/**
 * UMS Service - Handles communication with the UMS Scraper backend
 */

import type { UMSValidationResult } from "@/types";

// Re-export for backward compatibility
export type { UMSValidationResult };

const UMS_BASE_URL = process.env.NEXT_PUBLIC_UMS_BASE_URL || "https://ums.bhemu.in";

export class UMSService {
	private baseUrl: string;

	constructor() {
		this.baseUrl = UMS_BASE_URL;
	}

	/**
	 * Test connection to UMS Scraper backend
	 */
	async testConnection() {
		try {
			const response = await fetch(`${this.baseUrl}/ums/test`);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("UMS connection test failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: "Failed to connect to UMS service",
			};
		}
	}

	/**
	 * Fetch student basic information from UMS
	 * @param gaValue - The _ga_B0Z6G6GCD8 cookie value
	 */
	async getStudentBasicInfo(gaValue: string) {
		try {
			const response = await fetch(
				`${this.baseUrl}/ums/student/basic-info?_ga_B0Z6G6GCD8=${encodeURIComponent(gaValue)}`
			);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Failed to fetch student basic info:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: "Failed to fetch student information",
			};
		}
	}

	/**
	 * Fetch student grades and academic data from UMS
	 * @param gaValue - The _ga_B0Z6G6GCD8 cookie value
	 * @param termId - Optional term ID to fetch specific term data
	 */
	async getStudentGrades(gaValue: string, termId: string | null = null) {
		try {
			let url = `${this.baseUrl}/ums/student/grades?_ga_B0Z6G6GCD8=${encodeURIComponent(gaValue)}`;
			if (termId) {
				url += `&term=${encodeURIComponent(termId)}`;
			}

			const response = await fetch(url);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Failed to fetch student grades:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: "Failed to fetch academic data",
			};
		}
	}

	/**
	 * Get all available terms from UMS
	 * @param gaValue - The _ga_B0Z6G6GCD8 cookie value
	 */
	async getAvailableTerms(gaValue: string) {
		try {
			const response = await fetch(
				`${this.baseUrl}/ums/student/terms?_ga_B0Z6G6GCD8=${encodeURIComponent(gaValue)}`
			);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Failed to fetch available terms:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: "Failed to fetch available terms",
			};
		}
	}

	/**
	 * Validate UMS session cookie format
	 * @param gaValue - The cookie value to validate
	 */
	validateCookie(gaValue: string): UMSValidationResult {
		if (!gaValue || typeof gaValue !== "string") {
			return {
				valid: false,
				message: "Cookie value is required",
			};
		}

		const trimmedValue = gaValue.trim();

		if (trimmedValue.length < 10) {
			return {
				valid: false,
				message: "Cookie value appears too short. Please check if you copied the complete value.",
			};
		}

		if (trimmedValue.includes(" ") || trimmedValue.includes("\n") || trimmedValue.includes("\t")) {
			return {
				valid: false,
				message: "Cookie value contains invalid whitespace characters. Please copy only the cookie value.",
			};
		}

		const validPattern = /^[a-zA-Z0-9._-]+$/;
		if (!validPattern.test(trimmedValue)) {
			return {
				valid: false,
				message:
					"Cookie value contains invalid characters. Only letters, numbers, dots, hyphens and underscores are allowed.",
			};
		}

		return {
			valid: true,
			message: "Cookie format is valid",
		};
	}

	/**
	 * UMS term IDs are now stored as part of the GPA profile (allTermIds field) in Firebase.
	 * Read them from the profile data instead of localStorage for cross-device consistency.
	 */
}

export const umsService = new UMSService();
export default umsService;

