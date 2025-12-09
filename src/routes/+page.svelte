<script lang="ts">
	import Footer from '$lib/components/Footer.svelte';
	import Bento from '$lib/components/Landing/Bento.svelte';
	import CallToAction from '$lib/components/Landing/CallToAction.svelte';
	import Features from '$lib/components/Landing/Features.svelte';
	import Header from '$lib/components/Landing/Header.svelte';
	import Hero from '$lib/components/Landing/Hero.svelte';
	import Pricing from '$lib/components/Landing/Pricing.svelte';
</script>

<div class="flex justify-center px-0 md:px-4">
	<div class=" max-w-5xl sm:border-x">
		<Header />
		<div class="py-12">
			<Hero />
		</div>
		<div class="py-12">
			<Bento />
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
