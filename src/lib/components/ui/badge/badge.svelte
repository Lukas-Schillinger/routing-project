<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { BadgeProps } from './index.js';
	import { badgeVariants } from './index.js';

	type $$Props = BadgeProps;

	let className: $$Props['class'] = undefined;
	export let variant: $$Props['variant'] = 'default';
	export { className as class };
</script>

<div class={cn(badgeVariants({ variant }), className)} {...$$restProps}>
	<slot />
</div>
