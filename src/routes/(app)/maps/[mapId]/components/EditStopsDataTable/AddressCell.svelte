<script lang="ts">
	import type { Location } from '$lib/schemas/location';

	type Props = {
		location: Location;
	};

	let { location }: Props = $props();

	const addressLine2 = $derived(
		[location.city, location.region, location.postal_code]
			.filter(Boolean)
			.join(', ')
	);
</script>

<div class="flex min-w-0 items-start">
	<div class="min-w-0 text-sm">
		<div class="truncate font-medium">{location.address_line_1}</div>
		{#if addressLine2}
			<div class="truncate text-muted-foreground">{addressLine2}</div>
		{/if}
	</div>
</div>
