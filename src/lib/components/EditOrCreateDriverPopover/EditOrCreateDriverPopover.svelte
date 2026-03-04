<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Driver } from '$lib/schemas/driver';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Truck from '@lucide/svelte/icons/truck';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import type { Snippet } from 'svelte';
	import Form from './Form.svelte';

	type Props = {
		mapId?: string;
		triggerClass?: string;
		children?: Snippet<[{ props: Record<string, unknown> }]>;
		onSuccess?: (driver: Driver) => void;
	} & (
		| {
				mode?: 'create';
				driver?: never;
				temporaryDriver?: boolean;
				onDelete?: never;
		  }
		| {
				mode: 'edit';
				driver: Driver;
				temporaryDriver?: never;
				onDelete?: () => Promise<void>;
		  }
	);

	let {
		mode = 'create',
		driver,
		mapId,
		temporaryDriver = false,
		triggerClass = '',
		children,
		onSuccess = () => {},
		onDelete
	}: Props = $props();

	const isMobile = new IsMobile();
	let open = $state(false);

	function handleSuccess(driver: Driver) {
		open = false;
		onSuccess(driver);
	}
</script>

{#snippet trigger({ props }: { props: Record<string, unknown> })}
	{#if children}
		{@render children({ props })}
	{:else if mode === 'create'}
		<Button {...props} size="sm" variant="secondary">
			<Truck class="h-4 w-4" />
			Create Driver
		</Button>
	{:else}
		<Button {...props} variant="ghost" size="icon" aria-label="Edit driver">
			<Pencil class="h-4 w-4" />
		</Button>
	{/if}
{/snippet}

{#snippet formContent()}
	{#if mode === 'edit' && driver}
		<Form mode="edit" {driver} {mapId} {onDelete} onSuccess={handleSuccess} />
	{:else}
		<Form {mapId} {temporaryDriver} onSuccess={handleSuccess} />
	{/if}
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
