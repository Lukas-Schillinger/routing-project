<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import Bento from './components/Bento.svelte';
	import CallToAction from './components/CallToAction.svelte';
	import Features from './components/Features.svelte';
	import FeatureShowcase from './components/FeatureShowcase.svelte';
	import Hero from './components/Hero.svelte';
	import Pricing from './components/Pricing.svelte';
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
