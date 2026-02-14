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
		<WorkflowSection />
		<MetricsSection />
		<PricingSection />
		<CTASection />
	</main>
	<Footer />
</div>
