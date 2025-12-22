<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { Snippet } from 'svelte';

	let {
		title = 'Confirm Delete',
		description = 'Are you sure you want to delete this item? This action cannot be undone.',
		confirmText = 'Delete',
		cancelText = 'Cancel',
		onConfirm,
		trigger
	}: {
		title?: string;
		description?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void | Promise<void>;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	let open = $state(false);

	async function handleConfirm() {
		await onConfirm();
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger>
		{#snippet child({ props })}
			{@render trigger({ props })}
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="pt-4">
			<Button variant="outline" onclick={() => (open = false)}>
				{cancelText}
			</Button>
			<Button variant="destructive" onclick={handleConfirm}>
				{confirmText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
