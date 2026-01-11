<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import type { LocationCreate } from '$lib/schemas/location';
	import { geocodingApi } from '$lib/services/api';
	import type { GeocodingFeature } from '$lib/services/external/mapbox/types';
	import { cn, geocodingFeatureToLocation } from '$lib/utils';
	import { LoaderCircle, MapPin } from 'lucide-svelte';
	import { Debounced } from 'runed';

	type Props = {
		placeholder?: string;
		proximity?: [number, number];
		onSelect: (location: LocationCreate, lngLat: [number, number]) => void;
		disabled?: boolean;
		class?: string;
	};

	let {
		placeholder = 'Search for an address...',
		proximity,
		onSelect,
		disabled = false,
		class: className
	}: Props = $props();

	let searchQuery = $state('');
	let suggestions = $state<GeocodingFeature[]>([]);
	let isSearching = $state(false);

	const debouncedQuery = new Debounced(() => searchQuery, 100);

	const getAddressContext = (feature: GeocodingFeature): string => {
		const parts = [
			feature.properties.context?.place?.name,
			feature.properties.context?.region?.region_code
		].filter(Boolean);

		if (feature.properties.context?.postcode?.name) {
			parts.push(feature.properties.context.postcode.name);
		}

		return parts.join(', ');
	};

	async function performSearch(query: string): Promise<void> {
		if (query.trim().length < 2) {
			suggestions = [];
			return;
		}

		isSearching = true;
		try {
			suggestions = await geocodingApi.autocomplete(query, {
				country: 'US',
				limit: 6,
				proximity
			});
		} catch (error) {
			console.error('Address search error:', error);
			suggestions = [];
		} finally {
			isSearching = false;
		}
	}

	$effect(() => {
		const query = debouncedQuery.current;
		if (query.length >= 2) {
			performSearch(query);
		} else {
			suggestions = [];
		}
	});

	function handleSelectAddress(feature: GeocodingFeature): void {
		const location = geocodingFeatureToLocation(feature);
		const lngLat: [number, number] = [
			feature.geometry.coordinates[0],
			feature.geometry.coordinates[1]
		];

		// Clear input and suggestions after selection
		searchQuery = '';
		suggestions = [];

		// Notify parent
		onSelect(location, lngLat);
	}
</script>

<Command.Root
	shouldFilter={false}
	class={cn('rounded-md border bg-background shadow-sm', className)}
>
	<Command.Input
		{placeholder}
		bind:value={searchQuery}
		{disabled}
		class="h-9 text-sm"
	/>
	<Command.List class="max-h-[250px]">
		<Command.Empty>
			{#if isSearching}
				<div class="flex items-center justify-center gap-2 py-4">
					<LoaderCircle class="h-4 w-4 animate-spin" />
					<span class="text-sm">Searching...</span>
				</div>
			{:else if searchQuery.length < 2}
				<div class="py-4 text-center text-sm text-muted-foreground">
					Type to search addresses...
				</div>
			{:else}
				<div class="py-4 text-center text-sm text-muted-foreground">
					No addresses found
				</div>
			{/if}
		</Command.Empty>
		{#if suggestions.length > 0}
			<Command.Group>
				{#each suggestions as feature (feature.id)}
					{@const context = getAddressContext(feature)}
					<Command.Item
						value={feature.properties.mapbox_id}
						onSelect={() => handleSelectAddress(feature)}
						class="cursor-pointer"
					>
						<div class="flex items-start gap-2">
							<MapPin class="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">
									{feature.properties.name}
								</div>
								{#if context}
									<div class="truncate text-xs text-muted-foreground">
										{context}
									</div>
								{/if}
							</div>
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Root>
