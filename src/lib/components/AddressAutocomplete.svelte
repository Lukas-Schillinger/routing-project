<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import type { LocationCreate } from '$lib/schemas/location';
	import { geocodingApi } from '$lib/services/api';
	import type { GeocodingFeature } from '$lib/services/external/mapbox/types';
	import { geocodingFeatureToLocation } from '$lib/utils';
	import { Check, ChevronsUpDown, LoaderCircle, MapPin } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Props
	let {
		value = $bindable(''),
		placeholder = 'Search for an address...',
		country = 'US',
		onSelect = () => {},
		onClear = () => {},
		disabled = false
	}: {
		value?: string;
		placeholder?: string;
		country?: string;
		onSelect?: (location: LocationCreate) => void;
		onClear?: () => void;
		disabled?: boolean;
	} = $props();

	// State
	let open = $state(false);
	let searchQuery = $state('');
	let suggestions = $state<GeocodingFeature[]>([]);
	let isSearching = $state(false);
	let searchTimeout: NodeJS.Timeout | null = null;
	let selectedFeature = $state<GeocodingFeature | null>(null);
	let userProximity = $state<[number, number] | null>(null);

	const LOCATION_STORAGE_KEY = 'user_proximity_location';

	const getFullAddress = (feature: GeocodingFeature): string =>
		feature.properties.full_address ||
		`${feature.properties.name}${feature.properties.place_formatted ? ', ' + feature.properties.place_formatted : ''}`;

	const loadCachedLocation = (key: string): [number, number] | null => {
		try {
			const cached = sessionStorage.getItem(key);
			return cached ? JSON.parse(cached) : null;
		} catch (error) {
			console.warn('Failed to parse cached location', error);
			return null;
		}
	};

	const saveLocationToCache = (
		location: [number, number],
		key: string
	): void => {
		sessionStorage.setItem(key, JSON.stringify(location));
	};

	// Async pure function - returns value, no mutation
	async function fetchIPLocation(): Promise<[number, number] | null> {
		try {
			const response = await fetch('https://ipapi.co/json/');
			if (!response.ok) return null;

			const data = await response.json();
			return data.longitude && data.latitude
				? [data.longitude, data.latitude]
				: null;
		} catch (error) {
			console.warn('Failed to get IP-based location:', error);
			return null;
		}
	}

	async function fetchAddressSuggestions(
		query: string,
		options: { country: string; limit: number; proximity?: [number, number] }
	): Promise<GeocodingFeature[]> {
		if (query.trim().length < 2) {
			return [];
		}

		try {
			return await geocodingApi.autocomplete(query, options);
		} catch (error) {
			console.error('Address search error:', error);
			return [];
		}
	}

	// Side-effect: Initialize user location on mount
	onMount(() => {
		const cached = loadCachedLocation(LOCATION_STORAGE_KEY);
		if (cached) {
			userProximity = cached;
			console.log('Using cached location for proximity bias');
			return;
		}

		// Attempt browser geolocation
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const location: [number, number] = [
						position.coords.longitude,
						position.coords.latitude
					];
					userProximity = location;
					saveLocationToCache(location, LOCATION_STORAGE_KEY);
					console.log('Using device location for proximity bias');
				},
				(error) => {
					console.log('Geolocation not available:', error.message);
					// Fall back to IP location
					fetchIPLocation().then((location) => {
						if (location) {
							userProximity = location;
							saveLocationToCache(location, LOCATION_STORAGE_KEY);
							console.log('Using IP-based location for proximity');
						}
					});
				},
				{
					enableHighAccuracy: false,
					timeout: 5000,
					maximumAge: 600000 // Cache for 10 minutes
				}
			);
		} else {
			// No geolocation API, try IP fallback
			fetchIPLocation().then((location) => {
				if (location) {
					userProximity = location;
					saveLocationToCache(location, LOCATION_STORAGE_KEY);
					console.log('Using IP-based location for proximity');
				}
			});
		}
	});

	// Side-effect: Perform search and update state
	async function performSearch(query: string): Promise<void> {
		isSearching = true;
		const results = await fetchAddressSuggestions(query, {
			country,
			limit: 8,
			proximity: userProximity || undefined
		});
		suggestions = results;
		isSearching = false;
	}

	// Event handler with debouncing
	function handleSearchInput(query: string): void {
		searchQuery = query;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => performSearch(query), 100);
	}

	// Event handler for address selection
	function handleSelectAddress(feature: GeocodingFeature): void {
		const fullAddress = getFullAddress(feature);
		const location = geocodingFeatureToLocation(feature);

		// Update state in one place
		selectedFeature = feature;
		value = fullAddress;
		searchQuery = fullAddress;
		open = false;

		// Notify parent
		onSelect(location);
	}

	// Event handler for clearing selection
	function handleClearSelection(): void {
		selectedFeature = null;
		value = '';
		searchQuery = '';
		suggestions = [];

		onClear();
	}

	// Event handler for popover state changes
	function handleOpenChange(isOpen: boolean): void {
		open = isOpen;

		if (isOpen) {
			// Opening: initialize search with current value
			searchQuery = value;
			if (value.length >= 2) {
				performSearch(value);
			}
		} else if (!selectedFeature) {
			// Closing without selection: reset search
			searchQuery = '';
			suggestions = [];
		}
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<Popover.Trigger
		{disabled}
		class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
	>
		<div class="flex items-center gap-2 truncate">
			<MapPin class="h-4 w-4 shrink-0 opacity-50" />
			<span class="truncate">
				{value || placeholder}
			</span>
		</div>
		<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
	</Popover.Trigger>
	<Popover.Content
		align="start"
		class="w-[var(--bits-popover-anchor-width)] p-0"
	>
		<Command.Root shouldFilter={false}>
			<Command.Input
				class="text-base"
				{placeholder}
				bind:value={searchQuery}
				oninput={(e) => handleSearchInput(e.currentTarget.value)}
			/>
			<Command.Empty>
				{#if isSearching}
					<div class="flex items-center justify-center gap-2 py-6">
						<LoaderCircle class="h-4 w-4 animate-spin" />
						<span>Searching...</span>
					</div>
				{:else if searchQuery.length < 2}
					<div class="py-6 text-center text-sm text-muted-foreground">
						Start typing to search...
					</div>
				{:else}
					<div class="py-6 text-center text-sm">No addresses found</div>
				{/if}
			</Command.Empty>
			<Command.Group>
				{#each suggestions as feature (feature.id)}
					{@const fullAddress = getFullAddress(feature)}
					<Command.Item
						value={fullAddress}
						onSelect={() => handleSelectAddress(feature)}
						class="cursor-pointer"
					>
						<div class="flex items-start gap-2">
							<MapPin class="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
							<div class="min-w-0 flex-1">
								<div class="truncate font-medium">
									{feature.properties.name}
								</div>
								<div class="truncate text-sm text-muted-foreground">
									{[
										feature.properties.context?.place?.name,
										feature.properties.context?.region?.region_code
									]
										.filter(Boolean)
										.join(' ')}
									{#if feature.properties.context?.postcode?.name}
										, {feature.properties.context.postcode.name}
									{/if}
								</div>
							</div>
							{#if selectedFeature?.id === feature.id}
								<Check class="h-4 w-4 shrink-0" />
							{/if}
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
			{#if selectedFeature}
				<Command.Separator />
				<Command.Group>
					<Command.Item
						onSelect={handleClearSelection}
						class="cursor-pointer justify-center"
					>
						<span class="text-sm text-muted-foreground">Clear selection</span>
					</Command.Item>
				</Command.Group>
			{/if}
		</Command.Root>
	</Popover.Content>
</Popover.Root>
