<script lang="ts" module>
	import type { ButtonSize } from '$lib/components/ui/button';

	export type SortOption<T extends string = string> = {
		value: T;
		label: string;
	};

	export type SortButtonProps<T extends string = string> = {
		options: SortOption<T>[];
		value: T;
		direction: 'asc' | 'desc';
		size?: ButtonSize;
		class?: string;
	};
</script>

<script lang="ts" generics="T extends string = string">
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Select from '$lib/components/ui/select';
	import { cn } from '$lib/utils';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
let {
		options,
		value = $bindable(),
		direction = $bindable(),
		size = 'sm',
		class: className
	}: SortButtonProps<T> = $props();

	function toggleDirection() {
		direction = direction === 'asc' ? 'desc' : 'asc';
	}

	const currentLabel = $derived(
		options.find((opt) => opt.value === value)?.label ?? options[0]?.label ?? 'Sort'
	);

	// Map button size to select trigger size (Select only supports 'sm' | 'default')
	const selectSize = $derived.by((): 'sm' | 'default' => {
		if (size === 'sm' || size === 'icon-sm') return 'sm';
		return 'default';
	});
</script>

<ButtonGroup.Root class={cn(className)}>
	<Button variant="outline" {size} class="px-2" onclick={toggleDirection}>
		<ArrowDown
			class="h-4 w-4 transition-transform duration-200"
			style="transform: rotate({direction === 'asc' ? '180deg' : '0deg'})"
		/>
	</Button>
	<Select.Root
		type="single"
		{value}
		onValueChange={(v) => {
			if (v) value = v as T;
		}}
	>
		<Select.Trigger size={selectSize}>
			{currentLabel}
		</Select.Trigger>
		<Select.Content>
			{#each options as option (option.value)}
				<Select.Item value={option.value}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</ButtonGroup.Root>
