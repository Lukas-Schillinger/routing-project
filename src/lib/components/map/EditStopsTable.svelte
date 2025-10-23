<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { FileText, MapPin, Phone, User } from 'lucide-svelte';

	interface Props {
		stops: StopWithLocation[];
	}

	let { stops }: Props = $props();
</script>

{#if stops.length === 0}
	<Card.Root>
		<Card.Content class="flex flex-col items-center justify-center py-16">
			<MapPin class="mb-4 h-16 w-16 text-muted-foreground" />
			<h3 class="headline-small mb-2">No Stops Yet</h3>
			<p class="body-medium text-center text-muted-foreground">
				Upload a CSV file to add stops to this map.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="rounded-md border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Contact</Table.Head>
					<Table.Head>Address</Table.Head>
					<Table.Head>Coordinates</Table.Head>
					<Table.Head>Confidence</Table.Head>
					<Table.Head>Phone</Table.Head>
					<Table.Head>Notes</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each stops as { stop, location }}
					<Table.Row>
						<Table.Cell>
							<div class="flex items-center">
								<User class="mr-2 h-4 w-4 flex-shrink-0 text-primary" />
								<span class="font-semibold">{stop.contact_name || '—'}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-start">
								<MapPin class="mt-0.5 mr-2 h-4 w-4 flex-shrink-0 text-primary" />
								<div class="text-sm">
									<div class="font-medium">{location.address_line1}</div>
									<div class="text-muted-foreground">
										{location.city || ''}{location.city && location.region
											? ', '
											: ''}{location.region || ''}
										{location.postal_code || ''}
									</div>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell class="font-mono text-sm">
							{location.lat && location.lon
								? `${parseFloat(location.lat).toFixed(6)}, ${parseFloat(location.lon).toFixed(6)}`
								: 'N/A'}
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline">
								{location.geocode_confidence
									? parseFloat(location.geocode_confidence).toFixed(1)
									: 'N/A'}%
							</Badge>
						</Table.Cell>
						<Table.Cell>
							{#if stop.contact_phone}
								<div class="flex items-center text-sm">
									<Phone class="mr-2 h-3 w-3 text-primary" />
									{stop.contact_phone}
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">—</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if stop.notes}
								<div class="flex items-start text-sm">
									<FileText class="mt-0.5 mr-2 h-3 w-3 text-primary" />
									<span class="max-w-[200px] truncate">{stop.notes}</span>
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
