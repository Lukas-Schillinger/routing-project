Frontend review checklist based on the [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines).

### Accessibility & Semantics

- Icon-only buttons MUST have a descriptive `aria-label`
- Visible focus rings on all interactive elements (`:focus-visible`)
- NEVER `outline: none` without a visible replacement
- `<a>`/`<Link>` for navigation, `<button>` for actions — NEVER `<div onClick>` for either
- `<title>` matches current page context
- Decorative elements have `aria-hidden`; meaningful elements have accessible names
- "Skip to content" link present; `scroll-margin-top` on anchor targets
- Prefer native semantics (`button`, `a`, `label`, `table`) before ARIA roles

### Text & Numbers

- Use the `…` character (U+2026), never `...`
- Placeholders that prompt typing end with `…` (e.g. `"Search maps…"`, `"Enter your name…"`); example-value placeholders don't (e.g. `"you@example.com"`)
- `tabular-nums` on numbers in comparison/changing contexts (pagination, counts, tables)
- Text containers handle long content (`truncate`, `line-clamp-*`, `break-words`)
- Flex children that truncate need `min-w-0`
- Curly quotes; avoid widows/orphans (`text-wrap: balance`)
- Redundant status cues (not color-only); icons have text labels
- Resilient to user-generated content (short / average / very long)

### Forms

- Loading buttons show spinner AND keep the original label text
- Submit stays enabled until the request starts; then disabled with spinner
- Errors inline next to fields; on submit, focus first error field
- NEVER block paste in inputs
- `autocomplete` + meaningful `name`; correct `type` and `inputmode`
- No dead zones on checkboxes/radios — label and control share one hit target
- Enter submits focused input; in `<textarea>`, Cmd/Ctrl+Enter submits
- Compatible with password managers and 2FA; allow pasting codes
- Disable spellcheck for emails, codes, usernames
- Trim input values to handle trailing spaces from text expansion
- Autofocus on desktop with a single primary input; rarely on mobile

### Images & Loading

- Explicit `width` and `height` on `<img>` to prevent CLS
- Placeholder background (`bg-muted` or skeleton) while images load
- Skeletons mirror final content dimensions to avoid layout shift
- Design empty, sparse, dense, and error states — no dead ends

### Targets

- Hit targets ≥ 24px (mobile ≥ 44px); if visual element is smaller, expand the hit area
- Mobile `<input>` font-size ≥ 16px to prevent iOS auto-zoom

### Keyboard & Focus

- Full keyboard support per [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) patterns
- Focus management: trap in modals, move on open, return on close

### State & Navigation

- URL reflects all restorable state (filters, tabs, pagination, expanded panels)
- Back/Forward restores scroll position
- Warn on unsaved changes before navigation (only if the content is important)

### Touch & Drag

- `overscroll-behavior: contain` in modals and drawers
- During drag: disable text selection, set `inert` on dragged element
- Delay first tooltip; subsequent peer tooltips show instantly
- If it looks clickable, it must be clickable

### Animation

- Honor `prefers-reduced-motion` (reduced variant or disable)
- Animate only compositor-friendly props (`transform`, `opacity`)
- NEVER `transition: all` — list properties explicitly
- Animations must be interruptible and input-driven (no autoplay)
- Correct `transform-origin` — motion starts where it physically should

### Layout

- Verify mobile, laptop, ultra-wide (simulate at 50% zoom)
- Respect safe areas (`env(safe-area-inset-*)`)
- No unwanted scrollbars; fix overflows
- Optical alignment: adjust +/-1px when perception beats geometry

### Performance

- Virtualize large lists (> 50 items)
- Preload above-fold images; lazy-load below-fold
- `<link rel="preconnect">` for CDN domains
- Critical fonts: `<link rel="preload" as="font">` with `font-display: swap`
- Batch layout reads/writes; avoid reflows/repaints
- Mutations (`POST`/`PATCH`/`DELETE`) target < 500ms

### Dark Mode & Theming

- `<meta name="theme-color">` reactive to current mode, matching page background
- `color-scheme: dark` on `<html>` when dark theme is active
- Native `<select>`: explicit `background-color` and `color` (Windows rendering fix)

### Design Polish

- Layered shadows (ambient + direct)
- Crisp edges via semi-transparent borders + shadows
- Nested radii: child ≤ parent, concentric
- Hue consistency: tint borders/shadows/text toward background hue
- Meet contrast — prefer [APCA](https://apcacontrast.com/)
- Increase contrast on `:hover`/`:active`/`:focus`

### Feedback

- Confirm destructive actions or provide an Undo window
- Use polite `aria-live` for toasts and inline validation
- Ellipsis (`…`) for menu options that open follow-ups ("Rename…") and loading states ("Loading…")
