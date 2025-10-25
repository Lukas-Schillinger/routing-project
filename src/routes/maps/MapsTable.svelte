<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import { Calendar, Map, Plus } from 'lucide-svelte';

	type MapWithStops = {
		id: string;
		title: string;
		numStops: number;
		created_at: Date;
		updated_at: Date;
	};

	let {
		maps
	}: {
		maps: MapWithStops[];
	} = $props();
</script>

{#if maps.length === 0}
	<Card>
		<CardContent class="flex flex-col items-center justify-center py-16">
			<Map class="mb-4 h-16 w-16 text-muted-foreground" />
			<h3 class="headline-small mb-2">No Maps Yet</h3>
			<p class="body-medium mb-6 text-center text-muted-foreground">
				Get started by uploading a CSV file with addresses to create your first map.
			</p>
			<Button href="/demo/csv">
				<Plus class="mr-2 h-4 w-4" />
				Upload CSV
			</Button>
		</CardContent>
	</Card>
{:else}
	<div class="rounded-md border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Title</Table.Head>
					<Table.Head># Stops</Table.Head>
					<Table.Head>Created</Table.Head>
					<Table.Head>Updated</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each maps as map}
					<Table.Row>
						<Table.Cell>
							<a href="/maps/{map.id}" class="flex items-center hover:underline">
								<Map class="mr-2 h-4 w-4 text-primary" />
								<span class="font-semibold">{map.title}</span>
							</a>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center text-sm text-muted-foreground">
								{map.numStops}
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center text-sm text-muted-foreground">
								<Calendar class="mr-2 h-3 w-3" />
								{formatDate(map.created_at)}
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="text-sm text-muted-foreground">
								{formatDate(map.updated_at)}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
{/if}
