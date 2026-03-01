<!-- @component Create Invitation Popover for sending team invitations -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import * as Popover from '$lib/components/ui/popover';
	import type { Invitation } from '$lib/schemas';
	import { Plus } from 'lucide-svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import Form from './Form.svelte';

	// Props
	let {
		onCreateInvitation = () => {}
	}: {
		onCreateInvitation?: (invitation: Invitation) => void;
	} = $props();

	// State
	const isDesktop = new MediaQuery('(min-width: 768px)');
	let open = $state(false);

	// Handle open change
	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
	}
</script>

{#if isDesktop.current}
	<Popover.Root bind:open onOpenChange={handleOpenChange}>
		<Popover.Trigger>
			<Button variant="outline">
				<Plus class="h-4 w-4" />
				Invite User
			</Button>
		</Popover.Trigger>
		<Popover.Content class="w-96">
			<Form bind:open {onCreateInvitation} />
		</Popover.Content>
	</Popover.Root>
{:else}
	<Drawer.Root bind:open onOpenChange={handleOpenChange}>
		<Drawer.Trigger>
			<Button variant="outline">
				<Plus class="h-4 w-4" />
				Invite User
			</Button>
		</Drawer.Trigger>
		<Drawer.Content>
			<div class="p-4">
				<Form bind:open {onCreateInvitation} />
			</div>
		</Drawer.Content>
	</Drawer.Root>
{/if}
