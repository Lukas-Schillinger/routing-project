<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DriversTab from '../../routes/(app)/maps/[mapId]/components/tabs/DriversTab.svelte';
	import {
		createMockDriverRow,
		createMockStopRow,
		createMockLocationRow,
		createMockRouteRow
	} from '$lib/testing/factories/mocks';

	const mapId = crypto.randomUUID();
	const orgId = crypto.randomUUID();
	const depotId = crypto.randomUUID();

	const driver1 = createMockDriverRow({
		organization_id: orgId,
		name: 'Alice Johnson',
		color: '#E63946'
	});
	const driver2 = createMockDriverRow({
		organization_id: orgId,
		name: 'Bob Smith',
		color: '#457B9D'
	});

	const location1 = createMockLocationRow({ organization_id: orgId });
	const location2 = createMockLocationRow({ organization_id: orgId });
	const location3 = createMockLocationRow({ organization_id: orgId });

	const stop1 = createMockStopRow({
		organization_id: orgId,
		map_id: mapId,
		location_id: location1.id,
		driver_id: driver1.id,
		delivery_index: 0,
		contact_name: 'John Doe'
	});
	const stop2 = createMockStopRow({
		organization_id: orgId,
		map_id: mapId,
		location_id: location2.id,
		driver_id: driver1.id,
		delivery_index: 1,
		contact_name: 'Jane Roe'
	});
	const stop3 = createMockStopRow({
		organization_id: orgId,
		map_id: mapId,
		location_id: location3.id,
		driver_id: null,
		contact_name: 'Unassigned Stop'
	});

	const route1 = createMockRouteRow({
		organization_id: orgId,
		map_id: mapId,
		driver_id: driver1.id,
		depot_id: depotId,
		duration: '2400'
	});

	const { Story } = defineMeta({
		title: 'Maps/DriversTab',
		component: DriversTab,
		args: {
			stops: [
				{ stop: stop1, location: location1 },
				{ stop: stop2, location: location2 },
				{ stop: stop3, location: location3 }
			],
			assignedDrivers: [driver1, driver2],
			allDrivers: [driver1, driver2],
			routes: [route1],
			mapId,
			hiddenDrivers: [],
			expandedDrivers: [driver1.id],
			onRemoveDriver: () => Promise.resolve(),
			onZoomToStop: () => {}
		}
	});
</script>

<Story name="Default" />

<Story
	name="No Drivers"
	args={{
		assignedDrivers: [],
		allDrivers: [driver1, driver2],
		stops: [],
		routes: []
	}}
/>

<Story name="Reorder Error" args={{ error: 'Failed to reorder stops' }} />

<Story name="Assign Error" args={{ error: 'Failed to assign driver' }} />
