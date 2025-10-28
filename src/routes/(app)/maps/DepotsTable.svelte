<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover.svelte';
	import { Copy, Delete, MetadataLabel } from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Table from '$lib/components/ui/table';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import { depotApi } from '$lib/services/api/depots';
	import { formatDate } from '$lib/utils';
	import { Building2, MapPin, Pencil } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		depots = $bindable([])
	}: {
		depots: DepotWithLocationJoin[];
	} = $props();

	async function handleDepotSuccess() {
		await invalidateAll();
	}

	async function handleDelete(depot: DepotWithLocationJoin) {
		if (!confirm(`Are you sure you want to delete "${depot.depot.name}"?`)) {
			return;
		}

		try {
			await depotApi.delete(depot.depot.id);
			depots = depots.filter((d) => d.depot.id !== depot.depot.id);
			toast.success('Depot deleted successfully');
		} catch (error) {
			console.error('Error deleting depot:', error);
			toast.error('Failed to delete depot');
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

{#if depots.length === 0}
	<p class="body-medium mb-6 text-center text-muted-foreground">
		Create your first depot to set up a starting location for your routes.
	</p>
{:else}
	<div class="rounded-md border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Address</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Created</Table.Head>
					<Table.Head class="w-[50px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each depots as depot}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<Building2 class="h-4 w-4 text-primary" />
								<span class="font-semibold">{depot.depot.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-start text-sm text-muted-foreground">
								<MapPin class="mt-0.5 mr-2 h-3 w-3 shrink-0" />
								<div>
									<div>{depot.location.address_line1}</div>
									{#if depot.location.city || depot.location.region}
										<div>
											{[depot.location.city, depot.location.region, depot.location.postal_code]
												.filter(Boolean)
												.join(', ')}
										</div>
									{/if}
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if depot.depot.default_depot}
								<Badge variant="default">Default</Badge>
							{:else}
								<Badge variant="outline">Active</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(depot.depot.created_at)}
							</div>
						</Table.Cell>
						<Table.Cell>
							<TableActionsDropdown>
								<EditOrCreateDepotPopover
									triggerClass="w-full"
									mode="edit"
									{depot}
									onSuccess={handleDepotSuccess}
								>
									<DropdownMenu.Item onSelect={(e) => e.preventDefault()} class="w-full">
										<Pencil />
										Edit
									</DropdownMenu.Item>
								</EditOrCreateDepotPopover>
								<Copy onclick={() => copyToClipboard(depot.depot.id)} label="Copy ID" />
								<Delete onclick={() => handleDelete(depot)} />
								<MetadataLabel item={depot.depot} />
							</TableActionsDropdown>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
