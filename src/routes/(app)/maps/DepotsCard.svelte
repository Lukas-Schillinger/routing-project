<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import { depotApi } from '$lib/services/api/depots';
	import { Building2, MapPin, Plus, Star } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let { depots = $bindable([]) }: { depots: DepotWithLocationJoin[] } =
		$props();

	async function handleDepotSuccess() {
		await invalidateAll();
	}

	async function handleDelete(depot: DepotWithLocationJoin) {
		await depotApi.delete(depot.depot.id);
		depots = depots.filter((d) => d.depot.id !== depot.depot.id);
		toast.success('Depot deleted');
	}

	function formatAddress(depot: DepotWithLocationJoin): string {
		const parts = [
			depot.location.address_line_1,
			depot.location.city,
			depot.location.region
		].filter(Boolean);
		return parts.join(', ');
	}
</script>

<div class="overflow-hidden rounded-lg border border-border/50 bg-card">
	<!-- Header -->
	<div
		class="flex items-center justify-between border-b border-border/50 px-4 py-3"
	>
		<div class="flex items-center gap-2">
			<Building2 class="h-4 w-4 text-muted-foreground" />
			<h3 class="text-sm font-medium">Depots</h3>
			{#if depots.length > 0}
				<Badge variant="secondary" class="ml-1 h-5 px-1.5 text-xs">
					{depots.length}
				</Badge>
			{/if}
		</div>
		<EditOrCreateDepotPopover mode="create" onSuccess={handleDepotSuccess}>
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7"
				aria-label="Add depot"
			>
				<Plus class="h-4 w-4" />
			</Button>
		</EditOrCreateDepotPopover>
	</div>

	<!-- Content -->
	<div class="p-2">
		{#if depots.length === 0}
			<div class="flex flex-col items-center justify-center py-8 text-center">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
				>
					<Building2 class="h-5 w-5 text-muted-foreground" />
				</div>
				<p class="mt-3 text-sm font-medium">No depots yet</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Create a depot as a starting location for routes
				</p>
				<EditOrCreateDepotPopover mode="create" onSuccess={handleDepotSuccess}>
					<Button variant="outline" size="sm" class="mt-3 gap-1">
						<Plus class="h-3.5 w-3.5" />
						Add Depot
					</Button>
				</EditOrCreateDepotPopover>
			</div>
		{:else}
			<div
				class="flex flex-col gap-2 sm:grid sm:grid-cols-2 md:flex md:flex-col"
			>
				{#each depots as depot (depot.depot.id)}
					<EditOrCreateDepotPopover
						triggerClass="block w-full min-w-0 overflow-hidden"
						mode="edit"
						{depot}
						onSuccess={handleDepotSuccess}
						onDelete={() => handleDelete(depot)}
					>
						<button
							type="button"
							class="group flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/50"
						>
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted"
							>
								{#if depot.depot.default_depot}
									<Star class="h-4 w-4 text-primary" aria-hidden="true" />
								{:else}
									<MapPin
										class="h-4 w-4 text-muted-foreground"
										aria-hidden="true"
									/>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
									<p class="text-sm font-medium">{depot.depot.name}</p>
									{#if depot.depot.default_depot}
										<Badge variant="secondary" class="h-4 px-1 text-[10px]"
											>Default</Badge
										>
									{/if}
								</div>
								<p class="text-xs text-muted-foreground">
									{formatAddress(depot)}
								</p>
							</div>
						</button>
					</EditOrCreateDepotPopover>
				{/each}
			</div>

			{#if depots.length > 4}
				<p
					class="mt-2 border-t border-border/50 pt-2 text-center text-xs text-muted-foreground"
				>
					{depots.length - 4} more depot{depots.length - 4 !== 1 ? 's' : ''}
				</p>
			{/if}
		{/if}
	</div>
</div>
