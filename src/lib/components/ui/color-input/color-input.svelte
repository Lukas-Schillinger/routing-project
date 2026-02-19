<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type Props = WithElementRef<Omit<HTMLInputAttributes, 'type'>>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...restProps
	}: Props = $props();
</script>

<input
	bind:this={ref}
	data-slot="color-input"
	type="color"
	class={cn(
		'h-9 w-9 shrink-0 cursor-pointer appearance-none rounded-md border-none bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-color-swatch]:rounded [&::-moz-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none',
		className
	)}
	bind:value
	{...restProps}
/>
