<!--
@component
Component for automatically resizing images using cloudflare images transformations. 
-->
<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLImgAttributes } from 'svelte/elements';

	type $$Props = {
		src: string;
		alt: string;
		sizes?: string;
		class?: string;
		loading?: 'lazy' | 'eager';
		decoding?: 'async' | 'sync' | 'auto';
	} & Omit<
		HTMLImgAttributes,
		'src' | 'alt' | 'sizes' | 'class' | 'srcset' | 'loading' | 'decoding'
	>;

	const defaultSizes = '(min-width: 1280px) 1200px, (min-width: 768px) 90vw, 100vw';

	let {
		src,
		alt,
		sizes = defaultSizes,
		class: className,
		loading = 'lazy',
		decoding = 'async',
		...restProps
	}: $$Props = $props();

	const CF_ZONE = 'https://images.wend-routing.com';
	const OPTS = 'format=auto,quality=85';
	const widths = [400, 640, 768, 1024, 1280, 1536, 1920];

	function cfUrl(url: string, width: number) {
		const remote = encodeURI(url);
		return `${CF_ZONE}/cdn-cgi/image/width=${width},${OPTS}/${remote}`;
	}

	const srcset = widths.map((w) => `${cfUrl(src, w)} ${w}w`).join(', ');
	const defaultSrc = cfUrl(src, 1200);
</script>

<img
	{alt}
	{sizes}
	{srcset}
	{loading}
	{decoding}
	src={defaultSrc}
	class={cn(className)}
	{...restProps}
/>
