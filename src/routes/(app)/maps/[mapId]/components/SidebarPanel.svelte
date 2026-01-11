<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import { MapPin, Truck } from 'lucide-svelte';

	type PageState = 'normal' | 'optimizing';

	let {
		pageState,
		stopsCount = 0,
		driversCount = 0,
		stopsTab,
		driversTab
	}: {
		pageState: PageState;
		stopsCount?: number;
		driversCount?: number;
		stopsTab: import('svelte').Snippet;
		driversTab: import('svelte').Snippet;
	} = $props();

	let activeTab = $state('stops');
</script>

<div class="flex h-full flex-col">
	<Tabs.Root bind:value={activeTab} class="flex h-full flex-col pt-2 lg:pt-0">
		<div class="flex-shrink-0">
			<Tabs.List class="h-8 w-full justify-start gap-1">
				<Tabs.Trigger
					value="stops"
					class="gap-1.5"
					disabled={pageState === 'optimizing'}
				>
					<MapPin class="h-3.5 w-3.5" />
					<span>Stops</span>
					{#if stopsCount > 0}
						<span class="ml-1 text-xs text-muted-foreground"
							>({stopsCount})</span
						>
					{:else}
						<span class="ml-1 text-xs text-warning">({stopsCount})</span>
					{/if}
				</Tabs.Trigger>
				<Tabs.Trigger
					value="drivers"
					class="gap-1.5"
					disabled={pageState === 'optimizing'}
				>
					<Truck class="h-3.5 w-3.5" />
					<span>Drivers</span>
					{#if driversCount > 0}
						<span class="ml-1 text-xs text-muted-foreground"
							>({driversCount})</span
						>
					{:else}
						<span class="ml-1 text-xs text-warning">({driversCount})</span>
					{/if}
				</Tabs.Trigger>
			</Tabs.List>
		</div>

		<div class="min-h-0 flex-1 overflow-hidden">
			<Tabs.Content value="stops" class="m-0 h-full">
				{@render stopsTab()}
			</Tabs.Content>

			<Tabs.Content value="drivers" class="m-0 h-full">
				{@render driversTab()}
			</Tabs.Content>
		</div>
	</Tabs.Root>
</div>
