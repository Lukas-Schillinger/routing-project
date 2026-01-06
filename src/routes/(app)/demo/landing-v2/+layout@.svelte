<script lang="ts">
	import type { PageData } from './$types';

	let { children }: PageData = $props();
</script>

{@render children()}
