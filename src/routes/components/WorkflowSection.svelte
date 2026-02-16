<script lang="ts">
	import WorkflowImportStep from './WorkflowImportStep.svelte';
	import WorkflowOptimizeStep from './WorkflowOptimizeStep.svelte';
	import WorkflowDispatchStep from './WorkflowDispatchStep.svelte';
</script>

<section class="py-24 md:py-32">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="mb-16">
			<p
				class="mb-3 text-xs font-medium tracking-[0.25em] text-landing-primary uppercase"
			>
				How it works
			</p>
			<h2
				class="max-w-lg font-serif text-4xl leading-tight tracking-tight md:text-5xl"
			>
				Three steps to faster routes
			</h2>
		</div>

		<div class="space-y-16 md:space-y-24">
			<WorkflowImportStep />
			<WorkflowOptimizeStep />
			<WorkflowDispatchStep />
		</div>
	</div>
</section>
