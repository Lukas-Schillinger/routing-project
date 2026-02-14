---
name: landing-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when working on the Wend landing page. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces for the Wend landing page. Implement real working code with exceptional attention to aesthetic details and creative choices. Avoid generic "AI slop" aesthetics.

The user provides frontend requirements: a component, page, section, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Wend Design Direction

**Aesthetic**: Precise, industrial-utilitarian with subtle retro-futuristic nods. Think modern logistics software that nods to mid-century technical manuals — structured, confident, and textured. Not flashy, but memorable through precision and material quality.

**Tone**: Authoritative and understated. The design should feel like a well-engineered tool, not a marketing site. Let the structure and texture do the talking.

### Typography

Already configured in the project — do not add new font imports:

- **Geist** — Body text, UI elements, navigation. Clean and mechanical.
- **Instrument Serif** — Display headings, hero text, pull quotes. Provides warmth and editorial contrast against Geist's precision.

Use Instrument Serif sparingly for impact. Geist carries the majority of the page. Consider monospaced Geist Mono for data labels, stats, or technical details where appropriate.

### Color Palette

Forest green dominant, soft cream base, light amber accent. Use CSS variables for consistency.

| Role | Color | Usage |
|---|---|---|
| **Primary / Forest Green** | `~#2D5A3D` | CTAs, headings, key UI elements, section backgrounds |
| **Background / Cream** | `~#F5F0E8` | Page base, card backgrounds, breathing room |
| **Accent / Light Amber** | `~#D4A853` | Highlights, hover states, badges, secondary CTAs |
| **Text / Charcoal** | `~#1A1A1A` | Body text, primary readable content |
| **Muted / Warm Gray** | `~#8A8578` | Secondary text, captions, dividers |

The palette should feel earthy but technical — like field equipment markings. Forest green is the dominant brand color; amber is used as a sharp accent, not spread evenly. Cream provides warmth without feeling soft.

### Animated Dithering (Paper Shaders)

Use `@paper-design/shaders` for animated texture effects. Install the vanilla JS package (`@paper-design/shaders`) since this is a Svelte project.

Available shaders worth considering: `dithering`, `grain-gradient`, `neuro-noise`, `dot-grid`, `halftone-dots`, `paper-texture`.

**Where to use shaders:**

- **Hero background**: A prominent dithered or grain-gradient backdrop behind the main hero section. This is the signature visual moment — make it count.
- **Section accents**: Lighter dithering or grain textures as section dividers, card backgrounds, or decorative strips between content blocks. Keep these subtle so they add depth without competing with the hero.

The dithering effect is the retro-futuristic nod — it should feel like a CRT screen or risograph print, but refined and intentional. Don't overdo it. The texture should enhance the industrial feel, not dominate.

### Spatial Composition

- **Grid-heavy layouts**: Structured, deliberate column systems. Use tight, disciplined grids.
- **Sharp geometry**: Crisp edges, right angles, minimal border-radius. If rounding, keep it very small (2-4px).
- **Technical precision**: Align elements to a strict baseline. Generous but consistent spacing.
- **Controlled density**: Pack information efficiently in some areas (stats, features) while leaving generous negative space in others (hero, CTAs).
- **Subtle asymmetry**: Offset elements slightly within the grid for visual interest without chaos.

### Motion & Interaction

- CSS-only animations preferred. Use `animation-delay` for staggered reveals on page load.
- Scroll-triggered entrances for content sections (use Svelte transitions or Intersection Observer).
- Hover states should feel mechanical — crisp color shifts, not soft fades. Short durations (150-200ms).
- The dithering shader provides ambient motion in the background — additional animation should complement, not compete with it.

### Illustrations & Product Examples

Landing pages live and die by how tangible they feel. Prioritize:

- **Inline product mockups**: Build miniature, working UI vignettes that demonstrate Wend's features — route cards, map snippets, optimization progress indicators. These should use real components or faithful recreations with working hover/click states, not static screenshots.
- **Interactive demos**: Small, self-contained interactions the visitor can touch — drag a route, toggle an optimization, click through a before/after. Even a simple animated state change makes the product feel real.
- **SVG illustrations**: When illustrations are needed, build them as inline SVGs in the Wend palette. Prefer technical/diagrammatic styles (route lines, node graphs, grid overlays) over cartoon or abstract blob illustrations.
- **Data as decoration**: Use real-looking stats, route counts, and metrics as visual elements. A grid of live-updating numbers is more compelling than a stock hero image.

Avoid placeholder "Lorem ipsum" content — use realistic routing/logistics copy and data. Real sample data is available in `test_data/` (CSV files with contacts, grocery stores, physical therapists — real-looking addresses and names).

## General Aesthetics Guidelines

Focus on:

- **Color & Theme**: Stick to the Wend palette above. Dominant forest green with sharp amber accents outperforms timid, evenly-distributed color. Use cream for breathing room.
- **Motion**: Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions. Shader backgrounds provide ambient movement.
- **Backgrounds & Visual Details**: Create atmosphere through dithered textures, grain overlays, and subtle patterns. Avoid flat solid-color sections — always add some material quality.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. This is a precise, industrial design — execute with restraint and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well, not from piling on effects.
