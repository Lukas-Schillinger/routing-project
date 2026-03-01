<!-- @component Preferences card for account page -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Calendar, Key, Settings } from 'lucide-svelte';
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="flex items-center gap-3">
			<Settings class="h-5 w-5" />
			Preferences
		</Card.Title>
		<Card.Description
			>Additional settings and preferences (coming soon)</Card.Description
		>
	</Card.Header>
	<Card.Content>
		<div class="space-y-4 opacity-60">
			<div class="flex items-center justify-between">
				<div>
					<Label class="text-sm font-medium">Email Notifications</Label>
					<p class="text-sm text-muted-foreground">
						Receive updates about your routes and optimization
					</p>
				</div>
				<Button variant="outline" size="sm" disabled>
					<Settings class="h-4 w-4" />
					Configure
				</Button>
			</div>

			<Separator />

			<div class="flex items-center justify-between">
				<div>
					<Label class="text-sm font-medium">API Access</Label>
					<p class="text-sm text-muted-foreground">
						Manage API keys and third-party integrations
					</p>
				</div>
				<Button variant="outline" size="sm" disabled>
					<Key class="h-4 w-4" />
					Manage Keys
				</Button>
			</div>

			<Separator />

			<div class="flex items-center justify-between">
				<div>
					<Label class="text-sm font-medium">Data Export</Label>
					<p class="text-sm text-muted-foreground">
						Download your organization's data
					</p>
				</div>
				<Button variant="outline" size="sm" disabled>
					<Calendar class="h-4 w-4" />
					Export Data
				</Button>
			</div>
		</div>
	</Card.Content>
</Card.Root>
