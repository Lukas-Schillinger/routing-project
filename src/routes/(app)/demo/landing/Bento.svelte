<script>
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
</script>

<div class="grid grid-cols-5 grid-rows-4">
	<div class="col-span-3 row-span-4 border p-8">
		<div class="text-7xl font-medium">Find the best route every time</div>
		<div class="pt-2 text-2xl font-extralight">
			Optimize routes between up to 14 drivers and 100 stops
		</div>
		<div class="pt-4">
			<div class="font-serif text-lg italic">need more?</div>
			<Button class="flex justify-between gap-8">
				contact us
				<ArrowRight />
			</Button>
		</div>
	</div>
	<div
		class="col-span-2 col-start-4 row-span-2 border border-b-0 border-l-0 p-8 text-xl font-medium tracking-tighter"
	>
		<span class="text-9xl font-medium tracking-tighter">14</span> <span>drivers</span>
	</div>
	<div
		class="col-span-2 col-start-4 row-span-2 row-start-3 border border-l-0 p-8 text-xl font-medium tracking-tighter"
	>
		<span class="text-9xl font-medium tracking-tighter">100</span> <span>stops</span>
	</div>
</div>
