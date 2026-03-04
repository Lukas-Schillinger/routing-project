<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import type { Snippet } from 'svelte';

	type Variant = 'delete' | 'remove' | 'reset';

	const variantDefaults: Record<
		Variant,
		{ confirmText: string; title: string }
	> = {
		delete: { confirmText: 'Delete', title: 'Confirm Delete' },
		remove: { confirmText: 'Remove', title: 'Confirm Remove' },
		reset: { confirmText: 'Reset', title: 'Confirm Reset' }
	};

	let {
		variant = 'delete',
		title,
		description = 'Are you sure? This action cannot be undone.',
		confirmText,
		cancelText = 'Cancel',
		onConfirm,
		trigger
	}: {
		variant?: Variant;
		title?: string;
		description?: string;
		confirmText?: string;
		cancelText?: string;
		onConfirm: () => void | Promise<void>;
		trigger: Snippet<[{ props: Record<string, unknown> }]>;
	} = $props();

	let resolvedTitle = $derived(title ?? variantDefaults[variant].title);
	let resolvedConfirmText = $derived(
		confirmText ?? variantDefaults[variant].confirmText
	);

	let open = $state(false);
	let isLoading = $state(false);

	async function handleConfirm() {
		isLoading = true;
		try {
			await onConfirm();
			open = false;
		} finally {
			isLoading = false;
		}
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
			<Dialog.Title>{resolvedTitle}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="pt-4">
			<Button
				variant="outline"
				disabled={isLoading}
				onclick={() => (open = false)}
			>
				{cancelText}
			</Button>
			<Button
				variant="destructive"
				disabled={isLoading}
				onclick={handleConfirm}
			>
				{#if isLoading}
					<LoaderCircle class="h-4 w-4 animate-spin" />
				{/if}
				{resolvedConfirmText}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
