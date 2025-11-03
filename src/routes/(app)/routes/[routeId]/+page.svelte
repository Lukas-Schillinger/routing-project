<!-- @component This work in browser but doen't work in the iphone simulator
	Uses scroll snap to snap panels across map display. For some reason it won't 
	scroll on mobile. I think it has something to do with pointer-events. 
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import MapView from '$lib/components/MapView.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { createAvatar } from '@dicebear/core';
	import * as style from '@dicebear/identicon';
	import { Map, Menu, Route, User } from 'lucide-svelte';
	import type { PageData } from './$types';
	import CurrentStopPanel from './CurrentStopPanel.svelte';
	import RouteSettingsDropdown from './RouteSettingsDropdown.svelte';
	import RouteTimeline from './RouteTimeline.svelte';

	let { data }: { data: PageData } = $props();

	// State for mobile panel visibility
	let showPanel = $state(true);

	// Destructure the data
	const { map, stops, assignedDrivers, route } = data;

	// Get the driver for this route
	const driver = $derived(assignedDrivers.find((d) => d.id === route.driver_id));

	// Directions provider preference with local storage
	type DirectionsProvider = 'google' | 'apple';

	function getDirectionsProvider(): DirectionsProvider {
		if (!browser) return 'google';
		try {
			const stored = localStorage.getItem('directions-provider');
			return (stored as DirectionsProvider) || 'google';
		} catch {
			return 'google';
		}
	}

	function saveDirectionsProvider(provider: DirectionsProvider) {
		if (!browser) return;
		try {
			localStorage.setItem('directions-provider', provider);
		} catch (error) {
			console.error('Failed to save directions provider:', error);
		}
	}

	let directionsProvider = $state<DirectionsProvider>(getDirectionsProvider());

	// Watch for changes and persist to localStorage
	$effect(() => {
		saveDirectionsProvider(directionsProvider);
	});

	// Function to handle directions provider change
	function handleDirectionsProviderChange(provider: DirectionsProvider) {
		directionsProvider = provider;
	}

	// Generate avatar for driver
	function getAvatar(driverId: string) {
		return createAvatar(style, {
			seed: driverId
		}).toDataUri();
	}

	// Calculate map center from stops
	const mapCenter = $derived.by(() => {
		if (stops.length === 0) return [-98.5795, 39.8283] as [number, number];

		let totalLat = 0;
		let totalLon = 0;
		let validCount = 0;

		stops.forEach((stop) => {
			if (stop.location.lat && stop.location.lon) {
				totalLat += parseFloat(stop.location.lat);
				totalLon += parseFloat(stop.location.lon);
				validCount++;
			}
		});

		if (validCount === 0) return [-98.5795, 39.8283] as [number, number];

		return [totalLon / validCount, totalLat / validCount] as [number, number];
	});

	// Calculate route statistics
	const routeStats = $derived.by(() => {
		const totalStops = stops.length;
		const totalDuration = Number(route.duration) || 0;

		return {
			totalStops,
			totalDuration: Math.floor(totalDuration / 60), // Convert to minutes
			estimatedHours: Math.floor(totalDuration / 3600),
			estimatedMinutes: Math.floor((totalDuration % 3600) / 60)
		};
	});

	// Sort stops by delivery index
	const sortedStops = $derived(
		stops.sort((a, b) => (a.stop.delivery_index || 0) - (b.stop.delivery_index || 0))
	);

	// State for current stop index in mobile view
	let selectedStopIndex = $state(0);

	// Get current stop for mobile view
	const selectedStop = $derived(sortedStops[selectedStopIndex]);

	// Reference to scroll function from RouteTimeline
	let scrollToIndex: ((index: number) => void) | null = null;

	// Navigation functions for mobile
	function goToPreviousStop() {
		if (selectedStopIndex > 0) {
			selectedStopIndex--;
			scrollToIndex?.(selectedStopIndex);
		}
	}

	function goToNextStop() {
		if (selectedStopIndex < sortedStops.length - 1) {
			selectedStopIndex++;
			scrollToIndex?.(selectedStopIndex);
		}
	}

	// State for focused stop (desktop only)
	let focusedStopId = $state<string | null>(null);

	// Function to handle going to a specific stop (desktop only)
	function handleGoToStop(stopId: string) {
		focusedStopId = stopId;
	}
