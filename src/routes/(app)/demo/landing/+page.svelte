<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';
	import Bento from './Bento.svelte';
	import RouteAnimation from './RouteAnimation.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex justify-center">
	<div class=" max-w-4xl">
		<div class="pt-24 text-center font-serif text-9xl leading-tight">
			<div>Effortless routes</div>
			<div>from</div>
			<div>start <span class="italic">to</span> finish</div>
		</div>
		<div class="px-36 py-4 text-center text-2xl font-extralight">
			Multi stop route optimization in seconds. Share routes with your team and track progress in
			real-time.
		</div>
		<div class="flex justify-center">
			<Button class="flex justify-between gap-8 bg-foreground">
				Start your first map
				<ArrowRight />
			</Button>
		</div>
		<div class="relative flex justify-center py-24">
			<div class="h-96 w-full max-w-[900px]">
				<RouteAnimation stops={data.stops} route={data.route} />
			</div>
			<div
				class="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
				aria-hidden="true"
			>
				<div
					class="size-48 rounded-full"
					style="
                    background: #064314;
                    box-shadow: 0px 0px 168px 100px rgba(6,67,20,0.9);
                    "
				></div>
			</div>
		</div>
		<Bento />
	</div>
</div>
