<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { ArrowRight, MapPin, User } from 'lucide-svelte';
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
			<h1 class="headline-large mb-6">Welcome to Routing Project</h1>
			<p class="body-large mx-auto mb-8 max-w-3xl">
				A modern SvelteKit application demonstrating powerful integrations including Mapbox
				geocoding services and secure authentication with Lucia.
			</p>
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
					<ul class="space-y-2">
						<li>• Forward and reverse geocoding</li>
						<li>• Address autocomplete functionality</li>
						<li>• Type-safe API integration</li>
						<li>• Comprehensive error handling</li>
					</ul>
					<Button href="/demo/mapbox" class="mt-4">
						Explore Demo
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
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
					<ul class="space-y-2">
						<li>• Session-based authentication</li>
						<li>• User registration and login</li>
						<li>• Secure password handling</li>
						<li>• Modern UI components</li>
					</ul>
					<Button href="/demo/lucia/login" class="mt-4">
						Try Authentication
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
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
