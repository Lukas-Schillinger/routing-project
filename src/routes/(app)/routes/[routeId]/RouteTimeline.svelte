<!-- @component RouteTimeline - Displays a list of stops in table format -->
<script lang="ts">
	import { browser } from '$app/environment';
	import type { DepotWithLocationJoin, Route as RouteType } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { formatDate } from '$lib/utils';
	import { Calendar, Check, Clock, MapPin, Route } from 'lucide-svelte';
	import { Garage } from 'phosphor-svelte';

	interface Props {
		route: RouteType;
		stops: StopWithLocation[];
		depot?: DepotWithLocationJoin | null;
		selectedIndex?: number;
		onStopSelect?: (index: number) => void;
		onStopFocus?: (stopId: string) => void;
		onScrollToIndex?: (scrollFn: (index: number) => void) => void;
	}

	let {
		route,
		stops,
		depot = null,
		selectedIndex = -1,
		onStopSelect,
		onStopFocus,
		onScrollToIndex
	}: Props = $props();

	// Local storage functions for completed stops
	const getStorageKey = (routeId: string) => `route-${routeId}-completed-stops`;

	function getCompletedStops(): Set<string> {
		if (!browser) return new Set();
		try {
			const stored = localStorage.getItem(getStorageKey(route.id));
			return new Set(stored ? JSON.parse(stored) : []);
		} catch {
			return new Set();
		}
	}

	// State for completed stops
	let completedStops = $state(getCompletedStops());

	// Reference to scroll container
	let scrollContainer: HTMLDivElement | undefined = $state();

	// Scroll to specific stop index
	function scrollToIndex(index: number) {
		if (!scrollContainer || index < 0 || index >= stops.length) return;

		const stopElements = scrollContainer.querySelectorAll('[data-stop-index]');
		const targetElement = stopElements[index] as HTMLElement;

		if (targetElement) {
			targetElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest'
			});
		}
	}

	// Expose scroll function to parent
	$effect(() => {
		if (onScrollToIndex) {
			onScrollToIndex(scrollToIndex);
		}
	});

	// Update completed stops when local storage changes
	function updateCompletedStops() {
		completedStops = getCompletedStops();
	}

	// Listen for storage changes (when other tabs/components update)
	$effect(() => {
		if (browser) {
			const handleStorageChange = (e: StorageEvent) => {
				if (e.key === getStorageKey(route.id)) {
					updateCompletedStops();
				}
			};

			window.addEventListener('storage', handleStorageChange);

			// Also check periodically for updates from same tab
			const interval = setInterval(updateCompletedStops, 1000);

			return () => {
				window.removeEventListener('storage', handleStorageChange);
				clearInterval(interval);
			};
		}
	});
</script>

{#if stops.length === 0}
	<!-- Empty State -->
	<div
		class="flex h-full items-center justify-center rounded-lg border bg-background"
	>
		<div class="flex flex-col items-center justify-center py-8">
			<Route class="mb-3 h-12 w-12 text-muted-foreground" />
			<h3 class="mb-1 font-medium">No Stops Found</h3>
			<p class="text-center text-sm text-muted-foreground">
				This route doesn't have any stops assigned.
			</p>
		</div>
	</div>
{:else}
	<!-- Table Format -->
	<div class="h-full rounded-lg border bg-background">
		<div class="border-b p-3">
			<ul class="flex gap-4 text-sm text-muted-foreground">
				<li class="flex items-center gap-1">
					<MapPin class="size-4" />{stops.length}
				</li>
				<li class="flex items-center gap-1">
					<Clock class="size-4" />{Math.floor(Number(route.duration) / 60)}m
				</li>
				<li class="flex items-center gap-1">
					<Calendar class="size-4" />
					{formatDate(route.updated_at)}
				</li>
			</ul>
		</div>
		<div
			class="h-full max-h-[calc(100%-4rem)] overflow-y-auto"
			bind:this={scrollContainer}
		>
			<!-- Depot -->
			{#if depot}
				<div
					class="border-b transition-colors hover:bg-sand-100 dark:hover:bg-secondary/55"
				>
					<div class="flex items-center justify-between p-3">
						<div class="min-w-0 flex-1 text-left">
							<div class="flex items-center gap-4">
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full border bg-secondary text-xs font-medium"
								>
									<Garage class="h-3.5 w-3.5" />
								</span>
								<div>
									<h4>{depot.depot.name}</h4>
									<p class="text-sm text-muted-foreground">
										{depot.location.address_line_1}
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Stops -->
			{#each stops as { stop, location }, index (stop.id)}
				{@const isCompleted = completedStops.has(stop.id)}
				<div
					data-stop-index={index}
					class="border-b transition-colors {selectedIndex === index
						? 'bg-secondary hover:bg-sand-200 dark:hover:bg-secondary'
						: 'hover:bg-sand-100 dark:hover:bg-secondary/55'} 
						{isCompleted ? 'opacity-75' : ''}"
				>
					<div class="flex items-center justify-between p-3">
						<button
							onclick={() => {
								onStopSelect?.(index);
								onStopFocus?.(stop.id);
							}}
							class="min-w-0 flex-1 text-left"
						>
							<div class="flex items-center gap-4">
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium {isCompleted
										? 'bg-secondary text-secondary-foreground'
										: 'bg-primary text-primary-foreground'}"
								>
									{#if isCompleted}
										<Check class="h-3 w-3" />
									{:else}
										{stop.delivery_index || index + 1}
									{/if}
								</span>

								<div class={isCompleted ? 'opacity-60' : ''}>
									<h4 class={isCompleted ? 'line-through' : ''}>
										{location.address_line_1}
									</h4>
									{#if stop.contact_name}
										<p class="mt-1 text-sm text-muted-foreground">
											{stop.contact_name}
										</p>
									{/if}
									{#if stop.contact_phone}
										<p class="text-xs text-muted-foreground">
											{stop.contact_phone}
										</p>
									{/if}
								</div>
							</div>
						</button>
						<div class="flex items-center gap-2">
							{#if isCompleted}
								<Check class="h-4 w-4 text-muted-foreground" />
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
