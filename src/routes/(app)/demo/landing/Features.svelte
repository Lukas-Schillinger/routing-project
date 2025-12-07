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

<div>
	{#each features as feature, index}
		<div class="grid grid-cols-3 last:border-b">
			{#if index % 2 === 1}
				<div class="bg-texture col-span-1 border-t border-l">&nbsp;</div>
			{/if}
			<div class="col-span-2 border border-b-0 p-8">
				<div class="flex items-center gap-4 font-serif text-5xl">
					<feature.icon weight="light" />
					{feature.title}
				</div>
				<div class="pt-4 pl-16 text-2xl font-light">
					{feature.desc}
				</div>
			</div>
			{#if index % 2 === 0}
				<div class="bg-texture col-span-1 border-t border-r">&nbsp;</div>
			{/if}
		</div>
	{/each}
</div>
