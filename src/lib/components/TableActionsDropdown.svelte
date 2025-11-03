<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Ellipsis } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		align = 'end',
		trigger,
		triggerClass = 'flex h-8 w-8 items-center justify-center rounded-md p-0 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'
	}: {
		children: Snippet;
		align?: 'start' | 'center' | 'end';
		trigger?: Snippet;
		triggerClass?: string;
	} = $props();
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={triggerClass}>
		{#if trigger}
			{@render trigger()}
		{:else}
			<span class="sr-only">Open menu</span>
			<Ellipsis class="h-4 w-4" />
		{/if}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content {align}>
		{@render children()}
	</DropdownMenu.Content>
</DropdownMenu.Root>
