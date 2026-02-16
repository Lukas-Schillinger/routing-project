<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import { Pencil, Truck } from 'lucide-svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import type { Snippet } from 'svelte';
	import Form from './Form.svelte';

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

	$effect(() => {
		if (mode === 'edit' && !driver) {
			throw new Error('driver prop is required when mode is "edit"');
		}
	});

	const isMobile = new IsMobile();
	let open = $state(false);

	function handleSuccess(driver: Driver) {
		open = false;
		onSuccess(driver);
	}

	function handleCancel() {
		open = false;
	}
</script>

{#snippet trigger({ props }: { props: Record<string, unknown> })}
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

{#snippet formContent()}
	<Form
		{driver}
		{mode}
		{mapId}
		{temporaryDriver}
		onSuccess={handleSuccess}
		onCancel={handleCancel}
	/>
{/snippet}

{#if !isMobile.current}
	<Popover.Root bind:open>
		<Popover.Trigger class={triggerClass}>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			{@render formContent()}
		</Popover.Content>
	</Popover.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger class={triggerClass}>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				{@render formContent()}
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
