<script lang="ts">
	import { gsap } from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	onMount(() => {
		gsap.registerPlugin(ScrollTrigger);

		gsap.to('.box', {
			scrollTrigger: {
				trigger: '.box',
				start: '20px 30%',
				end: 'bottom 100px',
				scrub: true,
				markers: true
			}, // start animation when ".box" enters the viewport
			x: 100,
			rotation: 360
		});
	});
</script>

<div class="h-[200dvh]">
	Lorem ipsum dolor sit amet consectetur adipisicing elit. Commodi repellendus enim, explicabo
	ducimus nesciunt sapiente temporibus magni sequi consequuntur consequatur aliquid? Eaque omnis
	incidunt recusandae explicabo. Atque unde officiis quibusdam!
	<div class="h-96">space!</div>
	<div id="box" class="box size-16 bg-blue-500">Box</div>
</div>
