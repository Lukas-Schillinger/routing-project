<script lang="ts">
	import type { DepotWithLocationJoin } from '$lib/schemas';
	import { Garage } from 'phosphor-svelte';

	let { depot }: { depot: DepotWithLocationJoin } = $props();
</script>

<div class="min-w-48 p-1">
	<div class="flex items-center gap-2 pb-2">
		<Garage class="h-5 w-5 text-primary" />
		<h3 class="text-base font-medium">{depot.depot.name}</h3>
	</div>
	<div>
		<p class="text-sm text-muted-foreground">{depot.location.address_line_1}</p>
		{#if depot.location.city}
			<p class="text-sm text-muted-foreground">
				{depot.location.city}, {depot.location.region || ''}
				{depot.location.postal_code || ''}
			</p>
		{/if}
	</div>
</div>
