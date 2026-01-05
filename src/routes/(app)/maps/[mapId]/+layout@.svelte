<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen">
	<Header user={data.user} />
	<main class="mx-auto px-2 pt-9 pb-12 sm:px-4 xl:px-8">
		{@render children?.()}
	</main>
	<Footer />
</div>
