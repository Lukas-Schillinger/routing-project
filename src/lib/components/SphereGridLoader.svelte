<script lang="ts">
	interface Props {
		rows?: number;
		cols?: number;
		size?: number; // in pixels
		gap?: number; // in pixels
		color?: string; // tailwind class or css color
		minDuration?: number; // seconds
		maxDuration?: number; // seconds
	}

	let {
		rows = 5,
		cols = 5,
		size = 10,
		gap = 4,
		color = 'bg-primary',
		minDuration = 0.3,
		maxDuration = 3
	}: Props = $props();

	let spheres = $state<{ duration: number; delay: number }[]>([]);

	function getRandom(min: number, max: number) {
		return Math.random() * (max - min) + min;
	}

	$effect(() => {
		spheres = Array.from({ length: rows * cols }, () => ({
			duration: getRandom(minDuration, maxDuration),
			delay: getRandom(0, maxDuration) // Delay can be up to max duration to spread them out
		}));
	});
</script>

<div
	class="grid"
	style="
        grid-template-columns: repeat({cols}, {size}px);
        grid-template-rows: repeat({rows}, {size}px);
        gap: {gap}px;
    "
>
	{#if spheres.length > 0}
		{#each spheres as sphere}
			<div
				class="rounded-full {color}"
				style="
                width: {size}px;
                height: {size}px;
                animation: pulse {sphere.duration}s ease-in-out -{sphere.delay}s infinite;
            "
			></div>
		{/each}
	{:else}
		<!-- Render static placeholders to avoid layout shift before hydration/effect -->
		{#each Array(rows * cols)}
			<div
				class="rounded-full {color} opacity-20"
				style="
                width: {size}px;
                height: {size}px;
            "
			></div>
		{/each}
	{/if}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.2;
			transform: scale(0.85);
		}
		50% {
			opacity: 1;
			transform: scale(1);
		}
	}
</style>
