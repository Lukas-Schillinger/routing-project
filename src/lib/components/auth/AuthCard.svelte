<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let { title, description, children, footer }: Props = $props();
</script>

<div class="w-full max-w-[380px]">
	{#if title || description}
		<div class="mb-8 text-center">
			{#if title}
				<h1 class="text-2xl font-medium tracking-tight text-foreground">
					{title}
				</h1>
			{/if}
			{#if description}
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
			{/if}
		</div>
	{/if}

	{@render children()}

	{#if footer}
		<div class="mt-8 text-center">
			{@render footer()}
		</div>
	{/if}
</div>
