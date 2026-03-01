<!-- @component CurrentStopPanel - Displays details for the currently selected stop -->
<script lang="ts">
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { Route as RouteType } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { AppleMapsService } from '$lib/services/external/client/apple-maps';
	import { GoogleMapsService } from '$lib/services/external/client/google-maps';
	import {
		Check,
		ChevronLeft,
		ChevronRight,
		Navigation,
		Package,
		Phone,
		Route,
		User
	} from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	type DirectionsProvider = 'google' | 'apple';

	interface Props {
		stop: StopWithLocation | undefined;
		stopIndex: number;
		totalStops: number;
		onPrevious?: () => void;
		onNext?: () => void;
		route?: RouteType;
		directionsProvider?: DirectionsProvider;
	}

	let {
		stop,
		stopIndex,
		totalStops,
		onPrevious,
		onNext,
		route,
		directionsProvider = 'google'
	}: Props = $props();

	// Local storage key for completed stops
	const getStorageKey = (routeId: string) => `route-${routeId}-completed-stops`;

	// Get completed stops from local storage
	function getCompletedStops(): SvelteSet<string> {
		if (!browser || !route?.id) return new SvelteSet();
		try {
			const stored = localStorage.getItem(getStorageKey(route.id));
			return new SvelteSet(stored ? JSON.parse(stored) : []);
		} catch {
			return new SvelteSet();
		}
	}

	// Save completed stops to local storage
	function saveCompletedStops(completedStops: Set<string>) {
		if (!browser || !route?.id) return;
		try {
			const storageKey = getStorageKey(route.id);
			const newValue = JSON.stringify([...completedStops]);
			localStorage.setItem(storageKey, newValue);

			// Notify same-tab listeners (storage events only fire cross-tab)
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: storageKey,
					newValue,
					storageArea: localStorage
				})
			);
		} catch (error) {
			console.error('Failed to save completed stops:', error);
		}
	}

	// State for completed stops
	let completedStops = $state(getCompletedStops());

	// Check if current stop is completed
	const isCompleted = $derived(stop ? completedStops.has(stop.stop.id) : false);

	// Get directions URL for the current stop
	const directionsUrl = $derived.by(() => {
		if (!stop || !stop.location.lat || !stop.location.lon) return null;

		const destination = {
			lat: stop.location.lat,
			lng: stop.location.lon,
			address: stop.location.address_line_1
		};

		if (directionsProvider === 'apple') {
			return AppleMapsService.getDirectionsUrl({ destination });
		} else {
			return GoogleMapsService.getDirectionsUrl({ destination });
		}
	});

	// Toggle delivery status
	function toggleDeliveryStatus() {
		if (!stop) return;

		const newCompletedStops = new SvelteSet(completedStops);
		if (completedStops.has(stop.stop.id)) {
			newCompletedStops.delete(stop.stop.id);
		} else {
			newCompletedStops.add(stop.stop.id);
		}

		completedStops = newCompletedStops;
		saveCompletedStops(newCompletedStops);
	}
</script>

<div class="flex-shrink-0 border-b bg-muted/30 px-4 pt-4 pb-2">
	{#if stop}
		<div class="">
			<div class="space-y-3">
				<!-- Address -->
				<div class="h-24 py-3">
					<h3 class="pb-1 text-2xl font-bold tracking-tight">
						{stop.location.address_line_1}
					</h3>
					<div class="text-sm text-muted-foreground">
						{stop.location.city || ''}{stop.location.city &&
						stop.location.region
							? ', '
							: ''}{stop.location.region || ''}
						{stop.location.postal_code || ''}
					</div>
				</div>

				<!-- Contact Name -->
				{#if stop.stop.contact_name}
					<div class="flex items-start gap-2">
						<User class="mt-0.5 h-4 w-4 text-muted-foreground" />
						<div class="text-sm">
							{stop.stop.contact_name}
						</div>
					</div>
				{/if}

				<!-- Contact Info -->
				{#if stop.stop.contact_phone}
					<div class="flex items-center gap-2">
						<Phone class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm">{stop.stop.contact_phone}</span>
					</div>
				{/if}

				<!-- Notes -->
				{#if stop.stop.notes}
					<div class="rounded-md bg-muted p-3">
						<p class="text-sm">{stop.stop.notes}</p>
					</div>
				{/if}

				<!-- Delivery Status Button -->
				<div class="grid grid-cols-3 gap-2">
					<Button
						onclick={toggleDeliveryStatus}
						size="sm"
						variant={isCompleted ? 'secondary' : 'default'}
						class="col-span-2 mb-0"
					>
						{#if isCompleted}
							<Check class="h-4 w-4" />
							Delivered
						{:else}
							<Package class="h-4 w-4" />
							Mark Delivered
						{/if}
					</Button>

					<!-- Get Directions Button -->
					{#if directionsUrl}
						<Button
							href={directionsUrl}
							size="sm"
							target="_blank"
							variant="outline"
							class="w-full"
						>
							<Navigation class="h-4" />
							Directions
						</Button>
					{/if}
				</div>
				<div class="grid w-full grid-cols-3 items-center justify-between gap-2">
					<h2 class="shrink-0 text-lg font-semibold whitespace-nowrap">
						Stop <span class="font-mono">{stopIndex + 1}</span> of
						<span class="font-mono">{totalStops}</span>
					</h2>
					<Button
						onclick={onPrevious}
						disabled={stopIndex === 0}
						size="sm"
						variant="outline"
						class="w-full p-0 "
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
					<Button
						onclick={onNext}
						disabled={stopIndex === totalStops - 1}
						size="sm"
						variant="outline"
						class="w-full p-0"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="flex flex-col items-center justify-center py-8">
				<Route class="mb-3 h-12 w-12 text-muted-foreground" />
				<h3 class="mb-1 font-medium">No Stops Found</h3>
				<p class="text-center text-sm text-muted-foreground">
					This route doesn't have any stops assigned.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
