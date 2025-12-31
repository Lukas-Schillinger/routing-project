<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import { Pencil, Truck } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		mode = 'create',
		driver = undefined,
		mapId = undefined,
		temporaryDriver = false,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		mode?: 'create' | 'edit';
		driver?: Driver;
		mapId?: string;
		temporaryDriver?: boolean;
		triggerClass?: string;
		children?: Snippet<[{ props: Record<string, unknown> }]>;
		onSuccess?: (driver: Driver) => void;
	} = $props();

	// Validation
	$effect(() => {
		if (mode === 'edit' && !driver) {
			throw new Error('driver prop is required when mode is "edit"');
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
						<Truck class="mr-2 h-4 w-4" />
						Create Driver
					</Button>
				{:else}
					<Button {...props} variant="ghost" size="icon">
						<Pencil class="h-4 w-4" />
					</Button>
				{/if}
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{driver}
				{mode}
				{mapId}
				{temporaryDriver}
				onSuccess={(driver) => {
					open = false;
					onSuccess(driver);
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
						<Truck class="mr-2 h-4 w-4" />
						Create Driver
					</Button>
				{:else}
					<Button {...props} variant="ghost" size="icon">
						<Pencil class="h-4 w-4" />
					</Button>
				{/if}
			{/snippet}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form
					bind:open
					{driver}
					{mode}
					{mapId}
					{temporaryDriver}
					onSuccess={(driver) => {
						open = false;
						onSuccess(driver);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
