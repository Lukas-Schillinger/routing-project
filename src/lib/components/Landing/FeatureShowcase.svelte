<script lang="ts">
	import { Mail, MessageSquare, Printer, Smartphone } from 'lucide-svelte';
	import CloudflareImage from '$lib/components/CloudflareImage.svelte';
</script>

<div class="space-y-16 py-8 md:space-y-24">
	<!-- Share Routes -->
	<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
		<div class="flex h-full flex-col justify-end space-y-4">
			<h3 class="font-serif text-4xl leading-tight md:text-5xl">Share routes</h3>
			<p class="text-lg font-light text-muted-foreground md:text-xl">
				Send drivers their routes directly from the app.
			</p>
			<div class="flex flex-wrap gap-2 pt-2">
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-sm"
				>
					<MessageSquare class="h-3.5 w-3.5" />
					SMS
				</span>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-sm"
				>
					<Mail class="h-3.5 w-3.5" />
					Email
				</span>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-sm"
				>
					<Smartphone class="h-3.5 w-3.5" />
					In-app
				</span>
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/5 px-3 py-1 text-sm"
				>
					<Printer class="h-3.5 w-3.5" />
					Print
				</span>
			</div>
		</div>
		<div class="overflow-hidden rounded-3xl">
			<CloudflareImage
				src="https://storage-public.wend-routing.com/photos/illustrations/packages-in-delivery-bay.png"
				alt="Warehouse with delivery boxes"
				size="2xl"
				class="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
			/>
		</div>
	</div>

	<!-- Track & Complete -->
	<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
		<div class="order-2 overflow-hidden rounded-3xl md:order-1">
			<CloudflareImage
				src="https://storage-public.wend-routing.com/photos/illustrations/van-in-front-of-house.png"
				alt="Delivery van in neighborhood"
				size="2xl"
				class="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
			/>
		</div>
		<div class="order-1 flex h-full flex-col justify-end space-y-4 md:order-2">
			<h3 class="font-serif text-4xl leading-tight md:text-5xl">Track & complete</h3>
			<p class="text-lg font-light text-muted-foreground md:text-xl">
				Monitor progress in real-time. Drivers mark stops complete and capture proof of delivery
				(coming soon).
			</p>
		</div>
	</div>

	<!-- One Click Optimization -->
	<div class="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
		<div class="flex h-full flex-col justify-end space-y-4">
			<h3 class="font-serif text-4xl leading-tight md:text-5xl">One click optimization</h3>
			<p class="text-lg font-light text-muted-foreground md:text-xl">
				Multi-stop and multi-agent route optimization for up to 14 drivers and 100 stops.
			</p>
		</div>
		<div class="overflow-hidden rounded-3xl">
			<CloudflareImage
				src="https://storage-public.wend-routing.com/photos/illustrations/packages-in-front-of-door.png"
				alt="Delivery depot with packages"
				size="2xl"
				class="h-auto w-full object-cover transition-transform duration-500 hover:scale-105"
			/>
		</div>
	</div>
</div>