</script>

<svelte:head>
	<title>{driver?.name || 'Driver'} Route - {map.title} | Routing Project</title>
	<meta name="description" content="View route for {driver?.name || 'driver'} in {map.title}" />
</svelte:head>

<div class="flex h-[100svh] flex-col">
	<!-- Header -->
	<div class="flex-shrink-0 border-b bg-background px-4 py-2 shadow-lg">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				{#if driver}
					<div class="flex items-center gap-3">
						<Avatar.Root class="size-8">
							<Avatar.Image src={getAvatar(driver.id)} alt="Driver avatar" />
							<Avatar.Fallback><User class="h-4 w-4" /></Avatar.Fallback>
						</Avatar.Root>
						<div>
							<h1 class="text-lg font-semibold">{driver.name}</h1>
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<Map class="size-4" />
								<span>{map.title}</span>
							</div>
						</div>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<Route class="h-5 w-5" />
						<h1 class="text-xl font-semibold">Driver Route - {map.title}</h1>
					</div>
				{/if}
			</div>

			<!-- Quick Stats and Panel Toggle -->
			<div class="flex items-center gap-4">
				<!-- Settings Dropdown -->
				<RouteSettingsDropdown
					{route}
					{directionsProvider}
					onDirectionsProviderChange={handleDirectionsProviderChange}
				/>

				<!-- Desktop: Show quick toggle -->
				<button
					onclick={() => (showPanel = !showPanel)}
					class="hidden items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted md:flex"
				>
					<Menu class="h-5 w-5" />
					<span>Toggle Details</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Mobile: Stop Navigation View -->
		<div class="flex h-full w-full flex-col md:hidden">
			<!-- Current Stop Panel -->
			<CurrentStopPanel
				stop={selectedStop}
				stopIndex={selectedStopIndex}
				totalStops={sortedStops.length}
				showNavigation={true}
				onPrevious={goToPreviousStop}
				onNext={goToNextStop}
				{route}
				{directionsProvider}
			/>

			<!-- Stops Table -->
			<div class="flex-1 overflow-hidden p-4">
				<RouteTimeline
					{route}
					stops={sortedStops}
					selectedIndex={selectedStopIndex}
					onStopSelect={(index) => (selectedStopIndex = index)}
					onScrollToIndex={(scrollFn) => (scrollToIndex = scrollFn)}
				/>
			</div>
		</div>

		<!-- Desktop: Combined View -->
		<div class="hidden h-full w-full md:flex">
			<!-- Map View -->
			<div class="relative flex-1">
				<MapView
					stops={sortedStops}
					routes={[route]}
					center={mapCenter}
					zoom={12}
					bind:focusedStopId
					onGoToStop={handleGoToStop}
				/>
			</div>

			<!-- Side Panel -->
			{#if showPanel}
				<div class="flex w-96 flex-shrink-0 flex-col overflow-hidden border-l bg-muted/30">
					<!-- Current Stop Panel -->
					<CurrentStopPanel
						stop={selectedStop}
						stopIndex={selectedStopIndex}
						totalStops={sortedStops.length}
						showNavigation={true}
						onPrevious={goToPreviousStop}
						onNext={goToNextStop}
						{route}
						{directionsProvider}
					/>

					<!-- Route Timeline -->
					<div class="flex-1 overflow-hidden p-4">
						<RouteTimeline
							{route}
							stops={sortedStops}
							selectedIndex={selectedStopIndex}
							onStopSelect={(index) => (selectedStopIndex = index)}
							onStopFocus={handleGoToStop}
							onScrollToIndex={(scrollFn) => (scrollToIndex = scrollFn)}
						/>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
