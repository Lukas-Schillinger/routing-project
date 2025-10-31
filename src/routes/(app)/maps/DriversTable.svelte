<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover.svelte';
	import { Copy, Delete, MetadataLabel } from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import { driverApi } from '$lib/services/api/drivers';
	import { formatDate } from '$lib/utils';
	import { Pencil, Phone, Truck } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		drivers = $bindable([])
	}: {
		drivers: Driver[];
	} = $props();

	async function handleDriverSuccess() {
		await invalidateAll();
	}

	async function handleDelete(driver: Driver) {
		if (!confirm(`Are you sure you want to delete "${driver.name}"?`)) {
			return;
		}

		try {
			await driverApi.delete(driver.id);
			drivers = drivers.filter((d) => d.id !== driver.id);
			toast.success('Driver deleted successfully');
		} catch (error) {
			console.error('Error deleting driver:', error);
			toast.error('Failed to delete driver');
		}
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
	}
</script>

{#if drivers.length === 0}
	<Empty.Root>
		<Empty.Media variant="icon">
			<Truck />
		</Empty.Media>
		<Empty.Content>
			<Empty.Title>No drivers yet</Empty.Title>
			<Empty.Description>Add drivers to assign them to routes.</Empty.Description>
		</Empty.Content>
	</Empty.Root>
{:else}
	<div class="">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[50px]"></Table.Head>
					<Table.Head>Name</Table.Head>
					<Table.Head>Phone</Table.Head>
					<Table.Head>Created</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each drivers as driver}
					<Table.Row>
						<Table.Cell>
							<TableActionsDropdown>
								<EditOrCreateDriverPopover
									triggerClass="w-full"
									mode="edit"
									{driver}
									onSuccess={handleDriverSuccess}
								>
									<DropdownMenu.Item onSelect={(e) => e.preventDefault()} class="w-full">
										<Pencil />
										Edit
									</DropdownMenu.Item>
								</EditOrCreateDriverPopover>
								<Copy onclick={() => copyToClipboard(driver.id)} label="Copy ID" />
								<Delete onclick={() => handleDelete(driver)} />
								<MetadataLabel item={driver} />
							</TableActionsDropdown>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center">
								<span class="font-semibold">{driver.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if driver.phone}
								<div class="flex items-center text-sm text-muted-foreground">
									<Phone class="mr-2 h-3 w-3 shrink-0" />
									<span>{driver.phone}</span>
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(driver.created_at)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
