<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Copy as CopyIcon } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		onclick,
		label = 'Copy'
	}: {
		onclick?: () => void;
		label?: string;
	} = $props();

	const handleClick = () => {
		onclick?.();
		toast.success('Copied to clipboard');
	};
</script>

<DropdownMenu.Item onclick={handleClick}>
	<CopyIcon />
	{label}
</DropdownMenu.Item>
