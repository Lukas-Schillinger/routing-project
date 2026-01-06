<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import Bento from '$lib/components/Landing/Bento.svelte';
	import CallToAction from '$lib/components/Landing/CallToAction.svelte';
	import Features from '$lib/components/Landing/Features.svelte';
	import FeatureShowcase from '$lib/components/Landing/FeatureShowcase.svelte';
	import Hero from '$lib/components/Landing/Hero.svelte';
	import Pricing from '$lib/components/Landing/Pricing.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="flex justify-center px-0 md:px-4">
	<div class=" max-w-7xl sm:border-x">
		<Header showLines user={data.user} />
		<div class="py-12">
			<Hero />
		</div>
		<div class="py-12">
			<Bento />
		</div>
		<div class="px-4 py-12 md:px-8">
			<FeatureShowcase />
		</div>
		<div class="py-12">
			<Features />
		</div>
		<div class="py-12">
			<Pricing />
		</div>
		<div class="py-12">
			<CallToAction />
		</div>
	</div>
</div>
<Footer />
