<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { mapApi } from '$lib/services/api';
	import SphereGridLoader from './SphereGridLoader.svelte';

	let { mapId, onCancel }: { mapId: string; onCancel?: () => void } = $props();

	let isCancelling = $state(false);

	async function handleCancel() {
		if (isCancelling) return;

		isCancelling = true;
		try {
			await mapApi.cancelOptimization(mapId);
			onCancel?.();
		} catch (err) {
			console.error('Error cancelling optimization:', err);
		} finally {
			isCancelling = false;
		}
	}
</script>

<Card.Root>
	<Card.Content>
		<Empty.Root>
			<Empty.Header>
				<Empty.Media>
					<div class="flex items-center justify-center">
						<SphereGridLoader />
					</div>
				</Empty.Media>
				<Empty.Title>Optimizing Routes</Empty.Title>
				<Empty.Description>This may take a while.</Empty.Description>
			</Empty.Header>
			<Empty.Content>
				<div class="flex gap-2">
					<Button variant="outline" onclick={handleCancel} disabled={isCancelling}>
						{isCancelling ? 'Cancelling...' : 'Cancel'}
					</Button>
				</div>
			</Empty.Content>
		</Empty.Root>
	</Card.Content>
</Card.Root>
