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

	let {
		color = 'currentColor',
		opacity = 0.4,
		class: className = ''
	}: Props = $props();

	// Convert color to URL-safe format for SVG data URI
	// Note: The actual topography SVG pattern should be added here
	const patternSvg = `<!-- ADD TOPOGRAPHY SVG PATTERN HERE -->`;
	
	// Encode the SVG for use in CSS
	const encodedSvg = encodeURIComponent(patternSvg);
</script>

<div
	class="pointer-events-none absolute inset-0 {className}"
	style="
		background-image: url(\"data:image/svg+xml,{encodedSvg}\");
		background-repeat: repeat;
		opacity: {opacity};
	"
	aria-hidden="true"
></div>
