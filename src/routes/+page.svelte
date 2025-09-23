<script lang="ts">
	import CloudflareImage from '$lib/components/CloudflareImage.svelte';
	import FancyButton from '$lib/components/FancyButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { ArrowRight, Image, MapPin, User } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Routing Project - Demo Application</title>
	<meta
		name="description"
		content="A modern SvelteKit application showcasing Mapbox integration and authentication"
	/>
</svelte:head>

<div class="bg-gradient-to-br from-background via-muted to-secondary py-12">
	<div class="container mx-auto max-w-6xl px-6">
		<!-- Hero Section -->
		<div class="mb-16 text-center">
			<!-- Hero Image Frame -->
			<div class="relative mb-8 max-h-[75vh] w-full overflow-hidden">
				<div class="h-96" id="hero-image-container">
					<CloudflareImage
						src="https://media.fun.schillingertools.com/routing-project-hero-alt.jpg"
						alt="Winding Road"
						class="hero-image h-full max-h-[75vh] w-full rounded-4xl object-cover brightness-75"
					/>
				</div>
				<div class="absolute inset-0 flex flex-col items-center justify-center">
					<div
						class="text-[12rem] leading-none font-bold tracking-tighter text-white drop-shadow-2xl md:text-[14rem] lg:text-[18rem]"
					>
						wend
					</div>
					<div class="text-2xl font-semibold text-white sm:text-4xl">
						Multi-stop route optimization
					</div>
				</div>
			</div>

			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button href="/demo/mapbox" size="lg">
					<MapPin class="mr-2 h-5 w-5" />
					Try Mapbox Demo
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
				<Button href="/demo/lucia/login" variant="outline" size="lg">
					<User class="mr-2 h-5 w-5" />
					Authentication Demo
				</Button>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="mb-16 grid gap-8 md:grid-cols-2">
			<Card class="shadow-lg transition-shadow hover:shadow-xl">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
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
					<CardTitle class="headline-card flex items-center">
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
					<FancyButton href="/demo/lucia/login" class="mt-4">Try Authentication</FancyButton>
				</CardContent>
			</Card>
		</div>

		<!-- Photo Gallery Section -->
		<div class="mb-16">
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
		<Card class="shadow-lg">
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
	.hero-image {
		animation-name: expandAnimation;
	}

	@keyframes expandAnimation {
		from {
			/* transform: rotate(0deg); */
			scale: 100;
		}

		to {
			/* transform: rotate(360deg); */
			scale: 150;
		}
	}
</style>
