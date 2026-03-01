<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Organization } from '$lib/schemas/organization';
	import { Pencil } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		organization,
		triggerClass = '',
		children,
		onSuccess = () => {}
	}: {
		organization: Organization;
		triggerClass?: string;
		children?: Snippet;
		onSuccess?: (organization: Organization) => void;
	} = $props();

	// State
	const isDesktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);
</script>

{#if isDesktop.current}
	<Popover.Root bind:open>
		<Popover.Trigger class={triggerClass}>
			{#if children}
				{@render children()}
			{:else}
				<Button variant="outline" size="sm">
					<Pencil class="h-4 w-4" />
					Edit Organization
				</Button>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form
				bind:open
				{organization}
				onSuccess={(organization) => {
					open = false;
					onSuccess(organization);
				}}
			/>
		</Popover.Content>
	</Popover.Root>
{:else}
	<Drawer.Root bind:open>
		<Drawer.Trigger class={triggerClass}>
			{#if children}
				{@render children()}
			{:else}
				<Button variant="outline" size="sm">
					<Pencil class="h-4 w-4" />
					Edit Organization
				</Button>
			{/if}
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form
					bind:open
					{organization}
					onSuccess={(organization) => {
						open = false;
						onSuccess(organization);
					}}
				/>
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
