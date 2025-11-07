<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import { setContext } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Create a context for page header information
	let pageHeader = $state<{
		title?: string;
		description?: string;
		breadcrumbs?: Array<{ name: string; href: string }>;
	}>({});

	setContext('pageHeader', {
		set: (header: typeof pageHeader) => {
			pageHeader = header;
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen">
	<Header {pageHeader} user={data.user} />
	<main
		style="padding-top: var(--header-height, 64px);"
		class="mx-auto max-w-7xl px-4 pt-36 pb-12 sm:px-6 lg:px-8"
	>
		<div class="pt-6">{@render children?.()}</div>
	</main>
	<Footer />
</div>
