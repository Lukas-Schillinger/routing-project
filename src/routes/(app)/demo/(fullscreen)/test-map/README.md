# Test Map Demo

This demo showcases a Google Maps-style bottom sheet interface over a fullscreen Mapbox map.

## Features

- **Fullscreen Mapbox Map**: Interactive map displaying all stops with custom markers
- **Draggable Bottom Sheet**: Google Maps-style bottom overlay that can be dragged to 3 snap positions:
  - Collapsed (18vh): Shows just the header
  - Mid (50vh): Shows drivers and some stops
  - Expanded (88vh): Full view of all content
- **Driver List**: Each driver card shows:
  - Name and phone number
  - Number of stops assigned
  - Progress bar indicating completion
  - Focus button to zoom map to their stops
- **Stops List**: Each stop shows:
  - Location name and address
  - Contact information
  - Package notes
  - Assigned driver
  - Button to focus map on that specific stop
- **Map Interactions**:
  - Custom numbered markers for each stop
  - Popups showing stop details on marker click
  - Auto-fit bounds to show all stops on load
  - Zoom to driver's route when clicking Focus button
  - Fly to specific stop when clicking its location button
- **Smart Touch Handling**:
  - Map interactions disabled while dragging the bottom sheet
  - Map interactions re-enabled when drag ends

## Technologies

- **Svelte 5**: Latest version with runes ($state, $props, snippets)
- **Mapbox GL JS**: For the interactive map
- **Tailwind CSS**: For styling
- **shadcn-svelte**: UI components (Badge, Button)
- **TypeScript**: Type-safe data handling with Zod schemas

## Usage

Navigate to `/demo/test-map` to see the demo in action.

Drag the bottom sheet handle up and down to see different snap positions. Click on markers, use the Focus buttons to interact with the map.

## Code Structure

- `+page.server.ts`: Mock data matching the real schema types (Driver, StopWithLocation)
- `+page.svelte`: Main page with map initialization and bottom sheet integration
- `BottomSheet.svelte`: Reusable draggable bottom sheet component
