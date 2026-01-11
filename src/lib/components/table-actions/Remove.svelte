<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { UserMinus } from 'lucide-svelte';

	let {
		onclick,
		label = 'Remove'
	}: {
		onclick?: () => void;
		label?: string;
	} = $props();
</script>

<DropdownMenu.Item {onclick}>
	<UserMinus />
	{label}
</DropdownMenu.Item>
