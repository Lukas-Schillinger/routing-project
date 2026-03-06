<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DepotsCard from '../../routes/(app)/maps/DepotsCard.svelte';
	import {
		createMockDepotRow,
		createMockLocationRow
	} from '$lib/testing/factories/mocks';

	const orgId = crypto.randomUUID();

	const depot1 = createMockDepotRow({
		organization_id: orgId,
		name: 'Main Warehouse',
		default_depot: true
	});
	const location1 = createMockLocationRow({
		organization_id: orgId,
		address_line_1: '123 Main St',
		city: 'New York',
		region: 'NY'
	});

	const depot2 = createMockDepotRow({
		organization_id: orgId,
		name: 'East Side Hub',
		default_depot: false
	});
	const location2 = createMockLocationRow({
		organization_id: orgId,
		address_line_1: '456 East Ave',
		city: 'Brooklyn',
		region: 'NY'
	});

	const { Story } = defineMeta({
		title: 'Maps/DepotsCard',
		component: DepotsCard,
		args: {
			depots: [
				{ depot: depot1, location: location1 },
				{ depot: depot2, location: location2 }
			]
		}
	});
</script>

<Story name="Default" />

<Story name="Empty" args={{ depots: [] }} />
