<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import DriversCard from '../../routes/(app)/maps/DriversCard.svelte';
	import { createMockDriverRow } from '$lib/testing/factories/mocks';

	const orgId = crypto.randomUUID();

	const driver1 = createMockDriverRow({
		organization_id: orgId,
		name: 'Alice Johnson',
		phone: '+15551234567'
	});
	const driver2 = createMockDriverRow({
		organization_id: orgId,
		name: 'Bob Smith',
		phone: '+15559876543'
	});
	const driver3 = createMockDriverRow({
		organization_id: orgId,
		name: 'Carol Davis',
		phone: null
	});

	const { Story } = defineMeta({
		title: 'Maps/DriversCard',
		component: DriversCard,
		args: {
			drivers: [driver1, driver2, driver3]
		}
	});
</script>

<Story name="Default" />

<Story name="Empty" args={{ drivers: [] }} />
