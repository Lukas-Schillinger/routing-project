<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import { MapPin } from 'lucide-svelte';
</script>

<footer class="mt-auto border-t bg-muted/40 py-12">
	<div class="container mx-auto px-4 md:px-6">
		<div class="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
			<div class="md:col-span-2">
				<div class="mb-4 flex items-center space-x-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
						<MapPin class="h-5 w-5 text-primary-foreground" />
					</div>
					<span class="text-xl font-bold tracking-tight">Routing Project</span>
				</div>
				<p class="max-w-xs text-sm text-muted-foreground">
					Advanced route optimization and fleet management for modern logistics teams.
				</p>
			</div>

			<!-- Product Links -->
			<div>
				<h3 class="mb-4 font-semibold">Product</h3>
				<ul class="space-y-3 text-sm text-muted-foreground">
					<li>
						<a href="/maps" class="transition-colors hover:text-foreground">Maps</a>
					</li>
					<li>
						<a href="/drivers" class="transition-colors hover:text-foreground">Drivers</a>
					</li>
					<li>
						<a href="/depots" class="transition-colors hover:text-foreground">Depots</a>
					</li>
				</ul>
			</div>

			<!-- Company Links -->
			<div>
				<h3 class="mb-4 font-semibold">Company</h3>
				<ul class="space-y-3 text-sm text-muted-foreground">
					<li>
						<a href="/about" class="transition-colors hover:text-foreground">About</a>
					</li>
					<li>
						<a href="/contact" class="transition-colors hover:text-foreground">Contact</a>
					</li>
					<li>
						<a href="/careers" class="transition-colors hover:text-foreground">Careers</a>
					</li>
				</ul>
			</div>

			<!-- Legal Links -->
			<div>
				<h3 class="mb-4 font-semibold">Legal</h3>
				<ul class="space-y-3 text-sm text-muted-foreground">
					<li>
						<a href="/privacy" class="transition-colors hover:text-foreground">Privacy</a>
					</li>
					<li>
						<a href="/terms" class="transition-colors hover:text-foreground">Terms</a>
					</li>
				</ul>
			</div>
		</div>

		<Separator class="my-8" />

		<div
			class="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row"
		>
			<p>© 2025 Routing Project. All rights reserved.</p>
		</div>
	</div>
</footer>
