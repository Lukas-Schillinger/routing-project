<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { MoveUpRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type $$Props = {
		href?: string;
		label?: string;
		class?: string;
		children?: Snippet;
	};

	let {
		href = '/our-listings',
		label = 'Find More Listings',
		class: className,
		children,
		...restProps
	}: $$Props = $props();
</script>

<a
	{href}
	class={cn(
		'group inline-flex items-center rounded-md bg-primary px-4 py-1 text-primary-foreground transition-colors duration-300 ease-in-out hover:bg-secondary hover:text-secondary-foreground',
		className
	)}
	aria-label={label}
	{...restProps}
>
	{#if children}
		{@render children()}
	{:else}
		<span class="shrink-0">{label}</span>
	{/if}

	<span
		class="relative h-[1em] w-0 overflow-hidden text-secondary-foreground transition-all duration-300 ease-in-out group-hover:w-[2em]"
	>
		<MoveUpRight
			class="absolute inset-y-0 right-0 h-full scale-0 transition-all duration-300 group-hover:scale-150"
		/>
	</span>
</a>
