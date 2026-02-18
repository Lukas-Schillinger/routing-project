<script lang="ts">
	import { cn } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		class: className,
		children,
		inset,
		variant = "default",
		...restProps
	}: {
		class?: string;
		children?: Snippet;
		inset?: boolean;
		variant?: "default" | "destructive";
		[key: string]: unknown;
	} = $props();
</script>

<!--
	A styled button that visually matches DropdownMenu.Item but does NOT use
	the Item primitive. This is intentional: the component is designed to be
	used as a render-delegate for Dialog.Trigger / Popover.Trigger *inside*
	a DropdownMenu.Content.

	Using the real Item primitive would:
	  1. Close the menu on select (tearing down the dialog/popover before it mounts)
	  2. Conflict on `id` with the trigger's own id (breaking data-highlighted)

	Using hover: pseudo-classes instead of data-highlighted: matches the old
	hand-rolled button pattern and avoids both problems.
-->
<button
	type="button"
	class={cn(
		"relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden",
		"[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		inset && "pl-8",
		variant === "destructive"
			? "text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:!text-destructive"
			: "hover:bg-accent hover:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</button>
