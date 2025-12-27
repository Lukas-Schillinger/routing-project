<!-- @component Collapsible table for a single driver's stops -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Table from '$lib/components/ui/table';
	import type { Driver } from '$lib/schemas/driver';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { ChevronRight, Eye, MapPin, Phone } from 'lucide-svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		driver: Driver;
		stops: StopWithLocation[];
		onFocusStop: (stopId: string) => void;
	}

	let { driver, stops, onFocusStop }: Props = $props();

	let open = $state(true);
</script>

<Collapsible.Root bind:open class="w-full">
	<div class="flex items-center gap-2">
		<Collapsible.Trigger class="w-full">
			<Button class="flex w-full justify-between" variant="outline" size="sm">
				<div class="flex items-center gap-2">
					<ChevronRight
						class="size-4 transition-transform duration-200 ease-out {open ? 'rotate-90' : ''}"
					/>
					{driver.name}
				</div>
				<div class="text-muted-foreground">
					{#if driver.temporary}
						<Badge variant="secondary" class="text-xs">Temporary</Badge>
					{/if}
					{#if driver.phone}
						<span class="flex items-center gap-1">
							<Phone class="h-3 w-3" />
							{driver.phone}
						</span>
					{/if}
					<span class="flex items-center gap-1">
						<MapPin class="size-3" />
						{stops.length} stop{stops.length !== 1 ? 's' : ''}
					</span>
				</div>
			</Button>
		</Collapsible.Trigger>
	</div>
	<div>
		<Collapsible.Content forceMount class="w-full overflow-scroll px-2">
			{#snippet child({ props, open: isOpen })}
				{#if isOpen}
					<div {...props} transition:slide>
						<Table.Root class="w-full">
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-12">#</Table.Head>
									<Table.Head>Contact</Table.Head>
									<Table.Head>Address</Table.Head>
									<Table.Head>Phone</Table.Head>
									<Table.Head>Notes</Table.Head>
									<Table.Head></Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each stops as { stop, location }, index}
									<Table.Row>
										<Table.Cell class="font-medium text-muted-foreground">
											{stop.delivery_index !== null ? stop.delivery_index : index}
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center">
												<span class="font-semibold">{stop.contact_name || '—'}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-start">
												<div class="text-sm">
													<div class="font-medium">
														{location.address_line_1}
													</div>
													<div class="text-muted-foreground">
														{location.city || ''}{location.city && location.region
															? ', '
															: ''}{location.region || ''}
														{location.postal_code || ''}
													</div>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											{#if stop.contact_phone}
												<div class="flex items-center text-sm">
													{stop.contact_phone}
												</div>
											{:else}
												<span class="text-sm text-muted-foreground">—</span>
											{/if}
										</Table.Cell>
										<Table.Cell>
											{#if stop.notes}
												<div class="max-w-[200px] truncate text-sm" title={stop.notes}>
													{stop.notes}
												</div>
											{:else}
												<span class="text-sm text-muted-foreground">—</span>
											{/if}
										</Table.Cell>
										<Table.Cell>
											<Button onclick={() => onFocusStop(stop.id)} size="icon" variant="ghost">
												<Eye />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			{/snippet}
		</Collapsible.Content>
	</div>
</Collapsible.Root>
