<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OptimizationFooter from '../../routes/(app)/maps/[mapId]/components/OptimizationFooter.svelte';
	import {
		createMockMapRow,
		createMockDriverRow,
		createMockStopRow,
		createMockLocationRow,
		createMockRouteRow,
		createMockDepotRow
	} from '$lib/testing/factories/mocks';

	const orgId = crypto.randomUUID();

	const depot = createMockDepotRow({
		organization_id: orgId,
		name: 'Main Warehouse',
		default_depot: true
	});
	const depotLocation = createMockLocationRow({ organization_id: orgId });

	const map = createMockMapRow({
		organization_id: orgId,
		title: 'Morning Routes',
		depot_id: depot.id
	});

	const driver1 = createMockDriverRow({
		organization_id: orgId,
		name: 'Alice'
	});
	const driver2 = createMockDriverRow({ organization_id: orgId, name: 'Bob' });

	const location1 = createMockLocationRow({ organization_id: orgId });
	const location2 = createMockLocationRow({ organization_id: orgId });

	const stop1 = createMockStopRow({
		organization_id: orgId,
		map_id: map.id,
		location_id: location1.id,
		driver_id: null
	});
	const stop2 = createMockStopRow({
		organization_id: orgId,
		map_id: map.id,
		location_id: location2.id,
		driver_id: null
	});

	const route1 = createMockRouteRow({
		organization_id: orgId,
		map_id: map.id,
		driver_id: driver1.id,
		depot_id: depot.id,
		duration: '1800'
	});

	const { Story } = defineMeta({
		title: 'Maps/OptimizationFooter',
		component: OptimizationFooter,
		args: {
			map,
			stops: [
				{ stop: stop1, location: location1 },
				{ stop: stop2, location: location2 }
			],
			depots: [{ depot, location: depotLocation }],
			assignedDrivers: [driver1, driver2],
			routes: [route1],
			pageState: 'normal',
			onDepotChange: () => Promise.resolve(),
			onOptimize: () => {},
			onCancel: () => {}
		}
	});
</script>

<Story name="Default" />

<Story name="Optimizing" args={{ pageState: 'optimizing' }} />

<Story name="Cancel Error" args={{ error: 'Failed to cancel optimization' }} />

<Story name="Reset Error" args={{ error: 'Failed to reset routes' }} />
