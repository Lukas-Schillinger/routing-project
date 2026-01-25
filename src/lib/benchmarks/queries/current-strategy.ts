/**
 * Current query strategy - replicates the map detail page load
 *
 * 9 parallel queries via Promise.all:
 * 1. getMapById
 * 2. getStopsByMap (with location JOIN)
 * 3. getDrivers (org-wide)
 * 4. getDriversForMap (with driver JOIN)
 * 5. getDepots (with location JOIN)
 * 6. getRoutesByMap
 * 7. getActiveJobForMap
 * 8. getSubscription (with plan JOIN)
 * 9. getCreditBalance (2 parallel aggregations)
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

export async function loadMapDetailCurrent(
	db: BenchDb,
	mapId: string,
	organizationId: string
) {
	const [
		map,
		mapStops,
		orgDrivers,
		assignedDriversData,
		orgDepots,
		mapRoutes,
		activeJob,
		subscriptionData,
		credits
	] = await Promise.all([
		// 1. getMapById
		db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.limit(1)
			.then((r) => r[0]),

		// 2. getStopsByMap (with location JOIN)
		db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(
				and(eq(stops.map_id, mapId), eq(stops.organization_id, organizationId))
			),

		// 3. getDrivers (org-wide)
		db
			.select()
			.from(drivers)
			.where(eq(drivers.organization_id, organizationId)),

		// 4. getDriversForMap (with driver JOIN)
		db
			.select({
				membership: driverMapMemberships,
				driver: drivers
			})
			.from(driverMapMemberships)
			.innerJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.where(
				and(
					eq(driverMapMemberships.map_id, mapId),
					eq(drivers.organization_id, organizationId)
				)
			),

		// 5. getDepots (with location JOIN)
		db
			.select({
				depot: depots,
				location: locations
			})
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.organization_id, organizationId)),

		// 6. getRoutesByMap
		db
			.select()
			.from(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.organization_id, organizationId)
				)
			),

		// 7. getActiveJobForMap
		db
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
			.then((r) => r[0] ?? null),

		// 8. getSubscription (with plan JOIN)
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

		// 9. getCreditBalance (2 parallel aggregations internally, but we simplify here)
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

	return {
		map,
		stops: mapStops,
		allDrivers: orgDrivers,
		assignedDrivers: assignedDriversData.map((d) => d.driver),
		depots: orgDepots,
		routes: mapRoutes,
		activeJob,
		subscription: subscriptionData,
		credits
	};
}
