<script lang="ts">
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import { onMount } from 'svelte';
	gsap.registerPlugin(ScrollTrigger);

	let section: HTMLElement;
	let box: HTMLDivElement;

	onMount(() => {
		gsap.to(box, {
			rotation: 720,
			ease: 'none',
			scrollTrigger: {
				trigger: section,
				start: 'top top',
				end: 'bottom top', // finish when section's bottom hits viewport bottom
				pin: true,
				scrub: true,
				markers: true
			}
		});
	});
</script>

<section bind:this={section} class="flex h-[150vh] items-center justify-center">
	<div bind:this={box} class="size-24 bg-red-600"></div>
</section>
