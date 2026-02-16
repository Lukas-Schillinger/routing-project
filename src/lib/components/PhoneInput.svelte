<!-- @component PhoneInput - US phone number input with as-you-type formatting -->
<script lang="ts">
	import * as InputGroup from '$lib/components/ui/input-group';
	import { type WithElementRef } from '$lib/utils';
	import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';
	import { Phone } from 'lucide-svelte';
	import { tick } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = WithElementRef<HTMLInputAttributes, HTMLInputElement> & {
		value?: string | null;
		valid?: boolean;
	};

	let {
		ref = $bindable(null),
		value = $bindable(''),
		valid = $bindable(false),
		placeholder = '(555) 555-5555',
		class: className,
		disabled = false,
		...restProps
	}: Props = $props();

	let displayValue = $state('');

	// Format initial value if provided
	$effect(() => {
		if (value && !displayValue) {
			const formatter = new AsYouType('US');
			displayValue = formatter.input(value);
		}
	});

	// Taken from https://github.com/gyurielf/svelte-tel-input/blob/main/packages/svelte-tel-input/src/lib/components/input/TelInput.svelte
	function findNewCursorPosition(
		newValue: string,
		formattedValue: string,
		initialCursorPosition: number
	): number {
		if (initialCursorPosition >= newValue.length) {
			return formattedValue.length;
		}

		let fvIndex = 0;
		for (let nvIndex = 0; nvIndex < initialCursorPosition; nvIndex++) {
			const nvChar = newValue[nvIndex];

			// For each digit in the input, find the corresponding digit in the formatted value
			if (nvChar >= '0' && nvChar <= '9') {
				while (
					!(formattedValue[fvIndex] >= '0' && formattedValue[fvIndex] <= '9') &&
					fvIndex < formattedValue.length
				) {
					fvIndex++;
				}
				fvIndex++;
			}
		}

		return fvIndex;
	}

	async function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const rawValue = input.value;
		const cursorPosition = input.selectionStart ?? rawValue.length;

		// Format as user types
		const formatter = new AsYouType('US');
		const formatted = formatter.input(rawValue);

		// Calculate new cursor position before updating value
		const newCursorPosition = findNewCursorPosition(
			rawValue,
			formatted,
			cursorPosition
		);

		displayValue = formatted;
		value = rawValue.replace(/\D/g, '');
		valid = isValidPhoneNumber(formatted, 'US');

		// Wait for DOM update then restore cursor
		await tick();
		ref?.setSelectionRange(newCursorPosition, newCursorPosition);
	}
</script>

<InputGroup.Root class={className}>
	<InputGroup.Addon>
		<Phone class="size-4" />
	</InputGroup.Addon>
	<input
		bind:this={ref}
		data-slot="input-group-control"
		type="tel"
		{disabled}
		{placeholder}
		class="flex w-full min-w-0 bg-transparent px-3 py-1 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
		value={displayValue}
		oninput={handleInput}
		{...restProps}
	/>
</InputGroup.Root>
