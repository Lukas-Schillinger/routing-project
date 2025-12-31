<script lang="ts">
	import { browser } from '$app/environment';
	import * as Resizable from '$lib/components/ui/resizable';
	import { MediaQuery } from 'svelte/reactivity';

	const LAYOUT_STORAGE_KEY = 'map-detail-pane-layout';
	const SIDEBAR_MIN_PX = 320;
	const MAP_MIN_PX = 100;
	const LAYOUT_MIN_HEIGHT_PX = 950;

	let {
		children,
		sidebar,
		footer
	}: {
		children: import('svelte').Snippet;
		sidebar: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	} = $props();

	const isMobile = new MediaQuery('(max-width: 1024px)');

	// Track container width for pixel-based min sizes
	let containerRef = $state<HTMLDivElement | null>(null);
	let containerWidth = $state(browser ? window.innerWidth : 1200);

	// Calculate min sizes as percentages based on pixel values
	const sidebarMinSize = $derived(Math.ceil((SIDEBAR_MIN_PX / containerWidth) * 100));
	const mapMinSize = $derived(Math.ceil((MAP_MIN_PX / containerWidth) * 100));

	// Update container width on resize
	function updateContainerWidth() {
		if (containerRef) {
			containerWidth = containerRef.offsetWidth;
		}
	}

	// Load saved layout from localStorage
	function getSavedLayout(): number[] | undefined {
		if (!browser) return undefined;
		const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length === 2) {
					return parsed;
				}
			} catch {
				// Invalid JSON, ignore
			}
		}
		return undefined;
	}

	// Save layout to localStorage
	function saveLayout(sizes: number[]) {
		if (!browser) return;
		localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(sizes));
	}

	const savedLayout = getSavedLayout();

	// Initialize container width on mount
	$effect(() => {
		if (containerRef) {
			containerWidth = containerRef.offsetWidth;
		}
	});
</script>

<svelte:window onresize={updateContainerWidth} />

{#if isMobile.current}
	<!-- Mobile Layout: Stacked -->
	<div class="flex flex-col">
		<div class="h-[45vh] min-h-[300px] flex-shrink-0">
			{@render children()}
		</div>
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div class="flex-1 overflow-auto">
				{@render sidebar()}
			</div>
			{#if footer}
				<div class="flex-shrink-0 pt-4">
					{@render footer()}
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Desktop Layout: Resizable Split-pane -->
	<div bind:this={containerRef} class="h-[85vh]" style:min-height="{LAYOUT_MIN_HEIGHT_PX}px">
		<Resizable.PaneGroup direction="horizontal" class="h-full" onLayoutChange={saveLayout}>
			<Resizable.Pane defaultSize={savedLayout?.[0] ?? 65} minSize={mapMinSize}>
				<div class="h-full">
					{@render children()}
				</div>
			</Resizable.Pane>

			<Resizable.Handle withHandle />

			<Resizable.Pane defaultSize={savedLayout?.[1] ?? 35} minSize={sidebarMinSize}>
				<div class="flex h-full flex-col overflow-hidden">
					{#if footer}
						<div class="flex-shrink-0 pb-1">
							{@render footer()}
						</div>
					{/if}
					<div class="flex-1 overflow-auto">
						{@render sidebar()}
					</div>
				</div>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	</div>
{/if}
