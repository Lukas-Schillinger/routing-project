<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Pencil } from 'lucide-svelte';

	let {
		onclick,
		href,
		label = 'Edit'
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
			<Pencil />
			{label}
		</DropdownMenu.Item>
	</a>
{:else}
	<DropdownMenu.Item {onclick}>
		<Pencil />
		{label}
	</DropdownMenu.Item>
{/if}
