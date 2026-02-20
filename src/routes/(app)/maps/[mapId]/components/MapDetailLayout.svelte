<script lang="ts">
	import { browser } from '$app/environment';
	import * as Menubar from '$lib/components/ui/menubar';
	import * as Resizable from '$lib/components/ui/resizable';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import { type Pane } from 'paneforge';
	import type { Snippet } from 'svelte';

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
		footer,
		paneSize = $bindable(SIDEBAR_DEFAULT)
	}: {
		children: Snippet<[Snippet?]>;
		sidebar: Snippet;
		footer?: Snippet;
		paneSize?: number;
	} = $props();

	const isMobile = new IsMobile(1024);

	// Track container width for pixel-based min sizes
	let containerRef = $state<HTMLDivElement | null>(null);
	let containerWidth = $state(browser ? window.innerWidth : 1200);

	// Calculate min sizes as percentages based on pixel values
	const sidebarMinSize = $derived(
		Math.ceil((SIDEBAR_MIN_PX / containerWidth) * 100)
	);
	const mapMinSize = $derived(Math.ceil((MAP_MIN_PX / containerWidth) * 100));

	// Pane component reference
	let sidebarPane = $state<Pane | null>(null);

	// Derive current layout from paneSize
	const currentLayout = $derived.by(() => {
		const distances = {
			collapsed: Math.abs(paneSize - SIDEBAR_COLLAPSED),
			default: Math.abs(paneSize - SIDEBAR_DEFAULT),
			expanded: Math.abs(paneSize - SIDEBAR_EXPANDED)
		};
		const closest = Object.entries(distances).reduce((min, [key, dist]) =>
			dist < min[1] ? [key, dist] : min
		);
		return closest[0] as 'collapsed' | 'default' | 'expanded';
	});

	// Update container width on resize
	function updateContainerWidth() {
		if (containerRef) {
			containerWidth = containerRef.offsetWidth;
		}
	}

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
		paneSize = size;
	}

	// Debounce paneSize updates during drag to avoid URL churn
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function handleLayoutChange(sizes: number[]) {
		const sidebarSize = sizes[1];
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			paneSize = Math.round(sidebarSize);
		}, 300);
	}
</script>

<svelte:window onresize={updateContainerWidth} />

{#snippet layoutControlsSnippet()}
	<Menubar.Root
		class=" h-9.5 gap-0 border-border/50 bg-background/80  backdrop-blur-sm"
	>
		<Menubar.Menu>
			<Menubar.Trigger
				class="gap-1.5 {currentLayout === 'collapsed'
					? 'bg-accent text-accent-foreground'
					: ''}"
				onclick={() => setLayout('collapsed')}
				aria-label="Focus on map"
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
				<span class="hidden @lg:inline">Map</span>
			</Menubar.Trigger>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger
				class="gap-1.5 {currentLayout === 'default'
					? 'bg-accent text-accent-foreground'
					: ''}"
				onclick={() => setLayout('default')}
				aria-label="Balanced view"
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
				<span class="hidden @lg:inline">Split</span>
			</Menubar.Trigger>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger
				class="gap-1.5 {currentLayout === 'expanded'
					? 'bg-accent text-accent-foreground'
					: ''}"
				onclick={() => setLayout('expanded')}
				aria-label="Focus on sidebar"
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
				<span class="hidden @lg:inline">List</span>
			</Menubar.Trigger>
		</Menubar.Menu>
	</Menubar.Root>
{/snippet}

{#if isMobile.current}
	<!-- Mobile Layout: Stacked (no layout controls on mobile) -->
	<div class="flex flex-col">
		<div class="h-[45vh] min-h-[300px] flex-shrink-0">
			{@render children(undefined)}
		</div>
		<div class="flex min-h-0 flex-1 flex-col overflow-hidden">
			{#if footer}
				<div class="flex-shrink-0 pt-2">
					{@render footer()}
				</div>
			{/if}
			<div class="flex-1 overflow-auto">
				{@render sidebar()}
			</div>
		</div>
	</div>
{:else}
	<!-- Desktop Layout: Resizable Split-pane -->
	<div
		bind:this={containerRef}
		class="h-[85vh]"
		style:min-height="{LAYOUT_MIN_HEIGHT_PX}px"
	>
		<Resizable.PaneGroup
			direction="horizontal"
			class="h-full"
			onLayoutChange={handleLayoutChange}
		>
			<Resizable.Pane defaultSize={100 - paneSize} minSize={mapMinSize}>
				<div class="@container relative h-full">
					{@render children(layoutControlsSnippet)}
				</div>
			</Resizable.Pane>

			<Resizable.Handle withHandle class="bg-transparent" />

			<Resizable.Pane
				bind:this={sidebarPane}
				defaultSize={paneSize}
				minSize={sidebarMinSize}
			>
				<div class="flex h-full flex-col overflow-hidden pl-2">
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
