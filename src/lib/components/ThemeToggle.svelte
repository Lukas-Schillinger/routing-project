<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Moon, Sun } from 'lucide-svelte';
	import { mode, toggleMode } from 'mode-watcher';

	let { variant = 'default' }: { variant?: 'default' | 'inverse' } = $props();
</script>

<Button
	variant="ghost"
	size="sm"
	onclick={toggleMode}
	class="h-9 w-9 p-0 {variant === 'inverse' ? '' : ''}"
	aria-label="Toggle theme"
>
	{#if mode.current === 'dark'}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
