<script lang="ts">
	import { Cpu, FolderOpen, ListChecks, PaperPlaneTilt } from 'phosphor-svelte';

	const features = [
		{
			title: 'Intelligent Data Uploads',
			desc: 'Securely upload route data with delivery information to make drop-offs a breeze',
			icon: FolderOpen
		},
		{
			title: 'One Click Optimization',
			desc: 'Find the best route every time for up to 14 drivers. ',
			icon: Cpu
		},
		{
			title: 'Share Routes',
			desc: 'Send drivers their routes directly from the app using email or SMS (coming soon)',
			icon: PaperPlaneTilt
		},
		{
			title: 'Track & Complete',
			desc: 'Monitor progress in real-time. Drivers mark stops complete and capture proof of delivery.',
			icon: ListChecks
		}
	];
</script>

<div class="pb-12">
	<div class="text-center text-6xl font-medium tracking-tighter sm:text-7xl">
		Delivery planning made simple
	</div>
	<div class="px-0 py-4 text-center text-2xl font-extralight sm:px-18 md:px-36">
		Upload to final delivery, streamlined in one platflorm.
	</div>
</div>
<div class="border-y">
	{#each features as feature, index (feature.title)}
		<div class="grid grid-cols-8 border-t first:border-t-0 sm:grid-cols-3">
			{#if index % 2 === 1}
				<div class="bg-texture col-span-1 border-r">&nbsp;</div>
			{/if}
			<div class="col-span-7 p-8 sm:col-span-2">
				<div class="flex items-center gap-4 font-serif text-4xl">
					<feature.icon class="shrink-0" weight="light" />
					{feature.title}
				</div>
				<div class="pt-2 pl-14 text-xl font-light">
					{feature.desc}
				</div>
			</div>
			{#if index % 2 === 0}
				<div class="bg-texture col-span-1 border-l">&nbsp;</div>
			{/if}
		</div>
	{/each}
</div>
