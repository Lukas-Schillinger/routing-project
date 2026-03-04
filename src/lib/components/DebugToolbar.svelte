<script lang="ts">
	import { dev } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import Bug from '@lucide/svelte/icons/bug';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		title?: string;
		position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
		showInProd?: boolean;
	}

	let {
		children,
		title = 'Debug',
		position = 'bottom-right',
		showInProd = false
	}: Props = $props();

	let isOpen = $state(false);
	let isMinimized = $state(false);

	const positionClasses: Record<string, string> = {
		'bottom-left': 'bottom-4 left-4',
		'bottom-right': 'bottom-4 right-4',
		'top-left': 'top-4 left-4',
		'top-right': 'top-4 right-4'
	};

	// Only show in dev mode unless explicitly allowed in prod
	let shouldShow = $derived(dev || showInProd);
</script>

{#if shouldShow}
	<div
		class="pointer-events-auto fixed isolate z-[9999] {positionClasses[
			position
		]}"
	>
		{#if !isOpen}
			<Button
				variant="outline"
				size="icon"
				class="h-10 w-10 rounded-full border-dashed border-orange-500/50 bg-background/95 shadow-lg backdrop-blur-sm hover:border-orange-500 hover:bg-orange-500/10"
				onclick={() => (isOpen = true)}
			>
				<Bug class="h-5 w-5 text-orange-500" />
			</Button>
		{:else}
			<div
				class="min-w-64 rounded-lg border border-dashed border-orange-500/50 bg-background/95 shadow-xl backdrop-blur-sm"
			>
				<div
					class="flex items-center justify-between border-b border-orange-500/30 px-3 py-2"
				>
					<div class="flex items-center gap-2">
						<Bug class="h-4 w-4 text-orange-500" />
						<span class="text-sm font-medium text-orange-500">{title}</span>
					</div>
					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							class="h-6 w-6 text-muted-foreground hover:text-foreground"
							onclick={() => (isMinimized = !isMinimized)}
						>
							{#if isMinimized}
								<ChevronUp class="h-4 w-4" />
							{:else}
								<ChevronDown class="h-4 w-4" />
							{/if}
						</Button>
						<Button
							variant="ghost"
							size="icon"
							class="h-6 w-6 text-muted-foreground hover:text-foreground"
							onclick={() => (isOpen = false)}
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				</div>
				{#if !isMinimized}
					<div class="p-3">
						{@render children()}
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}
