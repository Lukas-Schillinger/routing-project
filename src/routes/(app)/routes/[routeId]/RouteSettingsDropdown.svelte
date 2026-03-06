<!-- @component RouteSettingsDropdown - Settings dropdown for route detail view -->
<script lang="ts">
	import { browser } from '$app/environment';
	import ConfirmDeleteDialog from '$lib/components/ConfirmDeleteDialog/ConfirmDeleteDialog.svelte';
	import DropdownMetadataLabel from '$lib/components/DropdownMetadataLabel.svelte';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { captureClientError, ServiceError } from '$lib/errors';
	import type { Route as RouteType } from '$lib/schemas';
	import Moon from '@lucide/svelte/icons/moon';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Settings from '@lucide/svelte/icons/settings';
	import Sun from '@lucide/svelte/icons/sun';
	import { mode, toggleMode } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	type DirectionsProvider = 'google' | 'apple';

	type Props = {
		route: RouteType;
		directionsProvider: DirectionsProvider;
		onDirectionsProviderChange: (provider: DirectionsProvider) => void;
	};

	let { route, directionsProvider, onDirectionsProviderChange }: Props =
		$props();

	// Reset completed stops function
	function handleResetCompletedStops() {
		if (!browser) return;

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

			toast.success('Completed stops reset');
		} catch (error) {
			console.error('Failed to reset completed stops:', error);
			captureClientError(error);
			const message =
				error instanceof ServiceError
					? error.message
					: 'Failed to reset completed stops. Please try again.';
			toast.error(message);
		}
	}
</script>

<TableActionsDropdown>
	{#snippet trigger()}
		<span class="sr-only">Open settings</span>
		<Settings class="h-4 w-4" />
	{/snippet}
	<DropdownMenu.Label class="flex">Settings</DropdownMenu.Label>

	<DropdownMenu.Separator />
	<DropdownMenu.Label class="flex">Navigation Provider</DropdownMenu.Label>
	<DropdownMenu.RadioGroup
		value={directionsProvider}
		onValueChange={(v) => onDirectionsProviderChange(v as DirectionsProvider)}
	>
		<DropdownMenu.RadioItem value="google">Google Maps</DropdownMenu.RadioItem>
		<DropdownMenu.RadioItem value="apple">Apple Maps</DropdownMenu.RadioItem>
	</DropdownMenu.RadioGroup>
	<DropdownMenu.Label class="flex">Actions</DropdownMenu.Label>

	<ConfirmDeleteDialog
		title="Reset Completed Stops"
		description="Are you sure you want to reset all completed stops? This will mark all stops in this route as not delivered. This action cannot be undone."
		confirmText="Reset"
		onConfirm={handleResetCompletedStops}
	>
		{#snippet trigger({ props })}
			<DropdownMenu.ActionButton {...props}>
				<RotateCcw />
				Reset completed stops
			</DropdownMenu.ActionButton>
		{/snippet}
	</ConfirmDeleteDialog>
	<DropdownMenu.Item onclick={toggleMode}>
		<div>
			{#if mode.current == 'dark'}
				<Moon />
			{:else}
				<Sun />
			{/if}
		</div>

		toggle dark mode
	</DropdownMenu.Item>

	<DropdownMetadataLabel item={route} />
</TableActionsDropdown>
