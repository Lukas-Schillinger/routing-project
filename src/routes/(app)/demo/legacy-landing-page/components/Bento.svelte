<script>
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
</script>

<div class="flex">
	<div
		class="bg-texture hidden min-w-6 flex-1 border border-r-0 sm:border-l-0 md:block"
	>
		&nbsp;
	</div>
	<div class="grid grid-cols-2 md:grid-cols-5 md:grid-rows-4">
		<div
			class="col-span-2 border border-b-0 p-8 md:col-span-3 md:row-span-4 md:border-b"
		>
			<div class="text-5xl md:text-6xl">Find the best route every time</div>
			<div class="pt-2 text-xl font-extralight md:text-2xl">
				Optimize routes between up to 14 drivers and 100 stops
			</div>
			<div class="pt-4">
				<div class="font-serif text-lg italic md:text-xl">need more?</div>
				<Button class="flex justify-between gap-8">
					contact us
					<ArrowRight />
				</Button>
			</div>
		</div>
		<div
			class="col-span-1 flex justify-center border border-l p-8 text-xl font-medium tracking-tighter sm:border-l-0 md:col-span-2 md:col-start-4 md:row-span-2 md:items-center md:justify-start md:border-b-0"
		>
			<div
				class="flex flex-col items-center gap-0 md:flex-row md:items-baseline md:justify-center md:gap-2"
			>
				<span class="text-6xl font-medium tracking-tighter md:text-7xl">14</span
				>
				<span class="">drivers</span>
			</div>
		</div>
		<div
			class="col-span-1 flex justify-center border border-l-0 p-8 text-xl font-medium tracking-tighter md:col-span-2 md:col-start-4 md:row-span-2 md:row-start-3 md:items-center md:justify-start"
		>
			<div
				class="flex flex-col items-center gap-0 md:flex-row md:items-baseline md:justify-center md:gap-2"
			>
				<span class="text-6xl font-medium tracking-tighter md:text-7xl"
					>100</span
				>
				<span class="">stops</span>
			</div>
		</div>
	</div>
	<div
		class="bg-texture hidden min-w-6 flex-1 border border-l-0 sm:border-r-0 md:block"
	>
		&nbsp;
	</div>
</div>
