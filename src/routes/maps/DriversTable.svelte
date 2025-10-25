<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { Phone, Truck, User } from 'lucide-svelte';

	type Driver = {
		id: string;
		organization_id: string;
		name: string;
		phone: string | null;
		notes: string | null;
		active: boolean;
		temporary: boolean;
		created_at: Date;
		updated_at: Date;
	};

	let {
		drivers
	}: {
		drivers: Driver[];
	} = $props();
</script>

{#if drivers.length === 0}
	<p class="body-medium mb-6 text-center text-muted-foreground">
		No drivers yet. Add drivers to assign them to routes.
	</p>
{:else}
	<div class="rounded-md border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Phone</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Created</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each drivers as driver}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center">
								{#if driver.temporary}
									<User class="mr-2 h-4 w-4 text-muted-foreground" />
								{:else}
									<Truck class="mr-2 h-4 w-4 text-primary" />
								{/if}
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
							<div class="flex gap-2">
								{#if driver.active}
									<Badge variant="default">Active</Badge>
								{:else}
									<Badge variant="outline">Inactive</Badge>
								{/if}
								{#if driver.temporary}
									<Badge variant="secondary">Temporary</Badge>
								{/if}
							</div>
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
