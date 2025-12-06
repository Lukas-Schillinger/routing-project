<!-- @component Topography - Hero patterns topography background texture -->
<script lang="ts">
	interface Props {
		/** Primary color for the pattern (CSS color value) */
		color?: string;
		/** Opacity of the pattern (0-1) */
		opacity?: number;
		/** Additional CSS classes */
		class?: string;
	}

	let { color = '#9C92AC', opacity = 0.4, class: className = '' }: Props = $props();

	// Encode color for SVG data URI (replace # with %23)
	const encodedColor = $derived(color.replace('#', '%23'));

	// Build the full background image URL
	const backgroundImage = $derived(
		`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='${encodedColor}' fill-opacity='${opacity}' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E")`
	);
</script>

<div
	class="pointer-events-none absolute inset-0 h-full w-full {className}"
	style:background-image={backgroundImage}
	style:background-repeat="repeat"
	aria-hidden="true"
></div>
