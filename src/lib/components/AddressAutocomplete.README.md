# AddressAutocomplete Component

A Svelte 5 address autocomplete component using shadcn-svelte UI components and the Mapbox Geocoding API.

## Features

- 🔍 **Real-time search** - Debounced address suggestions as you type
- 🌍 **Mapbox Geocoding** - Powered by Mapbox Places API
- 🎨 **shadcn-svelte** - Built with Command and Popover components
- ⚡ **Optimized** - Minimum 2 characters, 300ms debounce, max 8 results
- 🎯 **Type-safe** - Full TypeScript support with Zod schemas
- 🌎 **Country filtering** - Restrict results to specific countries
- ♿ **Accessible** - Keyboard navigation and ARIA attributes

## Usage

### Basic Example

```svelte
<script lang="ts">
	import AddressAutocomplete from '$lib/components/AddressAutocomplete.svelte';
	import type { GeocodingFeature } from '$lib/services/mapbox-geocoding';

	let address = $state('');

	function handleSelect(feature: GeocodingFeature) {
		console.log('Selected address:', feature.place_name);
		console.log('Coordinates:', feature.center); // [longitude, latitude]
	}
</script>

<AddressAutocomplete
	bind:value={address}
	placeholder="Enter an address..."
	onSelect={handleSelect}
/>
```

### With Country Restriction

```svelte
<AddressAutocomplete
	bind:value={address}
	country="US"
	placeholder="Enter a US address..."
	onSelect={handleSelect}
/>
```

### Disabled State

```svelte
<AddressAutocomplete
	bind:value={address}
	disabled={isLoading}
	placeholder="Enter an address..."
	onSelect={handleSelect}
/>
```

## Props

| Prop          | Type                                  | Default                      | Description                                         |
| ------------- | ------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `value`       | `string` (bindable)                   | `''`                         | The selected address string                         |
| `placeholder` | `string`                              | `'Search for an address...'` | Placeholder text for the search input               |
| `country`     | `string`                              | `'US'`                       | ISO 3166-1 alpha-2 country code to restrict results |
| `onSelect`    | `(feature: GeocodingFeature) => void` | `() => {}`                   | Callback when an address is selected                |
| `disabled`    | `boolean`                             | `false`                      | Disable the component                               |

## GeocodingFeature Type

When an address is selected, the `onSelect` callback receives a `GeocodingFeature` object:

```typescript
type GeocodingFeature = {
	id: string;
	type: 'Feature';
	place_type: string[];
	relevance: number;
	address?: string;
	text: string;
	place_name: string; // Full formatted address
	center: [number, number]; // [longitude, latitude]
	geometry: {
		type: 'Point';
		coordinates: [number, number];
	};
	context?: Array<{
		id: string;
		text: string;
		short_code?: string;
	}>;
	properties: Record<string, unknown>;
};
```

### Useful Properties

- `place_name` - Full formatted address string
- `center` - [longitude, latitude] coordinates
- `text` - Primary text (usually street address)
- `context` - Additional context (city, state, postal code, etc.)
- `relevance` - Confidence score (0-1)

## Demo

Visit `/demo/address-autocomplete` to see a live demo with examples.

## Dependencies

- `$lib/components/ui/command` - shadcn-svelte Command component
- `$lib/components/ui/popover` - shadcn-svelte Popover component
- `$lib/services/mapbox-geocoding` - Mapbox geocoding service
- `lucide-svelte` - Icons (MapPin, ChevronsUpDown, Check, Loader2)

## Implementation Details

### Debouncing

The component uses a 300ms debounce to avoid excessive API calls while typing.

### Minimum Characters

Address search requires at least 2 characters to prevent overly broad results.

### Result Limit

Returns up to 8 suggestions by default (configurable in the service call).

### Autocomplete Mode

Uses Mapbox's `autocomplete=true` parameter for optimized, fast responses suitable for autocomplete UIs.

### Address Types

By default, only searches for addresses. Can be extended to include other place types (poi, place, etc.) by modifying the service call.

## Styling

The component uses Tailwind CSS classes and shadcn-svelte theming. It adapts to your theme automatically.

The trigger button matches the styling of other form inputs and can be customized via the component's class props.

## API Configuration

Ensure your Mapbox API key is configured in the environment:

```
MAPBOX_ACCESS_TOKEN=your_token_here
```

The geocoding service is initialized in `$lib/services/mapbox-client.ts`.
