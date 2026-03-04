<script lang="ts">
	import type { ButtonVariant } from '$lib/components/ui/button';
	import { Button } from '$lib/components/ui/button';
	import { Moon, Sun } from 'lucide-svelte';
	import { mode, toggleMode } from 'mode-watcher';

	let { variant = 'default' }: { variant?: ButtonVariant } = $props();
</script>

<Button
	variant={variant ? variant : 'default'}
	size="icon"
	onclick={toggleMode}
	aria-label="Toggle theme"
>
	{#if mode.current === 'dark'}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
