<!-- @component RouteSettingsDropdown - Settings dropdown for route detail view -->
<script lang="ts">
	import { browser } from '$app/environment';
	import MetadataLabel from '$lib/components/table-actions/MetadataLabel.svelte';
	import * as Actions from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import type { Route as RouteType } from '$lib/schemas';
	import { Moon, RotateCcw, Settings, Sun } from 'lucide-svelte';
	import { mode, toggleMode } from 'mode-watcher';

	type DirectionsProvider = 'google' | 'apple';

	interface Props {
		route: RouteType;
		directionsProvider: DirectionsProvider;
		onDirectionsProviderChange: (provider: DirectionsProvider) => void;
	}

	let { route, directionsProvider, onDirectionsProviderChange }: Props =
		$props();

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
	<Actions.DropdownMenu.Label class="flex">Settings</Actions.DropdownMenu.Label>

	<DropdownMenu.Separator />
	<Actions.DropdownMenu.Label class="flex"
		>Navigation Provider</Actions.DropdownMenu.Label
	>
	<Actions.DropdownMenu.RadioGroup
		value={directionsProvider}
		onValueChange={(v) => onDirectionsProviderChange(v as DirectionsProvider)}
	>
		<Actions.DropdownMenu.RadioItem value="google"
			>Google Maps</Actions.DropdownMenu.RadioItem
		>
		<Actions.DropdownMenu.RadioItem value="apple"
			>Apple Maps</Actions.DropdownMenu.RadioItem
		>
	</Actions.DropdownMenu.RadioGroup>
	<Actions.DropdownMenu.Label class="flex">Actions</Actions.DropdownMenu.Label>

	<Actions.DropdownMenu.Item onclick={handleResetCompletedStops}>
		<RotateCcw class="mr-2 h-4 w-4" />
		reset completed stops
	</Actions.DropdownMenu.Item>
	<Actions.DropdownMenu.Item onclick={toggleMode}>
		<div class="mr-2">
			{#if mode.current == 'dark'}
				<Moon />
			{:else}
				<Sun />
			{/if}
		</div>

		toggle dark mode
	</Actions.DropdownMenu.Item>

	<MetadataLabel item={route} />
</TableActionsDropdown>
