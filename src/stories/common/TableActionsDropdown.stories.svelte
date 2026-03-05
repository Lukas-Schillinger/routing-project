<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TableActionsDropdown from '$lib/components/TableActionsDropdown.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const { Story } = defineMeta({
		title: 'Common/TableActionsDropdown',
		component: TableActionsDropdown
	});
</script>

<Story name="Default">
	<div class="flex justify-center p-8">
		<TableActionsDropdown>
			<DropdownMenu.Item>
				<Pencil class="mr-2 h-4 w-4" />
				Edit
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				<Copy class="mr-2 h-4 w-4" />
				Duplicate
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item class="text-destructive">
				<Trash2 class="mr-2 h-4 w-4" />
				Delete
			</DropdownMenu.Item>
		</TableActionsDropdown>
	</div>
</Story>

<Story name="Align Start">
	<div class="flex justify-center p-8">
		<TableActionsDropdown align="start">
			<DropdownMenu.Item>View details</DropdownMenu.Item>
			<DropdownMenu.Item>Export</DropdownMenu.Item>
		</TableActionsDropdown>
	</div>
</Story>
