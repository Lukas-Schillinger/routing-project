<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { LocationCreate } from '$lib/schemas';
	import { LoaderCircle, Plus, Trash2 } from 'lucide-svelte';

	let {
		location,
		isLoading = false,
		onCreateStop,
		onDelete
	}: {
		location: LocationCreate;
		isLoading?: boolean;
		onCreateStop: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="min-w-52 space-y-3 p-1">
	<div class="space-y-1">
		<p class="text-sm font-medium">{location.address_line_1}</p>
		{#if location.city || location.region}
			<p class="text-xs text-muted-foreground">
				{[location.city, location.region].filter(Boolean).join(', ')}
			</p>
		{/if}
	</div>

	<div class="flex gap-2">
		<Button
			size="sm"
			class="flex-1"
			disabled={isLoading}
			onclick={onCreateStop}
		>
			{#if isLoading}
				<LoaderCircle class="mr-1 h-3.5 w-3.5 animate-spin" />
				Creating...
			{:else}
				<Plus class="mr-1 h-3.5 w-3.5" />
				Add Stop
			{/if}
		</Button>
		<Button size="sm" variant="ghost" disabled={isLoading} onclick={onDelete}>
			<Trash2 class="h-3.5 w-3.5" />
		</Button>
	</div>
</div>
