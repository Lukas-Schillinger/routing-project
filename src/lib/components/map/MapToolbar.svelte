<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { MapPinPlus } from 'phosphor-svelte';
	import type { Snippet } from 'svelte';

	let {
		mode = $bindable<'default' | 'drop-pin'>('default'),
		disabled = false,
		layoutControls
	}: {
		mode?: 'default' | 'drop-pin';
		disabled?: boolean;
		layoutControls?: Snippet;
	} = $props();

	function togglePinMode() {
		mode = mode === 'drop-pin' ? 'default' : 'drop-pin';
	}
</script>

<div
	class="absolute z-10 flex w-full items-center justify-between gap-2 px-3 pt-3"
>
	<!-- Left side: Drop pin button -->
	<div class="">
		<!-- Placeholder for future AddressSearchInput -->

		<Tooltip.Provider>
			<Tooltip.Root>
				<Tooltip.Trigger class="rounded-lg bg-black">
					<Button
						variant={mode === 'drop-pin' ? 'default' : 'ghost'}
						size="icon-sm"
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
