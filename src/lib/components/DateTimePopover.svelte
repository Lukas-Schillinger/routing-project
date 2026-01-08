<script lang="ts">
	import * as Popover from '$lib/components/ui/popover/index.js';
	import type { Snippet } from 'svelte';

	let {
		item,
		children
	}: { item: { created_at: Date; updated_at: Date }; children: Snippet } =
		$props();
</script>

<Popover.Root>
	<Popover.Trigger>
		{#if children}
			{@render children()}
		{:else}
			trigger
		{/if}
	</Popover.Trigger>
	<Popover.Content>
		<div class="text-sm">
			<div>
				<span class="text-muted-foreground">updated</span>
				{item.updated_at.toDateString()}
				{item.updated_at.toLocaleTimeString()}
			</div>
			<div>
				<span class="text-muted-foreground">created</span>
				{item.updated_at.toDateString()}
				{item.created_at.toLocaleTimeString()}
			</div>
		</div>
	</Popover.Content>
</Popover.Root>
