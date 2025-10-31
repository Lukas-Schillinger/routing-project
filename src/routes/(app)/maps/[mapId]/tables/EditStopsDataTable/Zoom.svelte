<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Eye } from 'lucide-svelte';

	interface Props {
		stopId: string;
		onZoomToStop: (stopId: string) => void;
	}

	let { stopId, onZoomToStop }: Props = $props();
</script>

<Button onclick={() => onZoomToStop(stopId)} size="icon"><Eye /></Button>
