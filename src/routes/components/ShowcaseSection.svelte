<script lang="ts">
	import CloudflareImage from '$lib/components/CloudflareImage.svelte';
	import {
		Clock,
		Mail,
		MapPin,
		MessageSquare,
		Printer,
		Scale,
		Shield,
		Smartphone,
		Upload
	} from 'lucide-svelte';

	const showcaseItems = [
		{
			step: '00',
			label: 'Optimize',
			title: 'One click optimization',
			description:
				'Advanced algorithms find the fastest routes across your entire fleet. Balances time windows, capacity, and driver schedules.',
			image:
				'https://storage-public.wend-routing.com/photos/illustrations/isometric-neighborhood.png',
			imageAlt: 'Warehouse with delivery boxes',
			features: [
				{ icon: Upload, label: 'Intelligent data uploads' },
				{ icon: Scale, label: 'Stop balancing' }
			]
		},
		{
			step: '01',
			label: 'Dispatch',
			title: 'Routes reach drivers instantly',
			description:
				'One click sends optimized routes to your entire fleet. Each driver gets a personalized link with turn-by-turn navigation in their preferred app.',
			image:
				'https://storage-public.wend-routing.com/photos/illustrations/packages-in-delivery-bay.png',
			imageAlt: 'Warehouse with delivery boxes',
			features: [
				{ icon: MessageSquare, label: 'SMS alerts', fake: true },
				{ icon: Mail, label: 'Email dispatch' },
				{ icon: Smartphone, label: 'In-app' },
				{ icon: Printer, label: 'Printable routes' }
			]
		},
		{
			step: '02',
			label: 'Track',
			title: 'See everything in real-time',
			description:
				'Monitor your fleet as deliveries happen. Live location updates, completed stops, and ETAs update automatically so you always know where things stand.',
			image:
				'https://storage-public.wend-routing.com/photos/illustrations/van-in-front-of-house.png',
			imageAlt: 'Delivery van in neighborhood',
			features: [
				{ icon: MapPin, label: 'Live tracking', fake: true },
				{ icon: Clock, label: 'ETA updates', fake: true }
			]
		},
		{
			step: '03',
			label: 'Complete',
			title: 'Proof at every doorstep',
			description:
				'Drivers capture photos and signatures on delivery. Customers get automatic notifications. You get a complete audit trail.',
			image:
				'https://storage-public.wend-routing.com/photos/illustrations/packages-in-front-of-door.png',
			imageAlt: 'Packages at doorstep',
			features: [
				{ icon: Shield, label: 'Photo proof', fake: true },
				{ icon: Mail, label: 'Auto-notify', fake: true }
			]
		}
	];
</script>

<section class="py-24 md:py-32">
	<div class="mx-auto max-w-7xl px-4 md:px-8">
		<!-- Section Header -->
		<div class="mb-20 text-center">
			<p class="mb-4 text-sm font-medium tracking-[0.2em] text-landing-primary uppercase">
				How it works
			</p>
			<h2 class="font-serif text-4xl leading-tight tracking-tight md:text-5xl">
				From chaos to clarity
			</h2>
		</div>

		<!-- Showcase Items -->
		<div class="space-y-8">
			{#each showcaseItems as item, index}
				<div class="group relative overflow-hidden rounded-3xl">
					<div
						class="grid grid-cols-1 items-center gap-8 p-6 sm:grid-cols-2 md:gap-12 md:p-10 lg:p-12"
					>
						<!-- Content -->
						<div class={index % 2 === 1 ? 'md:order-2' : ''}>
							<h3 class="mb-4 font-serif text-3xl leading-tight tracking-tight md:text-4xl">
								{item.title}
							</h3>
							<p class="text-base leading-relaxed text-muted-foreground md:text-lg">
								{item.description}
							</p>

							<!-- Feature pills -->
							{#if item.features.length > 0}
								<div class="mt-8 flex flex-wrap gap-3">
									{#each item.features as feature}
										<span
											class="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm {feature.fake
												? 'border-dashed border-foreground/10 text-muted-foreground/60'
												: 'border-foreground/10 bg-background'}"
										>
											<feature.icon
												class="h-4 w-4 {feature.fake
													? 'text-muted-foreground/40'
													: 'text-landing-primary'}"
											/>
											{feature.label}
											{#if feature.fake}
												<span class="text-xs text-muted-foreground/40">Soon</span>
											{/if}
										</span>
									{/each}
								</div>
							{/if}
						</div>

						<!-- Image -->
						<div class={index % 2 === 1 ? 'md:order-1' : ''}>
							<div class="relative">
								<!-- Image container -->
								<div
									class="relative overflow-hidden rounded-2xl border border-foreground/60 bg-background shadow-lg shadow-gray-400 dark:shadow-background"
								>
									<CloudflareImage
										src={item.image}
										alt={item.imageAlt}
										size="2xl"
										class="h-auto w-full object-cover"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
