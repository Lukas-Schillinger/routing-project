<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import CTASection from './components/CTASection.svelte';
	import HeroSection from './components/HeroSection.svelte';
	import MetricsSection from './components/MetricsSection.svelte';
	import PricingSection from './components/PricingSection.svelte';
	import ShowcaseSection from './components/ShowcaseSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Wend | Route Planning Made Simple</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<Header user={data.user} />
	<main>
		<HeroSection />
		<!-- <CapabilitiesSection /> -->
		<ShowcaseSection />
		<MetricsSection />
		<PricingSection />
		<CTASection />
	</main>
	<Footer />
</div>
