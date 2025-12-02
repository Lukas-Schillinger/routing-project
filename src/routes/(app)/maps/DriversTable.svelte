<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import EditOrCreateDriverPopover from '$lib/components/EditOrCreateDriverPopover';
	import { Copy, Delete, MetadataLabel } from '$lib/components/TableActionsDropdown.Items';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import { driverApi } from '$lib/services/api/drivers';
	import { getIdenticon } from '$lib/utils';
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
{:else if false}
	<div class="">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head />
					<Table.Head class="w-[50px]"></Table.Head>
					<Table.Head>Name</Table.Head>
					<Table.Head>Phone</Table.Head>
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
							<Avatar.Root class="size-6">
								<Avatar.Image src={getIdenticon(driver)} alt="avatar" />
								<Avatar.Fallback>CN</Avatar.Fallback>
							</Avatar.Root>
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
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
<div class="grid grid-cols-2 gap-2">
	{#each drivers as driver}
		<EditOrCreateDriverPopover mode="edit" {driver}>
			<Button class="flex w-full justify-between px-2" variant="outline" size="lg">
				<div class="flex items-center gap-2">
					<Avatar.Root class="size-6">
						<Avatar.Image src={getIdenticon(driver)} alt="@shadcn" />
						<Avatar.Fallback>CN</Avatar.Fallback>
					</Avatar.Root>
					{driver.name}
				</div>
				<div class="text-muted-foreground">
					{#if driver.phone}
						<Phone />
					{/if}
				</div>
			</Button>
		</EditOrCreateDriverPopover>
	{/each}
</div>
