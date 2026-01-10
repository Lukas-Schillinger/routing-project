<script lang="ts">
	import { PinInput as InputOTPPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";
	import { onMount } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(""),
		autofocus = false,
		...restProps
	}: InputOTPPrimitive.RootProps & { autofocus?: boolean } = $props();

	onMount(() => {
		if (autofocus && ref) {
			const firstInput = ref.querySelector("input");
			firstInput?.focus();
		}
	});
</script>

<InputOTPPrimitive.Root
	bind:ref
	bind:value
	data-slot="input-otp"
	class={cn(
		"flex items-center gap-2 has-disabled:opacity-50 [&_input]:disabled:cursor-not-allowed",
		className
	)}
	{...restProps}
/>
