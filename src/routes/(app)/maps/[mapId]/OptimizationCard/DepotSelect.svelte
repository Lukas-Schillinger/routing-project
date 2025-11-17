<script lang="ts">
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import * as Select from '$lib/components/ui/select';
	import type { Depot, DepotWithLocationJoin } from '$lib/schemas';
	import { Building2 } from 'lucide-svelte';

	interface Props {
		depots: DepotWithLocationJoin[];
		selectedDepotId: string | undefined;
		onDepotCreated: (depot: Depot) => void;
	}

	let { depots, selectedDepotId = $bindable(), onDepotCreated }: Props = $props();

	function handleDepotCreated(depot: DepotWithLocationJoin) {
		selectedDepotId = depot.depot.id;
		onDepotCreated(depot.depot);
	}
</script>

<div class="flex gap-2">
	<Select.Root type="single" bind:value={selectedDepotId}>
		<Select.Trigger id="depot-select" class="w-full">
			{#if selectedDepotId}
				{@const selectedDepot = depots.find((d) => d.depot.id === selectedDepotId)}
				{#if selectedDepot}
					<div class="flex items-center gap-2">
						<Building2 class="h-4 w-4" />
						<span>{selectedDepot.depot.name}</span>
					</div>
				{/if}
			{:else if depots.length == 0}
				<span class="text-muted-foreground">No depots</span>
			{:else}
				<span class="text-muted-foreground">Select a depot</span>
			{/if}
		</Select.Trigger>
		<Select.Content>
			{#each depots as depot}
				<Select.Item value={depot.depot.id}>
					<div class="flex items-center gap-2">
						<Building2 class="h-4 w-4" />
						<div>
							<div class="font-medium">{depot.depot.name}</div>
							<div class="text-xs text-muted-foreground">
								{depot.location.address_line_1}
							</div>
						</div>
						{#if depot.depot.default_depot}
							<span class="ml-auto text-xs text-primary">(Default)</span>
						{/if}
					</div>
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
	<EditOrCreateDepotPopover mode="create" onSuccess={handleDepotCreated} />
</div>
