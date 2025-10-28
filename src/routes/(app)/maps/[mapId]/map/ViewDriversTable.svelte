<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import { Check, Phone, Truck } from 'lucide-svelte';

	interface Props {
		assignedDrivers: Driver[];
		isOptimized: boolean;
	}

	let { assignedDrivers, isOptimized }: Props = $props();
</script>

{#if assignedDrivers.length > 0}
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Driver</Table.Head>
					<Table.Head>Phone</Table.Head>
					<Table.Head>Type</Table.Head>
					<Table.Head>Stops</Table.Head>
					<Table.Head class="text-right">Status</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each assignedDrivers as driver}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center">
								<Truck class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
								<span class="font-semibold">{driver.name || 'Unassigned'}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							{#if driver.phone}
								<div class="flex items-center text-sm">
									<Phone class="mr-2 h-3 w-3 text-primary" />
									{driver.phone}
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if driver.temporary}
								<Badge variant="secondary">Temporary</Badge>
							{:else}
								<Badge variant="outline">Permanent</Badge>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm text-muted-foreground"> 0 stops </span>
						</Table.Cell>
						<Table.Cell class="text-right">
							{#if isOptimized}
								<Badge variant="default" class="bg-green-600">
									<Check class="mr-1 h-3 w-3" />
									Optimized
								</Badge>
							{:else}
								<Badge variant="outline">Not Optimized</Badge>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center py-8 text-center">
		<Truck class="mb-2 h-12 w-12 text-muted-foreground" />
		<p class="text-sm text-muted-foreground">No drivers assigned yet</p>
	</div>
{/if}
