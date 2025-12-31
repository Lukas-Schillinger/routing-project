<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';

	let {
		sidebarWidth = $bindable(400),
		minSidebarWidth = 320,
		maxSidebarWidth = 1200,
		children,
		sidebar,
		footer
	}: {
		sidebarWidth?: number;
		minSidebarWidth?: number;
		maxSidebarWidth?: number;
		children: import('svelte').Snippet;
		sidebar: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
	} = $props();

	const isMobile = new MediaQuery('(max-width: 1024px)');

	let isResizing = $state(false);
	let containerRef: HTMLDivElement | null = $state(null);

	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		document.addEventListener('mousemove', handleResize);
		document.addEventListener('mouseup', stopResize);
	}

	function handleResize(e: MouseEvent) {
		if (!isResizing || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const newWidth = containerRect.right - e.clientX;

		sidebarWidth = Math.max(minSidebarWidth, Math.min(maxSidebarWidth, newWidth));
	}

	function stopResize() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResize);
		document.removeEventListener('mouseup', stopResize);
	}
</script>

<div bind:this={containerRef} class="flex flex-col lg:flex-row" class:select-none={isResizing}>
	{#if isMobile.current}
		<!-- Mobile Layout: Stacked -->
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
	{:else}
		<!-- Desktop Layout: Split-pane -->
		<div class="relative h-[85vh] min-w-0 flex-1">
			{@render children()}
		</div>

		<!-- Resize Handle -->
		<div
			role="separator"
			aria-orientation="vertical"
			tabindex="0"
			class="group relative ml-2 w-1 cursor-col-resize bg-border/50 transition-colors hover:bg-primary/50"
			onmousedown={startResize}
		>
			<div
				class="absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
				class:opacity-100={isResizing}
			></div>
		</div>

		<!-- Sidebar -->
		<div class="flex flex-col overflow-hidden" style="width: {sidebarWidth}px;">
			{#if footer}
				<div class="flex-shrink-0 pb-1">
					{@render footer()}
				</div>
			{/if}
			<div class="flex-1 overflow-auto">
				{@render sidebar()}
			</div>
		</div>
	{/if}
</div>
