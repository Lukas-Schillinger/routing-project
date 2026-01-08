<script lang="ts">
	import type { ButtonVariant } from '$lib/components/ui/button';
	import { Button } from '$lib/components/ui/button';
	import { Moon, Sun } from 'lucide-svelte';
	import { mode, toggleMode } from 'mode-watcher';
	import type { Snippet } from 'svelte';

	let { variant = 'default', children }: { variant?: ButtonVariant; children?: Snippet } = $props();
</script>

<Button
	variant={variant ? variant : 'default'}
	size="sm"
	onclick={toggleMode}
	class="h-9 w-9 p-0"
	aria-label="Toggle theme"
>
	{#if mode.current === 'dark'}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
