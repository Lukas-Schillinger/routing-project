<script lang="ts">
	import { getContext } from 'svelte';
	import type { PageData } from './$types';
	import MapsListRedesign from './redesign/MapsListRedesign.svelte';

	let { data }: { data: PageData } = $props();

	// Set page header in layout context
	const pageHeaderContext = getContext<{ set: (header: any) => void }>('pageHeader');
	pageHeaderContext.set({
		breadcrumbs: [{ name: 'Maps', href: '/maps' }]
	});
</script>

<svelte:head>
	<title>Maps - Routing Project</title>
</svelte:head>

<MapsListRedesign
	maps={data.maps}
	stops={data.stops}
	routes={data.routes}
	drivers={data.drivers}
	depots={data.depots}
/>
