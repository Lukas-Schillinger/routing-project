<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { AuthLayout } from '$lib/components/auth';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import '../../../app.css';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<Toaster />

<AuthLayout>
	{@render children?.()}
</AuthLayout>
