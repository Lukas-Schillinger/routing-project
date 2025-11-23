<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import SphereGridLoader from './SphereGridLoader.svelte';
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
					<Button variant="outline">cancel</Button>
				</div>
			</Empty.Content>
		</Empty.Root>
	</Card.Content>
</Card.Root>
