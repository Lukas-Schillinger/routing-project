<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDepotPopover from '$lib/components/EditOrCreateDepotPopover';
	import { Copy, Delete, MetadataLabel } from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import type { DepotWithLocationJoin } from '$lib/schemas/depot';
	import { depotApi } from '$lib/services/api/depots';
	import { formatDate } from '$lib/utils';
	import { Building2, Pencil } from 'lucide-svelte';
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
	<Empty.Root>
		<Empty.Media variant="icon">
			<Building2 />
		</Empty.Media>
		<Empty.Content>
			<Empty.Title>No depots yet</Empty.Title>
			<Empty.Description>
				Create your first depot to set up a starting location for your routes.
			</Empty.Description>
		</Empty.Content>
	</Empty.Root>
{:else}
	<div class="">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[50px]"></Table.Head>
					<Table.Head>Name</Table.Head>
					<Table.Head>Address</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Created</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each depots as depot}
					<Table.Row>
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
						<Table.Cell>
							<div class="flex items-center gap-2">
								<span class="font-semibold">{depot.depot.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-start text-sm text-muted-foreground">
								<div>
									<div>{depot.location.address_line_1}</div>
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
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(depot.depot.created_at)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
