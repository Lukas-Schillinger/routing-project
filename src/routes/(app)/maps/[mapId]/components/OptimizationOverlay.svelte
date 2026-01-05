<script lang="ts">
	import SphereGridLoader from '$lib/components/SphereGridLoader.svelte';
	import { onDestroy } from 'svelte';

	interface Props {
		startTime?: Date;
	}

	let { startTime = new Date() }: Props = $props();

	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		// Calculate initial elapsed time
		elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

		// Start the timer
		timerInterval = setInterval(() => {
			elapsedSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
		}, 1000);

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
			}
		};
	});

	onDestroy(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
		}
	});
</script>

<div
	class="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
>
	<div class="flex flex-col items-center gap-4">
		<SphereGridLoader rows={4} cols={4} size={12} gap={6} />
		<div class="flex flex-col items-center gap-1">
			<p class="text-sm text-muted-foreground">Optimizing routes...</p>
			<p class="font-mono text-xs text-muted-foreground/70">{formatTime(elapsedSeconds)}</p>
		</div>
	</div>
</div>
