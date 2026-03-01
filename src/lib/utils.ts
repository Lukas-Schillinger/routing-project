import { createAvatar } from '@dicebear/core';
import * as style from '@dicebear/identicon';
import { clsx, type ClassValue } from 'clsx';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { parsePhoneNumber } from 'libphonenumber-js';
import Papa from 'papaparse';
import { twMerge } from 'tailwind-merge';
import type { Driver } from './schemas';
import {
	locationCreateSchema,
	type Location,
	type LocationCreate
} from './schemas/location';
import type { GeocodingFeature } from './services/external/mapbox/types';
import type { PlanFeatures } from './config/billing';
import type { Permission } from './schemas/permissions';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

export function formatDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return timeAgo.format(dateObj, 'twitter');
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function getIdenticon(driver: Driver) {
	return createAvatar(style, {
		seed: driver.id,
		rowColor: [driver.color.slice(1)] // remove #
	}).toDataUri();
}

/* Returns the appropriate text color, black or white, depending on the given background color hex */
export function getTextColor(hex: string) {
	hex = hex.replace('#', '');
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((x) => x + x)
			.join('');
	}

	const r = parseInt(hex.slice(0, 2), 16) / 255;
	const g = parseInt(hex.slice(2, 4), 16) / 255;
	const b = parseInt(hex.slice(4, 6), 16) / 255;

	// sRGB gamma correction
	const srgb = [r, g, b].map((v) =>
		v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
	);

	const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];

	return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Convert a Mapbox Geocoding v6 Feature to Location data suitable for database insertion
 * Based on Mapbox Geocoding v6 API response structure
 * @see https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
 */
export function geocodingFeatureToLocation(
	feature: GeocodingFeature
): LocationCreate {
	const context = feature.properties.context || {};

	// Extract confidence level and validate it's one of the expected values
	const confidence = feature.properties.match_code?.confidence;
	const geocodeConfidence =
		confidence === 'exact' ||
		confidence === 'high' ||
		confidence === 'medium' ||
		confidence === 'low'
			? confidence
			: null;

	const draft = {
		address_line_1: context.address?.name,
		address_line_2: context.secondary_address?.name || null,

		address_number: context.address?.address_number,
		street_name: context.address?.street_name,
		city: context.place?.name || null,
		region: context.region?.name || null,
		postal_code: context.postcode?.name || null,
		country: context.country?.country_code || null, // ISO 2-letter code

		lat: feature.geometry.coordinates[1],
		lon: feature.geometry.coordinates[0],

		geocode_provider: 'mapbox',
		geocode_confidence: geocodeConfidence, // 'exact', 'high', 'medium', or 'low'
		geocode_place_id: feature.properties.mapbox_id,
		geocode_raw: feature,

		address_hash: null
	};

	const validated = locationCreateSchema.parse(draft);
	return validated;
}

