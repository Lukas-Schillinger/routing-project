<!-- @component Settings action component for route settings -->
<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Settings } from 'lucide-svelte';

	interface Props {
		onclick?: () => void;
		disabled?: boolean;
	}

	let { onclick, disabled = false }: Props = $props();
</script>

<DropdownMenu.Item {disabled} {onclick}>
	<Settings class="mr-2 h-4 w-4" />
	Settings
</DropdownMenu.Item>
