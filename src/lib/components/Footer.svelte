<script lang="ts">
	import { mode } from 'mode-watcher';
</script>

<footer class="mt-auto border-t bg-muted/40 py-12">
	<div class="container mx-auto px-4 md:px-6">
		<div class="grid gap-8 md:grid-cols-4 lg:grid-cols-5">
			<div class="md:col-span-2">
				<div class="mb-4 flex items-center space-x-2">
					<div class="mt-2 flex size-12 items-center justify-center rounded-lg">
						{#if mode.current == 'light'}
							<img
								src="https://storage-public.wend-routing.com/cdn-cgi/image/width=100,height=100,fit=cover,format=webp,quality=100/logo/logo_black.png"
								alt=""
							/>
						{:else}
							<img
								class=""
								src="https://pub-7210daee28ba4cac82595c41b998d12f.r2.dev/logo/logo_white.png"
								alt=""
							/>
						{/if}
					</div>
					<span class="text-2xl font-bold tracking-tight">wend</span>
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
	</div>
</footer>
