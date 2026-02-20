<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher, mode } from 'mode-watcher';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="theme-color"
		content={mode.current === 'dark' ? '#232323' : '#fffbf4'}
	/>
</svelte:head>

<ModeWatcher />
<Toaster />

{@render children?.()}
