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

<div class="w-full max-w-95">
	{#if title || description}
		<div class="mb-6 text-center sm:mb-8">
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
		<div class="mt-6 text-center sm:mt-8">
			{@render footer()}
		</div>
	{/if}
</div>
