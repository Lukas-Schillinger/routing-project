<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Route } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { ArrowRight } from 'lucide-svelte';
	import JSONData from './landing-data.json';
	import RouteAnimation from './RouteAnimation.svelte';

	const data = JSONData as unknown as { route: Route; stops: StopWithLocation[] };
</script>

<div
	class="px-2 text-center font-serif text-7xl leading-none tracking-normal sm:px-0 sm:text-8xl sm:leading-tight md:text-9xl"
>
	<div>Effortless routes</div>
	<div>from</div>
	<div>start <span class="italic">to</span> finish</div>
</div>
<div class="px-0 py-4 text-center text-2xl font-extralight sm:px-18 md:px-36">
	Multi stop route optimization in seconds. Share routes with your team and track progress in
	real-time.
</div>
<div class="flex justify-center">
	<Button class="flex justify-between gap-8 bg-foreground" href="/auth/register">
		Start your first map
		<ArrowRight />
	</Button>
</div>
<div class="pt-12 sm:pt-18">
	<div class="relative flex justify-center">
		<div class="h-96 w-full max-w-[700px] px-2 sm:px-0">
			<RouteAnimation stops={data.stops} route={data.route} />
		</div>
		<div
			class="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
			aria-hidden="true"
		>
			<div
				class="size-64 rounded-full"
				style="
	                    background: #064314;
	                    box-shadow: 0px 0px 168px 100px rgba(6,67,20,0.9);
	                    "
			></div>
		</div>
	</div>
</div>
