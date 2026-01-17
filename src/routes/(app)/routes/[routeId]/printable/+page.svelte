<!-- @component Printable route page -->
<script lang="ts">
	import PrintableRoute from '$lib/components/PrintableRoute.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as Select from '$lib/components/ui/select';
	import { Map, Printer, Route } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { map, stops, driver, route } = $derived(data);

	let mapsProvider = $state<'google' | 'apple'>('google');

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>Wend | Print route - {driver?.name || 'Driver'} | {map.title}</title>
</svelte:head>

<!-- Print Controls (hidden when printing) -->
<div
	class="print-controls fixed top-4 right-4 z-50 flex items-center gap-2 rounded border bg-background p-2 print:hidden"
>
	<Select.Root type="single" bind:value={mapsProvider}>
		<Select.Trigger class="w-40">
			{mapsProvider === 'google' ? 'Google Maps' : 'Apple Maps'}
		</Select.Trigger>
		<Select.Content>
			<Select.Item value="google">Google Maps</Select.Item>
			<Select.Item value="apple">Apple Maps</Select.Item>
		</Select.Content>
	</Select.Root>
	<Button onclick={handlePrint}>
		<Printer class="h-4 w-4" />
		Print
	</Button>
	<Button href="/routes/{route.id}">
		<Route />
		Route
	</Button>
	{#if data.permissions.includes('resources:read')}
		<Button href="/maps/{map.id}">
			<Map />
			Map
		</Button>
	{/if}
</div>

<!-- Printable Content -->
<main class="print-content mx-auto max-w-4xl p-8 print:max-w-none print:p-0">
	<PrintableRoute {route} {stops} {driver} {map} {mapsProvider} />
</main>

<style>
	@media print {
		:global(body) {
			margin: 0;
			padding: 0;
		}

		.print-content {
			padding: 0.5in;
		}

		@page {
			margin: 0in;
		}
	}
</style>
