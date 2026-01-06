<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import CapabilitiesSection from '$lib/components/LandingV2/CapabilitiesSection.svelte';
	import CTASection from '$lib/components/LandingV2/CTASection.svelte';
	import HeroSection from '$lib/components/LandingV2/HeroSection.svelte';
	import MetricsSection from '$lib/components/LandingV2/MetricsSection.svelte';
	import PricingSection from '$lib/components/LandingV2/PricingSection.svelte';
	import ShowcaseSection from '$lib/components/LandingV2/ShowcaseSection.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-background">
	<Header user={data.user} />
	<main>
		<HeroSection />
		<CapabilitiesSection />
		<ShowcaseSection />
		<MetricsSection />
		<PricingSection />
		<CTASection />
	</main>
	<Footer />
</div>
