import type { Driver, StopWithLocation } from '$lib/schemas';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Mock data for demo purposes
	const drivers: Driver[] = [
		{
			id: '550e8400-e29b-41d4-a716-446655440001',
			organization_id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Ava Rodriguez',
			phone: '+1 (555) 123-4567',
			notes: null,
			active: true,
			temporary: false,
			created_at: new Date(),
			updated_at: new Date()
		},
		{
			id: '550e8400-e29b-41d4-a716-446655440002',
			organization_id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Marco Chen',
			phone: '+1 (555) 234-5678',
			notes: null,
			active: true,
			temporary: false,
			created_at: new Date(),
			updated_at: new Date()
		},
		{
			id: '550e8400-e29b-41d4-a716-446655440003',
			organization_id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Lena Foster',
			phone: '+1 (555) 345-6789',
			notes: null,
			active: true,
			temporary: false,
			created_at: new Date(),
			updated_at: new Date()
		}
	];

	const stops: StopWithLocation[] = [
		{
			stop: {
				id: '650e8400-e29b-41d4-a716-446655440001',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				map_id: '750e8400-e29b-41d4-a716-446655440000',
				location_id: '850e8400-e29b-41d4-a716-446655440001',
				driver_id: '550e8400-e29b-41d4-a716-446655440001',
				delivery_index: 1,
				contact_name: 'John Smith',
				contact_phone: '+1 (555) 111-2222',
				notes: '4 packages',
				created_at: new Date(),
				updated_at: new Date()
			},
			location: {
				id: '850e8400-e29b-41d4-a716-446655440001',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Downtown Office',
				address_line1: '123 Main St',
				address_line2: null,
				city: 'Orlando',
				region: 'FL',
				postal_code: '32801',
				country: 'US',
				lat: '28.0400',
				lon: '-81.9500',
				geocode_provider: null,
				geocode_confidence: null,
				geocode_place_id: null,
				geocode_raw: null,
				address_hash: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		},
		{
			stop: {
				id: '650e8400-e29b-41d4-a716-446655440002',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				map_id: '750e8400-e29b-41d4-a716-446655440000',
				location_id: '850e8400-e29b-41d4-a716-446655440002',
				driver_id: '550e8400-e29b-41d4-a716-446655440001',
				delivery_index: 2,
				contact_name: 'Jane Doe',
				contact_phone: '+1 (555) 222-3333',
				notes: '2 packages',
				created_at: new Date(),
				updated_at: new Date()
			},
			location: {
				id: '850e8400-e29b-41d4-a716-446655440002',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Warehouse District',
				address_line1: '456 Industrial Blvd',
				address_line2: null,
				city: 'Orlando',
				region: 'FL',
				postal_code: '32802',
				country: 'US',
				lat: '28.0450',
				lon: '-81.9550',
				geocode_provider: null,
				geocode_confidence: null,
				geocode_place_id: null,
				geocode_raw: null,
				address_hash: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		},
		{
			stop: {
				id: '650e8400-e29b-41d4-a716-446655440003',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				map_id: '750e8400-e29b-41d4-a716-446655440000',
				location_id: '850e8400-e29b-41d4-a716-446655440003',
				driver_id: '550e8400-e29b-41d4-a716-446655440002',
				delivery_index: 1,
				contact_name: 'Bob Wilson',
				contact_phone: '+1 (555) 333-4444',
				notes: '1 package',
				created_at: new Date(),
				updated_at: new Date()
			},
			location: {
				id: '850e8400-e29b-41d4-a716-446655440003',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Residential Area',
				address_line1: '789 Oak Avenue',
				address_line2: null,
				city: 'Orlando',
				region: 'FL',
				postal_code: '32803',
				country: 'US',
				lat: '28.0350',
				lon: '-81.9450',
				geocode_provider: null,
				geocode_confidence: null,
				geocode_place_id: null,
				geocode_raw: null,
				address_hash: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		},
		{
			stop: {
				id: '650e8400-e29b-41d4-a716-446655440004',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				map_id: '750e8400-e29b-41d4-a716-446655440000',
				location_id: '850e8400-e29b-41d4-a716-446655440004',
				driver_id: '550e8400-e29b-41d4-a716-446655440002',
				delivery_index: 2,
				contact_name: 'Alice Johnson',
				contact_phone: '+1 (555) 444-5555',
				notes: '3 packages',
				created_at: new Date(),
				updated_at: new Date()
			},
			location: {
				id: '850e8400-e29b-41d4-a716-446655440004',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Shopping Center',
				address_line1: '321 Commerce Way',
				address_line2: null,
				city: 'Orlando',
				region: 'FL',
				postal_code: '32804',
				country: 'US',
				lat: '28.0500',
				lon: '-81.9600',
				geocode_provider: null,
				geocode_confidence: null,
				geocode_place_id: null,
				geocode_raw: null,
				address_hash: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		},
		{
			stop: {
				id: '650e8400-e29b-41d4-a716-446655440005',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				map_id: '750e8400-e29b-41d4-a716-446655440000',
				location_id: '850e8400-e29b-41d4-a716-446655440005',
				driver_id: '550e8400-e29b-41d4-a716-446655440003',
				delivery_index: 1,
				contact_name: 'Tom Brown',
				contact_phone: '+1 (555) 555-6666',
				notes: '5 packages',
				created_at: new Date(),
				updated_at: new Date()
			},
			location: {
				id: '850e8400-e29b-41d4-a716-446655440005',
				organization_id: '550e8400-e29b-41d4-a716-446655440000',
				name: 'Business Park',
				address_line1: '654 Enterprise Dr',
				address_line2: null,
				city: 'Orlando',
				region: 'FL',
				postal_code: '32805',
				country: 'US',
				lat: '28.0300',
				lon: '-81.9400',
				geocode_provider: null,
				geocode_confidence: null,
				geocode_place_id: null,
				geocode_raw: null,
				address_hash: null,
				created_at: new Date(),
				updated_at: new Date()
			}
		}
	];

	// Calculate stop counts per driver
	const driverStopCounts = stops.reduce(
		(acc, stop) => {
			const driverId = stop.stop.driver_id;
			if (driverId) {
				acc[driverId] = (acc[driverId] || 0) + 1;
			}
			return acc;
		},
		{} as Record<string, number>
	);

	return {
		drivers,
		stops,
		driverStopCounts
	};
};
