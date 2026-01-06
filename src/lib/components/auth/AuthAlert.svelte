<script lang="ts">
	import * as Alert from '$lib/components/ui/alert';
	import { CircleCheck, Info, TriangleAlert } from 'lucide-svelte';

	interface Props {
		message: string | null | undefined;
		variant?: 'error' | 'success' | 'info';
		title?: string;
	}

	let { message, variant = 'error', title }: Props = $props();
</script>

{#if message}
	{#if variant === 'error'}
		<Alert.Root variant="destructive" class="text-destructive">
			<TriangleAlert class="h-4 w-4" />
			<Alert.Title>{title || 'Error'}</Alert.Title>
			<Alert.Description>{message}</Alert.Description>
		</Alert.Root>
	{:else if variant === 'info'}
		<Alert.Root class="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
			<Info class="h-4 w-4" />
			<Alert.Title class="line-clamp-2">{title || 'Info'}</Alert.Title>
			<Alert.Description>{message}</Alert.Description>
		</Alert.Root>
	{:else}
		<Alert.Root>
			<CircleCheck class="h-4 w-4" />
			<Alert.Title class="line-clamp-2">{title || message}</Alert.Title>
			{#if title}
				<Alert.Description>{message}</Alert.Description>
			{/if}
		</Alert.Root>
	{/if}
{/if}
