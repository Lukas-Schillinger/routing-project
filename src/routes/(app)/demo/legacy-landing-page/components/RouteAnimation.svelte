<!-- @component RouteAnimation - Animated landing page component that auto-completes stops -->
<script lang="ts">
	import type { Route as RouteType } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { formatDate } from '$lib/utils';
	import { Calendar, Check, Clock, MapPin, Route } from 'lucide-svelte';
	import { onMount } from 'svelte';

	interface Props {
		route: RouteType;
		stops: StopWithLocation[];
		/** Time in milliseconds between completing each stop */
		intervalMs?: number;
		/** Whether to loop the animation after all stops complete */
		loop?: boolean;
		/** Delay before restarting animation when looping (in ms) */
		loopDelayMs?: number;
	}

	let {
		route,
		stops,
		intervalMs = 2000,
		loop = true,
		loopDelayMs = 3000
	}: Props = $props();

	// Track which stops have been completed (by index)
	let completedIndices = $state<Set<number>>(new Set());

	// Current stop being highlighted (the one about to be completed)
	let currentIndex = $state(0);

	// Reference to scroll container
	let scrollContainer: HTMLDivElement | undefined = $state();

	// Scroll to specific stop index (contained within the scroll container)
	function scrollToIndex(index: number) {
		if (!scrollContainer || index < 0 || index >= stops.length) return;

		const stopElements = scrollContainer.querySelectorAll('[data-stop-index]');
		const targetElement = stopElements[index] as HTMLElement;

		if (targetElement) {
			// Use getBoundingClientRect for accurate positioning
			const containerRect = scrollContainer.getBoundingClientRect();
			const elementRect = targetElement.getBoundingClientRect();

			// Calculate where the element is relative to the container's current scroll
			const elementTopRelativeToContainer =
				elementRect.top - containerRect.top + scrollContainer.scrollTop;
			const containerHeight = scrollContainer.clientHeight;
			const elementHeight = targetElement.offsetHeight;

			// Center the element in the container
			const scrollTop =
				elementTopRelativeToContainer - containerHeight / 2 + elementHeight / 2;

			scrollContainer.scrollTo({
				top: Math.max(0, scrollTop),
				behavior: 'smooth'
			});
		}
	}

	// Animation timer
	onMount(() => {
		let timeoutId: ReturnType<typeof setTimeout>;

		function completeNextStop() {
			if (currentIndex < stops.length) {
				// Complete the current stop
				completedIndices = new Set([...completedIndices, currentIndex]);
				currentIndex++;

				// Scroll to the next stop
				if (currentIndex < stops.length) {
					scrollToIndex(currentIndex);
				}

				// Schedule next completion
				if (currentIndex < stops.length) {
					timeoutId = setTimeout(completeNextStop, intervalMs);
				} else if (loop) {
					// All stops completed, restart after delay if looping
					timeoutId = setTimeout(() => {
						completedIndices = new Set();
						currentIndex = 0;
						scrollToIndex(0);
						timeoutId = setTimeout(completeNextStop, intervalMs);
					}, loopDelayMs);
				}
			}
		}

		// Start animation after initial delay
		timeoutId = setTimeout(completeNextStop, intervalMs);

		return () => {
			clearTimeout(timeoutId);
		};
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
			<div class="flex justify-between">
				<div>
					<div class="pb-2 font-medium">
						{new Date().toLocaleDateString('en-us', { weekday: 'long' })} Morning
						Dropoffs
					</div>
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
					class="text-4xl font-medium diagonal-fractions {currentIndex ==
					stops.length
						? 'text-green-800'
						: ''}"
				>
					{currentIndex}/{stops.length}
				</div>
			</div>
		</div>
		<div
			class="h-full max-h-[calc(100%-5rem)] overflow-y-auto"
			bind:this={scrollContainer}
		>
			{#each stops as { stop, location }, index}
				{@const isCompleted = completedIndices.has(index)}
				{@const isCurrent = index === currentIndex && !isCompleted}
				<div
					data-stop-index={index}
					class="border-b transition-all duration-300 {isCurrent
						? 'bg-primary/10 dark:bg-primary/20'
						: isCompleted
							? 'opacity-75'
							: ''}"
				>
					<div class="flex items-center justify-between p-3">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-4">
								<span
									class="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium transition-all duration-300 {isCompleted
										? 'border-green-600 bg-green-600 text-white'
										: isCurrent
											? 'border-primary bg-primary text-primary-foreground'
											: 'bg-secondary'}"
								>
									{#if isCompleted}
										<Check class="h-3 w-3" />
									{:else}
										{stop.delivery_index || index + 1}
									{/if}
								</span>

								<div
									class="transition-opacity duration-300 {isCompleted
										? 'opacity-60'
										: ''}"
								>
									<h4
										class="transition-all duration-300 {isCompleted
											? 'line-through'
											: ''}"
									>
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
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
