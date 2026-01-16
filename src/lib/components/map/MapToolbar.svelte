<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { LocationCreate } from '$lib/schemas';
	import { MapPinPlus } from 'phosphor-svelte';
	import type { Snippet } from 'svelte';
	import AddressSearchInput from './AddressSearchInput.svelte';

	let {
		mode = $bindable<'default' | 'drop-pin'>('default'),
		disabled = false,
		layoutControls,
		onAddressSelect,
		proximity
	}: {
		mode?: 'default' | 'drop-pin';
		disabled?: boolean;
		layoutControls?: Snippet;
		onAddressSelect?: (
			location: LocationCreate,
			lngLat: [number, number]
		) => void;
		proximity?: [number, number];
	} = $props();

	function togglePinMode() {
		mode = mode === 'drop-pin' ? 'default' : 'drop-pin';
	}
</script>

<div
	class="absolute z-10 flex w-full items-center justify-between gap-2 px-3 pt-3"
>
	<!-- Left side: Address search and drop pin button -->
	<div class="flex items-center gap-2">
		{#if onAddressSelect}
			<AddressSearchInput
				{proximity}
				{disabled}
				onSelect={onAddressSelect}
				class="w-64"
			/>
		{/if}

		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class="rounded-lg border bg-background shadow">
					<Button
						variant={mode === 'drop-pin' ? 'default' : 'ghost'}
						size="default"
						{disabled}
						onclick={togglePinMode}
					>
						<MapPinPlus class="size-4" />
					</Button>
				</Tooltip.Trigger>
				<Tooltip.Content>Drop pin on map</Tooltip.Content>
			</Tooltip.Root>
		</Tooltip.Provider>
	</div>

	<!-- Right side: Layout controls (optional snippet) -->
	{#if layoutControls}
		{@render layoutControls()}
	{/if}
</div>
