<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { formatDate } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Table.Root>
	<Table.Caption>A list of your recent invoices.</Table.Caption>
	<Table.Header>
		<Table.Row>
			<Table.Head class="w-[100px]">Route</Table.Head>
			<Table.Head>{data.routes}</Table.Head>
			<Table.Head>Method</Table.Head>
			<Table.Head class="text-right">Amount</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each data.routes as route}
			<Table.Row>
				<Table.Cell class="font-medium">
					<a class="hover:underline" href={`/routes/${route.id}`}>
						{route.id}
					</a>
				</Table.Cell>
				<Table.Cell>{route.driver_id}</Table.Cell>
				<Table.Cell>{route.map_id}</Table.Cell>
				<Table.Cell class="text-right">{formatDate(route.updated_at)}</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
