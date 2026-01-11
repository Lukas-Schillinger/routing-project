<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Eye } from 'lucide-svelte';

	let {
		onclick,
		href,
		label = 'Zoom'
	}: {
		onclick?: () => void;
		href?: string;
		label?: string;
	} = $props();
</script>

{#if href}
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href}>
		<DropdownMenu.Item>
			<Eye />
			{label}
		</DropdownMenu.Item>
	</a>
{:else}
	<DropdownMenu.Item {onclick}>
		<Eye />
		{label}
	</DropdownMenu.Item>
{/if}
