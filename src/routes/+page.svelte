<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import CTASection from './components/CTASection.svelte';
	import WorkflowSection from './components/WorkflowSection.svelte';
	import HeroSection from './components/HeroSection.svelte';
	import MetricsSection from './components/MetricsSection.svelte';
	import PricingSection from './components/PricingSection.svelte';
	import RouteDemo from './components/RouteDemo.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Wend | Route Intelligence for Delivery Teams</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<Header user={data.user} />
	<main>
		<HeroSection />
		<RouteDemo />
		<!-- Thin separator between RouteDemo and Workflow -->
		<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
			<div
				class="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
			></div>
		</div>
		<WorkflowSection />
		<MetricsSection />
		<PricingSection />
		<!-- Breathing space before CTA -->
		<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
			<div
				class="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
			></div>
		</div>
		<CTASection />
	</main>
	<Footer />
</div>
