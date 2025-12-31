<script lang="ts">
	import { browser } from '$app/environment';
	import * as Resizable from '$lib/components/ui/resizable';
	import { type Pane } from 'paneforge';
	import { MediaQuery } from 'svelte/reactivity';

	const LAYOUT_STORAGE_KEY = 'map-detail-pane-layout';
	const SIDEBAR_MIN_PX = 360;
	const MAP_MIN_PX = 100;
	const LAYOUT_MIN_HEIGHT_PX = 800;

	// Sidebar size presets
	const SIDEBAR_COLLAPSED = 25;
	const SIDEBAR_DEFAULT = 50;
	const SIDEBAR_EXPANDED = 75;

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

	// Pane component reference
	let sidebarPane = $state<Pane | null>(null);

	// Track current layout state
	let currentLayout = $state<'collapsed' | 'default' | 'expanded'>('default');

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

	function setLayout(layout: 'collapsed' | 'default' | 'expanded') {
		if (!sidebarPane) return;

		const size =
			layout === 'collapsed'
				? SIDEBAR_COLLAPSED
				: layout === 'expanded'
					? SIDEBAR_EXPANDED
					: SIDEBAR_DEFAULT;

		sidebarPane.resize(size);
		currentLayout = layout;
	}

	function handleLayoutChange(sizes: number[]) {
		saveLayout(sizes);
		// Detect current layout based on sidebar size - find closest preset
		const sidebarSize = sizes[1];

		const distances = {
			collapsed: Math.abs(sidebarSize - SIDEBAR_COLLAPSED),
			default: Math.abs(sidebarSize - SIDEBAR_DEFAULT),
			expanded: Math.abs(sidebarSize - SIDEBAR_EXPANDED)
		};

		// Find the preset with minimum distance
		const closest = Object.entries(distances).reduce((min, [key, dist]) =>
			dist < min[1] ? [key, dist] : min
		);

		currentLayout = closest[0] as 'collapsed' | 'default' | 'expanded';
	}
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
		<Resizable.PaneGroup direction="horizontal" class="h-full" onLayoutChange={handleLayoutChange}>
			<Resizable.Pane defaultSize={savedLayout?.[0] ?? 100 - SIDEBAR_DEFAULT} minSize={mapMinSize}>
				<div class="@container relative h-full">
					{@render children()}

					<!-- Layout preset buttons -->
					<div
						class="absolute top-2 right-2 flex rounded-md border border-border/50 bg-background/80 p-0.5 shadow-sm backdrop-blur-sm"
					>
						<button
							type="button"
							class="flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors {currentLayout ===
							'collapsed'
								? 'bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							onclick={() => setLayout('collapsed')}
							title="Focus on map"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
								<rect
									x="1"
									y="2"
									width="10"
									height="12"
									rx="1"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<rect
									x="12"
									y="2"
									width="3"
									height="12"
									rx="0.5"
									fill="currentColor"
									opacity="0.3"
								/>
							</svg>
							<span class="hidden @md:inline">Map</span>
						</button>
						<button
							type="button"
							class="flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors {currentLayout ===
							'default'
								? 'bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							onclick={() => setLayout('default')}
							title="Balanced view"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
								<rect
									x="1"
									y="2"
									width="8"
									height="12"
									rx="1"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<rect
									x="10"
									y="2"
									width="5"
									height="12"
									rx="1"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							</svg>
							<span class="hidden @md:inline">Split</span>
						</button>
						<button
							type="button"
							class="flex h-7 items-center gap-1.5 rounded-sm px-2 text-xs transition-colors {currentLayout ===
							'expanded'
								? 'bg-accent text-accent-foreground'
								: 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'}"
							onclick={() => setLayout('expanded')}
							title="Focus on sidebar"
						>
							<svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
								<rect
									x="1"
									y="2"
									width="3"
									height="12"
									rx="0.5"
									fill="currentColor"
									opacity="0.3"
								/>
								<rect
									x="5"
									y="2"
									width="10"
									height="12"
									rx="1"
									stroke="currentColor"
									stroke-width="1.5"
								/>
							</svg>
							<span class="hidden @md:inline">List</span>
						</button>
					</div>
				</div>
			</Resizable.Pane>

			<Resizable.Handle withHandle class="bg-transparent" />

			<Resizable.Pane
				bind:this={sidebarPane}
				defaultSize={savedLayout?.[1] ?? SIDEBAR_DEFAULT}
				minSize={sidebarMinSize}
			>
				<div class="flex h-full flex-col overflow-hidden px-2">
					{#if footer}
						<div class="flex-shrink-0 pb-1">
							{@render footer()}
						</div>
					{/if}
					<div class="flex-1 overflow-hidden">
						{@render sidebar()}
					</div>
				</div>
			</Resizable.Pane>
		</Resizable.PaneGroup>
	</div>
{/if}
