<script lang="ts">
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { geocodingService, type GeocodingFeature } from '$lib/services/mapbox-geocoding';
	import { Check, ChevronsUpDown, LoaderCircle, MapPin } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Props
	let {
		value = $bindable(''),
		placeholder = 'Search for an address...',
		country = 'US',
		onSelect = (feature: GeocodingFeature) => {},
		disabled = false
	}: {
		value?: string;
		placeholder?: string;
		country?: string;
		onSelect?: (feature: GeocodingFeature) => void;
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

	// Get user's location on mount
	onMount(() => {
		getUserLocation();
	});

	async function getUserLocation() {
		// Try geolocation API first
		if ('geolocation' in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					userProximity = [position.coords.longitude, position.coords.latitude];
					console.log('Using user location for proximity:', userProximity);
				},
				async (error) => {
					console.warn('Geolocation denied or failed:', error.message);
					// Fallback to IP-based location
					await getIPLocation();
				},
				{
					enableHighAccuracy: false,
					timeout: 5000,
					maximumAge: 600000 // Cache for 10 minutes
				}
			);
		} else {
			// Geolocation not supported, fallback to IP
			await getIPLocation();
		}
	}

	async function getIPLocation() {
		try {
			// Use ipapi.co for IP-based geolocation (free tier, no API key needed)
			const response = await fetch('https://ipapi.co/json/');
			if (response.ok) {
				const data = await response.json();
				if (data.longitude && data.latitude) {
					userProximity = [data.longitude, data.latitude];
					console.log('Using IP-based location for proximity:', userProximity);
				}
			}
		} catch (error) {
			console.warn('Failed to get IP-based location:', error);
			// Continue without proximity bias
		}
	}

	// Debounced search function
	async function searchAddresses(query: string) {
		if (query.trim().length < 2) {
			suggestions = [];
			return;
		}

		isSearching = true;

		try {
			const response = await geocodingService.autocomplete(query, {
				country,
				limit: 8,
				proximity: userProximity || undefined
			});
			suggestions = response.features;
		} catch (error) {
			console.error('Address search error:', error);
			suggestions = [];
		} finally {
			isSearching = false;
		}
	}

	// Handle search input with debounce
	function handleSearchInput(query: string) {
		searchQuery = query;

		// Clear previous timeout
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		// Set new timeout for debounced search
		searchTimeout = setTimeout(() => {
			searchAddresses(query);
		}, 300);
	}

	// Handle selection
	function selectAddress(feature: GeocodingFeature) {
		selectedFeature = feature;
		value = feature.place_name;
		searchQuery = feature.place_name;
		open = false;

		// Call the onSelect callback
		onSelect(feature);
	}

	// Clear selection
	function clearSelection() {
		selectedFeature = null;
		value = '';
		searchQuery = '';
		suggestions = [];
	}

	// Close and reset
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) {
			// Reset search when closing if no selection was made
			if (!selectedFeature) {
				searchQuery = '';
				suggestions = [];
			}
		} else {
			// When opening, set search to current value
			searchQuery = value;
			if (value.length >= 2) {
				searchAddresses(value);
			}
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
	<Popover.Content class="w-[400px] p-0">
		<Command.Root shouldFilter={false}>
			<Command.Input
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
					<div class="py-6 text-center text-sm">Type at least 2 characters to search</div>
				{:else}
					<div class="py-6 text-center text-sm">No addresses found</div>
				{/if}
			</Command.Empty>
			<Command.Group>
				{#each suggestions as feature (feature.id)}
					<Command.Item
						value={feature.place_name}
						onSelect={() => selectAddress(feature)}
						class="cursor-pointer"
					>
						<div class="flex items-start gap-2">
							<MapPin class="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
							<div class="min-w-0 flex-1">
								<div class="truncate font-medium">{feature.text}</div>
								<div class="truncate text-sm text-muted-foreground">
									{feature.place_name}
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
					<Command.Item onSelect={clearSelection} class="cursor-pointer justify-center">
						<span class="text-sm text-muted-foreground">Clear selection</span>
					</Command.Item>
				</Command.Group>
			{/if}
		</Command.Root>
	</Popover.Content>
</Popover.Root>
