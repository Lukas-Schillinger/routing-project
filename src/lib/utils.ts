import { clsx, type ClassValue } from 'clsx';
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { twMerge } from 'tailwind-merge';
import type { LocationCreate } from './schemas/location';
import type { GeocodingFeature } from './services/external/mapbox/types';

TimeAgo.addLocale(en);
const timeAgo = new TimeAgo('en-US');

export function formatDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return timeAgo.format(dateObj, 'twitter');
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Convert a Mapbox Geocoding v6 Feature to Location data suitable for database insertion
 * Based on Mapbox Geocoding v6 API response structure
 * @see https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
 */
export function geocodingFeatureToLocation(feature: GeocodingFeature): LocationCreate {
	// In v6, context is a nested object inside properties, not an array
	const context = feature.properties.context || {};

	// Extract address components from the context object
	const address = context.address;
	const place = context.place;
	const region = context.region;
	const postcode = context.postcode;
	const country = context.country;

	// Build address_line1 from address context
	// In v6, address.name contains the full address like "1600 Pennsylvania Avenue Northwest"
	const addressLine1 = address?.name || feature.properties.name;

	// Extract confidence level and validate it's one of the expected values
	const confidence = feature.properties.match_code?.confidence;
	const geocodeConfidence =
		confidence === 'exact' ||
		confidence === 'high' ||
		confidence === 'medium' ||
		confidence === 'low'
			? confidence
			: null;

	return {
		name: feature.properties.name,
		address_line1: addressLine1,
		address_line2: null,
		city: place?.name || null,
		region: region?.name || null,
		postal_code: postcode?.name || null,
		country: country?.country_code || 'US', // ISO 2-letter code
		lat: feature.geometry.coordinates[1].toString(),
		lon: feature.geometry.coordinates[0].toString(),
		geocode_provider: 'mapbox',
		geocode_confidence: geocodeConfidence, // 'exact', 'high', 'medium', or 'low'
		geocode_place_id: feature.properties.mapbox_id,
		geocode_raw: feature
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
