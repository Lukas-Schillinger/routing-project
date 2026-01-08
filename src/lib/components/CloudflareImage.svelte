<!--
@component
Component for resizing images using Cloudflare image transformations.
-->
<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { HTMLImgAttributes } from 'svelte/elements';

	type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

	interface Props extends Omit<HTMLImgAttributes, 'src' | 'srcset' | 'sizes'> {
		src: string;
		alt: string;
		size?: Size;
	}

	const sizeConfig: Record<Size, { widths: number[]; sizes: string }> = {
		xs: { widths: [160, 320], sizes: '160px' },
		sm: { widths: [240, 480], sizes: '240px' },
		md: { widths: [384, 768], sizes: '384px' },
		lg: { widths: [512, 1024], sizes: '512px' },
		xl: { widths: [640, 1280], sizes: '640px' },
		'2xl': { widths: [960, 1920], sizes: '960px' }
	};

	let { src, alt, size = 'lg', class: className, loading = 'lazy', ...restProps }: Props = $props();

	const CF_ZONE = 'https://images.wend-routing.com';

	function cfUrl(url: string, width: number) {
		return `${CF_ZONE}/cdn-cgi/image/width=${width},format=auto,quality=85/${encodeURI(url)}`;
	}

	const config = $derived(sizeConfig[size]);
	const srcset = $derived(config.widths.map((w) => `${cfUrl(src, w)} ${w}w`).join(', '));
	const imgSrc = $derived(cfUrl(src, config.widths[0]));
</script>

<img
	{alt}
	src={imgSrc}
	{srcset}
	sizes={config.sizes}
	{loading}
	class={cn(className)}
	{...restProps}
/>
