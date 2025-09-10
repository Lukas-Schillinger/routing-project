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

<div class="bg-gradient-to-br from-sand-50 via-sand-100 to-sand-200 py-12">
	<div class="container mx-auto max-w-6xl px-6">
		<!-- Hero Section -->
		<div class="mb-16 text-center">
			<h1 class="headline-large mb-6">Welcome to Routing Project</h1>
			<p class="body-large mx-auto mb-8 max-w-3xl">
				A modern SvelteKit application demonstrating powerful integrations including Mapbox
				geocoding services and secure authentication with Lucia.
			</p>
			<div class="flex flex-col justify-center gap-4 sm:flex-row">
				<Button href="/demo/mapbox" class="bg-forest-600 text-white hover:bg-forest-700" size="lg">
					<MapPin class="mr-2 h-5 w-5" />
					Try Mapbox Demo
					<ArrowRight class="ml-2 h-4 w-4" />
				</Button>
				<Button
					href="/demo/lucia/login"
					variant="outline"
					class="border-forest-300 text-forest-700 hover:bg-forest-50 hover:text-forest-800"
					size="lg"
				>
					<User class="mr-2 h-5 w-5" />
					Authentication Demo
				</Button>
			</div>
		</div>

		<!-- Features Grid -->
		<div class="mb-16 grid gap-8 md:grid-cols-2">
			<Card class="border-sand-300 bg-sand-50 shadow-lg transition-shadow hover:shadow-xl">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
						<MapPin class="mr-3 h-6 w-6 text-forest-600" />
						Mapbox Integration
					</CardTitle>
					<CardDescription class="body-medium text-forest-600">
						Advanced geocoding capabilities with real-time address validation
					</CardDescription>
				</CardHeader>
				<CardContent class="body-medium text-forest-700">
					<ul class="space-y-2">
						<li>• Forward and reverse geocoding</li>
						<li>• Address autocomplete functionality</li>
						<li>• Type-safe API integration</li>
						<li>• Comprehensive error handling</li>
					</ul>
					<Button href="/demo/mapbox" class="mt-4 bg-forest-600 text-white hover:bg-forest-700">
						Explore Demo
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>

			<Card class="border-sand-300 bg-sand-50 shadow-lg transition-shadow hover:shadow-xl">
				<CardHeader>
					<CardTitle class="headline-card flex items-center">
						<User class="mr-3 h-6 w-6 text-forest-600" />
						Authentication System
					</CardTitle>
					<CardDescription class="body-medium text-forest-600">
						Secure user authentication powered by Lucia
					</CardDescription>
				</CardHeader>
				<CardContent class="body-medium text-forest-700">
					<ul class="space-y-2">
						<li>• Session-based authentication</li>
						<li>• User registration and login</li>
						<li>• Secure password handling</li>
						<li>• Modern UI components</li>
					</ul>
					<Button
						href="/demo/lucia/login"
						class="mt-4 bg-forest-600 text-white hover:bg-forest-700"
					>
						Try Authentication
						<ArrowRight class="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
		</div>

		<!-- Technology Stack -->
		<Card class="border-sand-300 bg-sand-100 shadow-lg">
			<CardHeader>
				<CardTitle class="headline-small text-center">Built With Modern Technologies</CardTitle>
				<CardDescription class="body-medium text-center text-forest-600">
					Leveraging the best tools for performance, type safety, and developer experience
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
					<div class="p-4">
						<h3 class="body-medium font-semibold text-forest-800">SvelteKit</h3>
						<p class="body-small text-forest-600">Full-stack framework</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold text-forest-800">TypeScript</h3>
						<p class="body-small text-forest-600">Type safety</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold text-forest-800">Tailwind CSS</h3>
						<p class="body-small text-forest-600">Utility-first styling</p>
					</div>
					<div class="p-4">
						<h3 class="body-medium font-semibold text-forest-800">shadcn-svelte</h3>
						<p class="body-small text-forest-600">UI components</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
