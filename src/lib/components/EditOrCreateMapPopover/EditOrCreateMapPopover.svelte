<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Map } from '$lib/schemas/map';
	import { Map as MapIcon, Pencil } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		map = undefined,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		map?: Map;
		triggerClass?: string;
		children?: Snippet<[{ props: Record<string, unknown> }]>;
		onSuccess?: (map: Map) => void;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !map) {
			throw new Error('map prop is required when mode is "edit"');
		}
	});

	// State
	const isDesktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);
</script>

{#if isDesktop.current}
	<Popover.Root bind:open>
		<Popover.Trigger class={triggerClass}>
			{#snippet child({ props })}
				{#if children}
					{@render children({ props })}
				{:else if mode === 'create'}
					<Button {...props} size="sm" variant="secondary">
						<MapIcon class="h-4 w-4" />
						Create Map
					</Button>
				{:else}
					<Button {...props} variant="ghost" size="icon" aria-label="Edit map">
						<Pencil class="h-4 w-4" />
					</Button>
				{/if}
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{map}
				{mode}
				onSuccess={(map) => {
					open = false;
					onSuccess(map);
				}}
			/>
		</Popover.Content>
	</Popover.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger class={triggerClass}>
			{#snippet child({ props })}
				{#if children}
					{@render children({ props })}
				{:else if mode === 'create'}
					<Button {...props} size="sm" variant="secondary">
						<MapIcon class="h-4 w-4" />
						Create Map
					</Button>
				{:else}
					<Button {...props} variant="ghost" size="icon" aria-label="Edit map">
						<Pencil class="h-4 w-4" />
					</Button>
				{/if}
			{/snippet}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form
					bind:open
					{map}
					{mode}
					onSuccess={(map) => {
						open = false;
						onSuccess(map);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
