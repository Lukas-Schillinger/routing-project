/**
 * Joined query strategy - single query for core map data
 *
 * Fetches map + stops + locations + assigned drivers + depots + routes in one query.
 * Billing queries (subscription, credits) remain separate as they're a different domain.
 */
import type { BenchDb } from '../connections';
import {
	maps,
	stops,
	locations,
	drivers,
	driverMapMemberships,
	depots,
	routes,
	optimizationJobs,
	subscriptions,
	plans,
	creditTransactions
} from '$lib/server/db/schema';
import { and, eq, gt, inArray, isNull, or, sql, sum } from 'drizzle-orm';

export async function loadMapDetailJoined(
	db: BenchDb,
	mapId: string,
	organizationId: string
) {
	// Single big query for core map data
	// Note: This returns denormalized rows that need to be reduced
	const [coreDataResult, allDriversResult, subscriptionData, credits] =
		await Promise.all([
			// Big joined query for map + stops + drivers + depots + routes
			db
				.select({
					// Map
					map: maps,
					// Stop with location
					stop: stops,
					stopLocation: locations,
					// Assigned driver via membership
					assignedDriver: drivers,
					// Depot with location (using alias for location)
					depot: depots,
					// Route
					route: routes
				})
				.from(maps)
				.leftJoin(stops, eq(stops.map_id, maps.id))
				.leftJoin(locations, eq(stops.location_id, locations.id))
				.leftJoin(
					driverMapMemberships,
					eq(driverMapMemberships.map_id, maps.id)
				)
				.leftJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
				.leftJoin(depots, eq(depots.organization_id, maps.organization_id))
				.leftJoin(routes, eq(routes.map_id, maps.id))
				.where(
					and(eq(maps.id, mapId), eq(maps.organization_id, organizationId))
				),

			// Still need org-wide drivers separately (not just assigned to map)
			db
				.select()
				.from(drivers)
				.where(eq(drivers.organization_id, organizationId)),

			// Subscription with plan
			db
				.select({
					subscription: subscriptions,
					plan: plans
				})
				.from(subscriptions)
				.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
				.where(eq(subscriptions.organization_id, organizationId))
				.limit(1)
				.then((r) => r[0]),

			// Credit balance
			(async () => {
				const now = new Date();
				const [availableResult, expiringResult] = await Promise.all([
					db
						.select({ total: sum(creditTransactions.amount) })
						.from(creditTransactions)
						.where(
							and(
								eq(creditTransactions.organization_id, organizationId),
								or(
									isNull(creditTransactions.expires_at),
									gt(creditTransactions.expires_at, now)
								)
							)
						),
					db
						.select({
							amount: sum(creditTransactions.amount),
							expiresAt: sql<Date>`MIN(${creditTransactions.expires_at})`
						})
						.from(creditTransactions)
						.where(
							and(
								eq(creditTransactions.organization_id, organizationId),
								gt(creditTransactions.expires_at, now)
							)
						)
				]);

				return {
					available: Number(availableResult[0]?.total ?? 0),
					expiring: Number(expiringResult[0]?.amount ?? 0),
					expiresAt: expiringResult[0]?.expiresAt ?? null
				};
			})()
		]);

	// Reduce the denormalized rows into structured data
	const map = coreDataResult[0]?.map ?? null;

	// Dedupe stops (same stop appears multiple times due to driver/depot joins)
	const stopsMap = new Map<
		string,
		{
			stop: (typeof stops)['$inferSelect'];
			location: (typeof locations)['$inferSelect'];
		}
	>();
	for (const row of coreDataResult) {
		if (row.stop && row.stopLocation && !stopsMap.has(row.stop.id)) {
			stopsMap.set(row.stop.id, { stop: row.stop, location: row.stopLocation });
		}
	}

	// Dedupe assigned drivers
	const assignedDriversMap = new Map<
		string,
		(typeof drivers)['$inferSelect']
	>();
	for (const row of coreDataResult) {
		if (row.assignedDriver && !assignedDriversMap.has(row.assignedDriver.id)) {
			assignedDriversMap.set(row.assignedDriver.id, row.assignedDriver);
		}
	}

	// Dedupe depots - need to fetch depot locations separately since we can't alias in Drizzle easily
	const depotsMap = new Map<string, (typeof depots)['$inferSelect']>();
	for (const row of coreDataResult) {
		if (row.depot && !depotsMap.has(row.depot.id)) {
			depotsMap.set(row.depot.id, row.depot);
		}
	}

	// Dedupe routes
	const routesMap = new Map<string, (typeof routes)['$inferSelect']>();
	for (const row of coreDataResult) {
		if (row.route && !routesMap.has(row.route.id)) {
			routesMap.set(row.route.id, row.route);
		}
	}

	// We still need depot locations - fetch them
	const depotIds = Array.from(depotsMap.keys());
	const depotLocations =
		depotIds.length > 0
			? await db
					.select({
						depot: depots,
						location: locations
					})
					.from(depots)
					.innerJoin(locations, eq(depots.location_id, locations.id))
					.where(inArray(depots.id, depotIds))
			: [];

	// Get active job separately (simple query, not worth the complexity of joining)
	const activeJob = await db
		.select()
		.from(optimizationJobs)
		.where(
			and(
				eq(optimizationJobs.map_id, mapId),
				eq(optimizationJobs.organization_id, organizationId),
				inArray(optimizationJobs.status, ['pending', 'running', 'completing'])
			)
		)
		.limit(1)
		.then((r) => r[0] ?? null);

	return {
		map,
		stops: Array.from(stopsMap.values()),
		allDrivers: allDriversResult,
		assignedDrivers: Array.from(assignedDriversMap.values()),
		depots: depotLocations,
		routes: Array.from(routesMap.values()),
		activeJob,
		subscription: subscriptionData,
		credits
	};
}
