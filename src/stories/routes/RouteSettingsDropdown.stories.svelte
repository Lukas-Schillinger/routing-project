<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RouteSettingsDropdown from '../../routes/(app)/routes/[routeId]/RouteSettingsDropdown.svelte';
	import { createMockRouteRow } from '$lib/testing/factories/mocks';

	const route = createMockRouteRow();

	const { Story } = defineMeta({
		title: 'Routes/RouteSettingsDropdown',
		component: RouteSettingsDropdown,
		args: {
			route,
			directionsProvider: 'google',
			onDirectionsProviderChange: () => {}
		}
	});
</script>

<Story name="Default" />

<Story name="Reset Error" args={{ error: 'Failed to reset completed stops' }} />
