<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Trash2 } from 'lucide-svelte';

	let {
		onclick,
		label = 'Delete'
	}: {
		onclick?: () => void;
		label?: string;
	} = $props();
</script>

<DropdownMenu.Item {onclick} variant="destructive">
	<Trash2 />
	{label}
</DropdownMenu.Item>