export function generateRandomColor(): string {
	const colors = [
		// red
		'#f87171',
		'#dc2626',
		'#991b1b',
		// orange
		'#fb923c',
		'#ea580c',
		'#9a3412',
		// amber
		'#fbbf24',
		'#d97706',
		'#92400e',
		// yellow
		'#facc15',
		'#ca8a04',
		'#854d0e',
		// lime
		'#a3e635',
		'#65a30d',
		'#3f6212',
		// green
		'#4ade80',
		'#16a34a',
		'#166534',
		// emerald
		'#34d399',
		'#059669',
		'#065f46',
		// teal
		'#2dd4bf',
		'#0d9488',
		'#115e59',
		// cyan
		'#22d3ee',
		'#0891b2',
		'#155e75',
		// sky
		'#38bdf8',
		'#0284c7',
		'#075985',
		// blue
		'#60a5fa',
		'#2563eb',
		'#1e40af',
		// indigo
		'#818cf8',
		'#4f46e5',
		'#3730a3',
		// violet
		'#a78bfa',
		'#7c3aed',
		'#5b21b6',
		// purple
		'#c084fc',
		'#9333ea',
		'#6b21a8',
		// fuchsia
		'#e879f9',
		'#c026d3',
		'#86198f',
		// pink
		'#f472b6',
		'#db2777',
		'#9d174d',
		// rose
		'#fb7185',
		'#e11d48',
		'#9f1239'
	];

	return colors[Math.floor(Math.random() * colors.length)];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
	? Omit<T, 'children'>
	: T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

/**
 * Client side permission checking utility. Used **only** for selectively displaying UI elements
 * according to user permissions. We can't rely on this for auth because it can be modified
 * client side.
 *
 * Unfortunately the Permission type is imported from `/src/services/server`
 */
export function checkPermission(
	permissions: Permission[],
	permission: Permission
): boolean {
	return permissions.includes(permission);
}

/**
 * Client-side feature checking utility. Used **only** for selectively displaying
 * UI elements based on plan features. Cannot be relied on for authorization since
 * it can be modified client-side.
 */
export function hasFeature(
	features: PlanFeatures | null | undefined,
	feature: keyof PlanFeatures
): boolean {
	if (!features) return false;
	return features[feature] === true;
}

type AddressDisplayInput = Pick<
	Location,
	'address_line_1' | 'address_line_2' | 'city' | 'region' | 'postal_code'
>;

/**
 * Utility for displaying formatted address information.
 * Returns top line (street address), bottom line (city, state, zip), and full address.
 */
export function addressDisplay(location: AddressDisplayInput) {
	const topLine = [location.address_line_1, location.address_line_2]
		.filter(Boolean)
		.join(', ');

	const bottomLine = [
		location.city,
		[location.region, location.postal_code].filter(Boolean).join(' ')
	]
		.filter(Boolean)
		.join(', ');

	const full = [topLine, bottomLine].filter(Boolean).join(', ');

	return { topLine, bottomLine, full };
}

/**
 * Format an E.164 phone number for display.
 * Converts "+15551234567" to "(555) 123-4567".
 */
export function formatPhoneNumber(
	phone: string | null | undefined
): string | null {
	if (!phone) return null;
	try {
		const parsed = parsePhoneNumber(phone);
		return parsed.formatNational();
	} catch {
		return phone;
	}
}

// CSV Parsing utilities

export type ParsedCsv = {
	fileName: string;
	headers: string[];
	rows: Record<string, string>[];
};

export type CsvParseError = {
	type: 'invalid_extension' | 'parse_error' | 'no_columns' | 'no_data';
	message: string;
};

export type CsvParseResult =
	| { success: true; data: ParsedCsv }
	| { success: false; error: CsvParseError };

/**
 * Parse a CSV file and return the headers and rows.
 */
export function parseCsvFile(file: File): Promise<CsvParseResult> {
	return new Promise((resolve) => {
		if (!file.name.endsWith('.csv')) {
			resolve({
				success: false,
				error: {
					type: 'invalid_extension',
					message: 'Please select a CSV file'
				}
			});
			return;
		}

		Papa.parse(file, {
			header: true,
			skipEmptyLines: true,
			complete: (results) => {
				if (results.errors.length > 0) {
					resolve({
						success: false,
						error: {
							type: 'parse_error',
							message: `CSV parsing error: ${results.errors[0].message}`
						}
					});
					return;
				}

				const headers = results.meta.fields || [];
				const rows = results.data as Record<string, string>[];

				if (headers.length === 0) {
					resolve({
						success: false,
						error: {
							type: 'no_columns',
							message: 'No columns found in CSV file'
						}
					});
					return;
				}

				if (rows.length === 0) {
					resolve({
						success: false,
						error: {
							type: 'no_data',
							message: 'No data rows found in CSV file'
						}
					});
					return;
				}

				resolve({
					success: true,
					data: { fileName: file.name, headers, rows }
				});
			},
			error: (err) => {
				resolve({
					success: false,
					error: {
						type: 'parse_error',
						message: `Failed to read file: ${err.message}`
					}
				});
			}
		});
	});
}
