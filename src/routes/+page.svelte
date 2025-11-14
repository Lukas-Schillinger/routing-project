<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { ArrowRight, MapPin, User } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let playbackRate = 0.85;
</script>

<svelte:head>
	<title>Routing Project - Demo Application</title>
	<meta
		name="description"
		content="A modern SvelteKit application showcasing Mapbox integration and authentication"
	/>
</svelte:head>

<Header user={data.user} />

<div class="bg-gradient-to-br from-background via-muted to-secondary pt-16">
	<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Hero Section -->
		<div class="pb-16">
			<div class="relative">
				<div class="h-[80vh] rounded-4xl bg-forest-600">
					<!-- 					<img
					class="h-full rounded-4xl object-cover"
					src="https://storage-public.wend-routing.com/photos/hero-video-first-frame-med.webp"
					alt=""
					/> -->
					<video
						class="pointer-events-none h-full rounded-4xl object-cover"
						poster="https://storage-public.wend-routing.com/cdn-cgi/image/width=1920,format=webp/photos/hero-video-first-frame-med.webp"
						autoplay={true}
						bind:playbackRate
						muted
						loop
						playsinline
					>
						<track kind="captions" />
						<source
							src="https://storage-public.wend-routing.com/cdn-cgi/media/mode=video,time=0s,duration=12s,width=1920,height=1080,fit=scale-down,audio=false/https://storage-public.wend-routing.com/photos/hero-video-h265.mp4"
							type="video/mp4"
							media="(min-width: 1024px)"
						/>
						<source
							src="https://storage-public.wend-routing.com/cdn-cgi/media/mode=video,time=0s,duration=12s,width=1280,fit=scale-down,audio=false/https://storage-public.wend-routing.com/photos/hero-video-h265.mp4"
							type="video/mp4"
							media="(min-width: 640px)"
						/>
						<source
							src="https://storage-public.wend-routing.com/cdn-cgi/media/mode=video,time=0s,duration=12s,width=1280,fit=scale-down,audio=false/https://storage-public.wend-routing.com/photos/hero-video-h265.mp4"
							type="video/mp4"
						/>
					</video>
				</div>
				<div class="absolute bottom-3 pl-3 sm:bottom-12 sm:pl-12">
					<div class="w-min pb-2">
						<div class="-mb-4 flex w-full justify-center">
							<img
								class="w-[28dvw] max-w-84"
								src="https://storage-public.wend-routing.com/logo/logo_white.png"
								alt=""
							/>
						</div>
						<div
							class="track text-[7rem] leading-[0.8] font-black tracking-tighter text-white drop-shadow-2xl md:text-[12rem] lg:text-[12rem]"
						>
							wend
						</div>
					</div>
					<div class="pl-2 text-2xl font-semibold text-white sm:text-4xl">
						Multi-stop route optimization
					</div>
				</div>
			</div>
			<div class="relative flex flex-col justify-center gap-4 pt-8 sm:flex-row">
				<Button href="/maps" size="lg" class="text-base">
					<MapPin class="mr-2 h-5 w-5" />
					Get Started
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
				<Button href="/auth/login" variant="outline" size="lg" class="text-base">
					<User class="mr-2 h-5 w-5" />
					Sign In
				</Button>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="slide-up mb-24 grid gap-6 md:grid-cols-3">
			<Card class="group border-2 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg">
				<CardHeader>
					<div
						class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20"
					>
						<MapPin class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="text-xl">Route Optimization</CardTitle>
					<CardDescription>
						Advanced TSP solver with configurable fairness and time constraints
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li>• Multi-driver route assignment</li>
						<li>• Real-time distance matrix calculation</li>
						<li>• Depot-based optimization</li>
						<li>• Drag-and-drop route editing</li>
					</ul>
				</CardContent>
			</Card>

			<Card class="group border-2 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg">
				<CardHeader>
					<div
						class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20"
					>
						<MapPin class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="text-xl">Smart Geocoding</CardTitle>
					<CardDescription>Address normalization with automatic deduplication</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li>• Mapbox geocoding integration</li>
						<li>• Address hash-based deduplication</li>
						<li>• Confidence scoring (exact/high/medium/low)</li>
						<li>• CSV bulk import support</li>
					</ul>
				</CardContent>
			</Card>

			<Card class="group border-2 shadow-sm transition-all hover:border-primary/50 hover:shadow-lg">
				<CardHeader>
					<div
						class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20"
					>
						<User class="h-6 w-6 text-primary" />
					</div>
					<CardTitle class="text-xl">Multi-Tenant SaaS</CardTitle>
					<CardDescription>Secure organization-based data isolation</CardDescription>
				</CardHeader>
				<CardContent>
					<ul class="space-y-2 text-sm text-muted-foreground">
						<li>• Session-based authentication</li>
						<li>• Organization workspace management</li>
						<li>• Drizzle ORM with PostgreSQL</li>
						<li>• Type-safe API layer</li>
					</ul>
				</CardContent>
			</Card>
		</div>

		<!-- How It Works Section -->
		<div class="slider mb-24">
			<div class="mb-12 text-center">
				<h2 class="mb-3 text-3xl font-bold">How It Works</h2>
				<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
					Optimize your delivery routes in three simple steps
				</p>
			</div>

			<div class="grid gap-8 md:grid-cols-3">
				<div class="relative">
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground shadow-lg"
						>
							1
						</div>
						<h3 class="mb-3 text-xl font-semibold">Import Your Stops</h3>
						<p class="text-muted-foreground">
							Upload a CSV file with your delivery addresses or add them manually. Addresses are
							automatically geocoded and deduplicated.
						</p>
					</div>
				</div>

				<div class="relative">
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground shadow-lg"
						>
							2
						</div>
						<h3 class="mb-3 text-xl font-semibold">Assign Drivers</h3>
						<p class="text-muted-foreground">
							Add drivers to your map and set their starting depot. Configure optimization settings
							like fairness and time limits.
						</p>
					</div>
				</div>

				<div class="relative">
					<div class="flex flex-col items-center text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-2xl font-bold text-primary-foreground shadow-lg"
						>
							3
						</div>
						<h3 class="mb-3 text-xl font-semibold">Optimize Routes</h3>
						<p class="text-muted-foreground">
							Click optimize to calculate the most efficient routes. View results on an interactive
							map with turn-by-turn navigation.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Technology Stack -->
		<Card class="mb-16 border-2 shadow-sm">
			<CardHeader class="pb-8 text-center">
				<CardTitle class="mb-2 text-2xl font-bold">Built With Modern Technologies</CardTitle>
				<CardDescription class="text-base">
					Leveraging the best tools for performance, type safety, and developer experience
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 gap-6 md:grid-cols-4">
					<div
						class="flex flex-col items-center rounded-lg p-4 transition-colors hover:bg-muted/50"
					>
						<h3 class="mb-1 text-base font-semibold">SvelteKit 2</h3>
						<p class="text-center text-sm text-muted-foreground">Full-stack framework</p>
					</div>
					<div
						class="flex flex-col items-center rounded-lg p-4 transition-colors hover:bg-muted/50"
					>
						<h3 class="mb-1 text-base font-semibold">PostgreSQL</h3>
						<p class="text-center text-sm text-muted-foreground">Database</p>
					</div>
					<div
						class="flex flex-col items-center rounded-lg p-4 transition-colors hover:bg-muted/50"
					>
						<h3 class="mb-1 text-base font-semibold">Drizzle ORM</h3>
						<p class="text-center text-sm text-muted-foreground">Type-safe queries</p>
					</div>
					<div
						class="flex flex-col items-center rounded-lg p-4 transition-colors hover:bg-muted/50"
					>
						<h3 class="mb-1 text-base font-semibold">Mapbox GL</h3>
						<p class="text-center text-sm text-muted-foreground">Interactive maps</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>

<style>
	/* Define scroll timeline for the root element */
	/* Create a scroll timeline that tracks the root scrolling */
	:global(html) {
		scroll-timeline: --page-scroll block;
	}

	/* Hero image expansion animation */
	:global(.hero-image) {
		animation: expand-hero linear forwards;
		animation-timeline: scroll();
		animation-range: 0% 50%;
	}

	/* Slide-up animation for content that should slide up from below */
	:global(.slider) {
		animation: slide-up linear both;
		animation-timeline: view();
		animation-range: 10% 50%;
	}

	@keyframes expand-hero {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.33);
		}
	}

	@keyframes fade-text {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes slide-up {
		from {
			transform: translateY(100px);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
