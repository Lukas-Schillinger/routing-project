<script lang="ts">
	import type { Location } from '$lib/schemas/location';

	interface Props {
		location: Location;
	}

	let { location }: Props = $props();

	const addressLine2 = $derived(
		[location.city, location.region, location.postal_code]
			.filter(Boolean)
			.join(', ')
	);
</script>

<div class="flex items-start">
	<div class="text-sm">
		<div class="font-medium">{location.address_line_1}</div>
		{#if addressLine2}
			<div class="text-muted-foreground">{addressLine2}</div>
		{/if}
	</div>
</div>
