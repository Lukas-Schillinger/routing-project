<script lang="ts">
	import FancyButton from '$lib/components/FancyButton.svelte';
	import Header from '$lib/components/Header.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { ArrowRight, Image, MapPin, User } from 'lucide-svelte';
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
				<Button href="/demo/mapbox" size="lg">
					<MapPin class="mr-2 h-5 w-5" />
					Try Mapbox Demo
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
				<Button href="/auth/login" variant="outline" size="lg">
					<User class="mr-2 h-5 w-5" />
					Authentication Demo
				</Button>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="slide-up mb-16 grid gap-8 md:grid-cols-2">
			<Card class="shadow-lg transition-shadow hover:shadow-xl">
				<CardHeader>
					<CardTitle class="flex items-center">
						<MapPin class="mr-3 h-6 w-6 text-primary" />
						Mapbox Integration
					</CardTitle>
					<CardDescription class="body-medium">
						Advanced geocoding capabilities with real-time address validation
					</CardDescription>
				</CardHeader>
				<CardContent class="body-medium">
					<ul class="space-y-2 text-muted-foreground">
						<li>• Forward and reverse geocoding</li>
						<li>• Address autocomplete functionality</li>
						<li>• Type-safe API integration</li>
						<li>• Comprehensive error handling</li>
					</ul>
					<FancyButton href="/demo/mapbox" class="mt-4">Explore Demo</FancyButton>
				</CardContent>
			</Card>

			<Card class="shadow-lg transition-shadow hover:shadow-xl">
				<CardHeader>
					<CardTitle class="flex items-center">
						<User class="mr-3 h-6 w-6 text-primary" />
						Authentication System
					</CardTitle>
					<CardDescription class="body-medium">
						Secure user authentication powered by Lucia
					</CardDescription>
				</CardHeader>
				<CardContent class="body-medium">
					<ul class="space-y-2 text-muted-foreground">
						<li>• Session-based authentication</li>
						<li>• User registration and login</li>
						<li>• Secure password handling</li>
						<li>• Modern UI components</li>
					</ul>
					<FancyButton href="/auth/login" class="mt-4">Try Authentication</FancyButton>
				</CardContent>
			</Card>
		</div>

		<!-- Photo Gallery Section -->
		<div class="slider mb-16">
			<div class="mb-8 text-center">
				<h2 class="headline-medium mb-4">Gallery</h2>
				<p class="body-large text-muted-foreground">Showcase your application in action</p>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				<!-- Photo Frame 1 -->
				<Card class="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
					<div
						class="flex aspect-[4/3] items-center justify-center border-b border-border bg-muted/50"
					>
						<div class="text-center">
							<Image class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p class="body-small text-muted-foreground">Feature Photo 1</p>
							<p class="body-small text-muted-foreground/70">800 x 600</p>
						</div>
					</div>
					<CardContent class="p-4">
						<h3 class="headline-small mb-2">Interactive Maps</h3>
						<p class="body-small text-muted-foreground">
							Showcase the Mapbox integration with beautiful interactive maps and geocoding
							features.
						</p>
					</CardContent>
				</Card>

				<!-- Photo Frame 2 -->
				<Card class="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
					<div
						class="flex aspect-[4/3] items-center justify-center border-b border-border bg-muted/50"
					>
						<div class="text-center">
							<Image class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p class="body-small text-muted-foreground">Feature Photo 2</p>
							<p class="body-small text-muted-foreground/70">800 x 600</p>
						</div>
					</div>
					<CardContent class="p-4">
						<h3 class="headline-small mb-2">Secure Authentication</h3>
						<p class="body-small text-muted-foreground">
							Demonstrate the secure login system with modern UI components and user management.
						</p>
					</CardContent>
				</Card>

				<!-- Photo Frame 3 -->
				<Card class="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
					<div
						class="flex aspect-[4/3] items-center justify-center border-b border-border bg-muted/50"
					>
						<div class="text-center">
							<Image class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
							<p class="body-small text-muted-foreground">Feature Photo 3</p>
							<p class="body-small text-muted-foreground/70">800 x 600</p>
						</div>
					</div>
					<CardContent class="p-4">
						<h3 class="headline-small mb-2">Data Processing</h3>
						<p class="body-small text-muted-foreground">
							Show the CSV upload and parsing functionality with real-time validation and feedback.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- Technology Stack -->
		<Card class=" shadow-lg">
			<CardHeader>
				<CardTitle class="headline-small text-center">Built With Modern Technologies</CardTitle>
				<CardDescription class="body-medium text-center">
					Leveraging the best tools for performance, type safety, and developer experience
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
					<div class="p-4">
						<h3 class="body-medium font-semibold">SvelteKit</h3>
						<p class="body-small">Full-stack framework</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold">TypeScript</h3>
						<p class="body-small">Type safety</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold">Tailwind CSS</h3>
						<p class="body-small">Utility-first styling</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold">shadcn-svelte</h3>
						<p class="body-small">UI components</p>
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
