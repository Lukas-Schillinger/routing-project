<!-- @component PrintableRoute - A printable route sheet with stop details and QR code spaces -->
<script lang="ts">
	import type { Driver, Map as MapType, Route } from '$lib/schemas';
	import type { StopWithLocation } from '$lib/schemas/stop';
	import { AppleMapsService } from '$lib/services/external/client/apple-maps';
	import { GoogleMapsService } from '$lib/services/external/client/google-maps';
	import { formatDate } from '$lib/utils';
	import QRCode from 'qrcode';

	interface Props {
		route: Route;
		stops: StopWithLocation[];
		driver?: Driver;
		map: MapType;
		mapsProvider?: 'google' | 'apple';
	}

	let { route, stops, driver, map, mapsProvider = 'google' }: Props = $props();

	const sortedStops = $derived(
		[...stops].sort((a, b) => (a.stop.delivery_index || 0) - (b.stop.delivery_index || 0))
	);

	const totalDurationMinutes = $derived(Math.floor(Number(route.duration) / 60));

	function getDirectionsUrl(lat: number, lon: number): string {
		const destination = { lat, lng: lon };
		if (mapsProvider === 'apple') {
			return AppleMapsService.getDirectionsUrl({ destination });
		}
		return GoogleMapsService.getDirectionsUrl({ destination });
	}

	async function generateQrCode(url: string): Promise<string> {
		return QRCode.toDataURL(url, {
			width: 96,
			margin: 0,
			errorCorrectionLevel: 'M'
		});
	}
</script>

<article class="route-page bg-white text-black">
	<!-- Route Header -->
	<header class="mb-4 flex items-start justify-between border-b-2 border-black pb-3">
		<div class="flex gap-4">
			<img
				class="size-18"
				src="https://storage-public.wend-routing.com/logo/logo_black.svg"
				alt=""
			/>
			<div>
				<h1 class="m-0 text-2xl font-bold">{map.title}</h1>
				{#if driver}
					<h2 class="m-0 text-lg font-medium text-gray-600">{driver.name}</h2>
				{/if}
			</div>
		</div>
		<div class="text-right text-base">
			<p class="m-0"><strong>Date:</strong> {formatDate(route.updated_at)}</p>
			<p class="m-0"><strong>Stops:</strong> {sortedStops.length}</p>
			<p class="m-0"><strong>Est. Duration:</strong> {totalDurationMinutes} min</p>
		</div>
	</header>

	<!-- Stops List -->
	<ol class="m-0 list-none p-0">
		{#each sortedStops as { stop, location }, index}
			<li class="stop-item flex items-start gap-3 border-b border-gray-300 py-2.5">
				<div
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-black text-lg font-bold text-white"
				>
					{stop.delivery_index || index + 1}
				</div>

				<div class="min-w-0 flex-1">
					<div class="">
						<p class=" text-lg font-semibold">{location.address_line_1}</p>
						{#if location.address_line_2}
							<p class="m-0 text-gray-600">{location.address_line_2}</p>
						{/if}
						<p class="text-base text-gray-500">
							{[location.city, location.region, location.postal_code].filter(Boolean).join(', ')}
						</p>
					</div>

					{#if stop.contact_name || stop.contact_phone}
						<div class="mt-1 text-base">
							{#if stop.contact_name}
								<p class="font-medium">{stop.contact_name}</p>
							{/if}
							{#if stop.contact_phone}
								<p class="">{stop.contact_phone}</p>
							{/if}
						</div>
					{/if}

					{#if stop.notes}
						<div class="mt-1 border-l-2 border-gray-400 bg-gray-100 px-2 py-1 text-sm italic">
							<p class="m-0">{stop.notes}</p>
						</div>
					{/if}
				</div>

				<div class="size-24 shrink-0">
					{#await generateQrCode(getDirectionsUrl(location.lat, location.lon))}
						<div
							class="flex items-center justify-center border border-dashed border-gray-400 text-xs text-gray-400"
						>
							...
						</div>
					{:then qrDataUrl}
						<img src={qrDataUrl} alt="QR code for directions" class="" />
					{:catch}
						<div
							class="flex items-center justify-center border border-dashed border-gray-400 text-xs text-gray-400"
						>
							QR
						</div>
					{/await}
				</div>
			</li>
		{/each}
	</ol>
</article>

<style>
	.route-page {
		page-break-after: always;
	}

	.route-page:last-child {
		page-break-after: auto;
	}

	.stop-item {
		page-break-inside: avoid;
	}
</style>
