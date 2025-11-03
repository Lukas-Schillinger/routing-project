<!-- @component RouteSettingsDropdown - Settings dropdown for route detail view -->
<script lang="ts">
	import { browser } from '$app/environment';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import type { Route as RouteType } from '$lib/schemas';
	import { RotateCcw, Settings } from 'lucide-svelte';

	type DirectionsProvider = 'google' | 'apple';

	interface Props {
		route: RouteType;
		directionsProvider: DirectionsProvider;
		onDirectionsProviderChange: (provider: DirectionsProvider) => void;
	}

	let { route, directionsProvider, onDirectionsProviderChange }: Props = $props();

	// Local state for radio group value
	let radioGroupValue = $state<string>(directionsProvider);

	// Watch for external provider changes
	$effect(() => {
		radioGroupValue = directionsProvider;
	});

	// Watch for radio group changes and update parent
	$effect(() => {
		if (radioGroupValue && radioGroupValue !== directionsProvider) {
			onDirectionsProviderChange(radioGroupValue as DirectionsProvider);
		}
	});

	// Reset completed stops function
	function handleResetCompletedStops() {
		if (!browser) return;

		const confirmed = confirm(
			'Are you sure you want to reset all completed stops? This will mark all stops in this route as not delivered. This action cannot be undone.'
		);

		if (confirmed) {
			try {
				const storageKey = `route-${route.id}-completed-stops`;
				localStorage.removeItem(storageKey);

				// Dispatch a storage event to notify other components
				window.dispatchEvent(
					new StorageEvent('storage', {
						key: storageKey,
						oldValue: null,
						newValue: null,
						storageArea: localStorage
					})
				);
			} catch (error) {
				console.error('Failed to reset completed stops:', error);
				alert('Failed to reset completed stops. Please try again.');
			}
		}
	}
</script>

<TableActionsDropdown>
	{#snippet trigger()}
		<span class="sr-only">Open settings</span>
		<Settings class="h-4 w-4" />
	{/snippet}

	<Actions.DropdownMenu.Label class="flex">Navigation Provider</Actions.DropdownMenu.Label>
	<Actions.DropdownMenu.RadioGroup bind:value={radioGroupValue}>
		<Actions.DropdownMenu.RadioItem value="google">Google Maps</Actions.DropdownMenu.RadioItem>
		<Actions.DropdownMenu.RadioItem value="apple">Apple Maps</Actions.DropdownMenu.RadioItem>
	</Actions.DropdownMenu.RadioGroup>

	<Actions.DropdownMenu.Separator />

	<Actions.DropdownMenu.Item onclick={handleResetCompletedStops}>
		<RotateCcw class="mr-2 h-4 w-4" />
		Reset Completed Stops
	</Actions.DropdownMenu.Item>
</TableActionsDropdown>
