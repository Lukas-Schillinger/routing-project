<script lang="ts">
	import { Code, Heart, MapPin } from 'lucide-svelte';
</script>

<footer class="mt-auto border-t border-border bg-muted py-8">
	<div class="container mx-auto px-4 sm:px-6 lg:px-8">
		<div class="grid gap-8 md:grid-cols-3">
			<!-- Brand Section -->
			<div>
				<div class="mb-4 flex items-center space-x-2">
					<div class="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
						<MapPin class="h-4 w-4 text-primary-foreground" />
					</div>
					<span class="headline-card">Routing Project</span>
				</div>
				<p class="body-small mb-4 text-muted-foreground">
					A modern SvelteKit application showcasing Mapbox integration and secure authentication.
				</p>
			</div>

			<!-- Links Section -->
			<div>
				<h3 class="body-medium mb-4 font-semibold">Demos</h3>
				<ul class="space-y-2">
					<li>
						<a
							href="/"
							class="body-small text-muted-foreground transition-colors hover:text-foreground"
						>
							Home
						</a>
					</li>
					<li>
						<a
							href="/demo/mapbox"
							class="body-small text-muted-foreground transition-colors hover:text-foreground"
						>
							Mapbox Geocoding
						</a>
					</li>
					<li>
						<a
							href="/auth/login"
							class="body-small text-muted-foreground transition-colors hover:text-foreground"
						>
							Authentication
						</a>
					</li>
				</ul>
			</div>

			<!-- Tech Stack Section -->
			<div>
				<h3 class="body-medium mb-4 font-semibold">Built With</h3>
				<ul class="space-y-2">
					<li class="body-small text-muted-foreground">SvelteKit</li>
					<li class="body-small text-muted-foreground">TypeScript</li>
					<li class="body-small text-muted-foreground">Tailwind CSS</li>
					<li class="body-small text-muted-foreground">shadcn-svelte</li>
				</ul>
			</div>
		</div>

		<!-- Bottom Section -->
		<div
			class="mt-8 flex flex-col items-center justify-between border-t border-border pt-6 sm:flex-row"
		>
			<p class="body-small mb-4 text-muted-foreground sm:mb-0">
				© 2025 Routing Project. Built for demonstration purposes.
			</p>
			<div class="body-small flex items-center space-x-1 text-muted-foreground">
				<span>Made with</span>
				<Heart class="h-4 w-4 fill-current text-red-500" />
				<span>and</span>
				<Code class="h-4 w-4 text-primary" />
			</div>
		</div>
	</div>
</footer>
