# DayCapsule DESIGN.md

DayCapsule is a mobile-first personal memory journal for text, photos, and voice notes. The interface should feel like a set of quiet ceramic objects holding intimate daily records. It is warm but not cute, refined but not cold, and editorial but still highly usable for frequent everyday entry.

This document defines the visual system that AI agents must follow when designing new screens, revising existing ones, or extending the product.

## 1. Visual Theme & Atmosphere

### Core Design Thesis

Design DayCapsule as a **quiet ceramic journal**, not as a paper scrapbook, not as a productivity dashboard, and not as a glossy lifestyle app.

The UI should feel:

- calm
- warm
- restrained
- gently editorial
- emotionally supportive without being sentimental

### Product Mood

- The content is always the hero. UI should frame memories, never overpower them.
- Surfaces should feel smooth, soft, and carefully shaped, like glazed ceramic.
- The interface should communicate trust and slowness rather than urgency or stimulation.
- The app should feel personal and collected, not playful or noisy.

### Visual Personality

- Warm neutral backgrounds
- Rounded, stable shapes
- Light borders and low-contrast layering
- Sparse use of accent color
- Clear reading rhythm with medium visual density

### Explicit Anti-Moods

Do not drift into any of these directions unless explicitly requested:

- candy-color journaling app
- hard-tech control panel
- luxury fashion editorial with harsh contrast
- skeuomorphic paper notebook
- productivity SaaS dashboard

## 2. Color Palette & Roles

### Color System Strategy

Use a **three-layer color hierarchy**:

1. Warm neutrals build the world
2. Brand blue signals action and active state
3. Entry-type colors identify text, photo, and voice content only

### Foundation Neutrals

| Token | Hex | Role |
| --- | --- | --- |
| `page-bg` | `#FAF6EF` | Main app background, large quiet surfaces |
| `card-bg` | `#FFF9F2` | Primary content cards |
| `modal-bg` | `#FFF8F0` | Dialogs, sheets, elevated warm surfaces |
| `text-primary` | `#3F332A` | Headlines, body copy, primary labels |
| `text-secondary` | `#6F6257` | Metadata, helper text, quieter labels |
| `text-tertiary` | `#9E9084` | Placeholder text, subdued timestamps, inactive hints |
| `backdrop` | `rgba(34, 26, 20, 0.42)` | Modal and overlay scrim |

### Brand Action Color

| Token | Hex | Role |
| --- | --- | --- |
| `brand` | `#6A89CC` | Primary actions, current state, focused controls, search action |
| `brand-pressed` | `#5876B6` | Pressed and stronger active state |

Rules:

- Brand blue is for action, confirmation, active selection, and navigational emphasis.
- Do not use brand blue as a large screen wash or decorative background.
- A blue button should feel intentional and rare, not omnipresent.

### Entry Type Colors

| Token | Hex | Role |
| --- | --- | --- |
| `entry-text` | `#8F7AC8` | Text-entry marker, small chips, side accents |
| `entry-photo` | `#77C9D4` | Photo-entry marker, small chips, media accents |
| `entry-voice` | `#F0A53A` | Voice-entry marker, waveform highlights, small chips |

Rules:

- Entry colors classify content. They are not brand colors.
- Use them for side rails, icons, dots, chips, type badges, and light micro-accents.
- Never flood full cards, entire sections, or full-screen areas with these colors.
- Keep them low-saturation and mineral-like, never candy-like.

### Semantic Colors

| Token | Hex | Role |
| --- | --- | --- |
| `danger` | `#B96A57` | Destructive action, serious warning, failure emphasis |

Rules:

- Semantic colors should remain sparse.
- Avoid introducing a wide rainbow of semantic states unless a flow truly needs them.
- The neutral system should do most of the visual work.

## 3. Typography Rules

### General Direction

Typography should feel clean, modern, intimate, and readable. Prefer a stable sans-serif system voice over decorative branding.

- Primary direction: modern system sans-serif
- Tone: editorial restraint, not playful softness
- Priority: reading comfort over visual novelty

### Font Guidance

- Use the platform system sans as the default UI family.
- Keep primary reading and navigation text in a clean sans style.
- If a monospace accent is used, reserve it for rare metadata or technical micro-details only.
- Do not use handwriting, rounded toy-like, or overtly cute typefaces.

### Type Hierarchy

| Level | Purpose | Character |
| --- | --- | --- |
| Display Title | Month headers, major screen titles | Calm, confident, slightly heavier |
| Section Title | Group labels, dialogs, editor headings | Clear and stable |
| Body | Journal text, card content | Most important text layer |
| Meta | Date, time, sync state, helper descriptions | Smaller, quieter, lower contrast |
| Chip / Tag | Compact labels and filters | Tight, crisp, highly legible |

### Reading Rules

- Body text must always be the most readable text on the screen.
- Use generous line height for memory content and long-form entries.
- Reduce contrast and size for metadata instead of hiding it with opacity tricks.
- Timestamps and grouping labels should organize the timeline quietly, not shout.

### Weight and Contrast Rules

- Favor subtle hierarchy changes through weight and spacing before using large size jumps.
- Titles should feel composed, not promotional.
- Avoid ultra-thin text, especially on warm light backgrounds.

## 4. Component Stylings

### Search Bar

- The search field should feel like a glazed recess, not a floating SaaS control.
- Use a soft rounded capsule shape with low-contrast background separation.
- The search action may use brand blue, but the field itself should remain calm and neutral.
- Keep inner padding generous and avoid sharp border contrast.

### Timeline Structure

- Timeline grouping is the order system of the app.
- Month headers, day labels, and node markers must feel precise, calm, and dependable.
- The timeline line should stay visually light.
- Time anchors should guide the eye without looking playful or diagrammatic.

### Entry Cards

- Entry cards are the primary content containers and should feel quietly premium.
- Use warm light surfaces, soft corners, and minimal elevation.
- Prioritize whitespace and text rhythm inside each card.
- Use type-color accents sparingly: edge rails, small icons, tags, small labels.
- Do not use strong gradients, loud shadows, or saturated panel fills.

### Entry Type Shortcuts

- The text / photo / voice creation shortcuts should feel like serene content entry points.
- They should share one material language: same radius family, similar border treatment, calm icon presentation.
- They should not look like toy buttons or promotional tiles.

### Tags and Filter Chips

- Chips should feel like refined stamps, not badges screaming for attention.
- Use pale fills, clean borders, and compact typography.
- Keep chip contrast controlled and avoid stacking too many vivid tags in one area.

### Buttons

- Primary buttons may use `brand` when a decisive action is needed.
- Secondary buttons should rely on subtle border and surface shifts rather than filled color.
- Pressed states should feel slightly denser or more grounded, not bouncy.

### Dialogs and Sheets

- Dialogs, confirmations, and bottom sheets should feel like elevated ceramic surfaces from the same object family.
- Use warm surfaces, soft shadow only where needed, and stable rounded corners.
- Avoid default-looking harsh white modals if a custom surface is available.

### Editor Surfaces

- Text editor, toolbars, and docks should feel steady and low-noise.
- The writing area must read as a focused surface for thinking, not a tool-heavy composer.
- Toolbars should recede visually until needed.
- Keep controls aligned to the same warm neutral language as cards and dialogs.

### Voice Recording UI

- Voice recording can carry slightly more energy than the rest of the app.
- Use the voice accent color with restraint for waveform and active-record states.
- Even in this state, keep the product inside the same ceramic material system.
- Never shift into neon audio-tool aesthetics.

## 5. Layout Principles

### Density

Use **medium density**.

- Keep diary-flow continuity intact.
- Preserve enough breathing room for reading and reflection.
- Do not chase maximal information-per-screen at the cost of calmness.
- Do not over-expand spacing just to appear luxurious.

### Spacing Rhythm

- Screen-level spacing should provide quiet structure.
- Card-internal spacing should support reading cadence.
- Group spacing should distinguish time sections without breaking the continuous journal flow.

### Hierarchy Order

Establish hierarchy using this priority:

1. spacing
2. tonal contrast
3. border definition
4. elevation
5. color

Shadow should never be the first tool for solving hierarchy.

### Shape Language

- Prefer rounded, stable geometry
- Corners should feel intentional and consistent across the app
- Avoid sharp transitions between one component family and another

### Composition Rules

- Design screens vertically first; DayCapsule is a scrolling memory flow, not a dashboard grid.
- Prefer one strong content column over split-panel layouts.
- Avoid overloading the top of the screen with too many simultaneous controls.

## 6. Depth & Elevation

### Elevation Philosophy

Depth should be subtle and tactile, not theatrical.

- Use light borders and tonal changes before shadows.
- Let components feel separated by material and spacing rather than floating high above the page.
- Treat the UI as nested ceramic layers, not stacked paper cards.

### Shadow Rules

- Standard cards: almost no shadow, or an extremely soft near shadow
- Elevated bars, recorders, and confirmation surfaces: slightly stronger but still restrained shadow
- Avoid wide, blurry, attention-seeking shadows
- Avoid colored glow shadows for ordinary components

### Surface Hierarchy

| Level | Typical Elements | Treatment |
| --- | --- | --- |
| Level 0 | Page background | Quiet warm base |
| Level 1 | Cards, search field, content surfaces | Light fill difference + subtle edge |
| Level 2 | Sheets, dialogs, floating toolbars | Slightly brighter warm surface + restrained elevation |
| Level 3 | Critical overlays only | Stronger backdrop, not stronger decoration |

## 7. Do's and Don'ts

### Do

- Keep content as the visual center
- Use warm neutrals to create a calm world
- Use blue for action and active state, not for decoration
- Use entry colors only to classify text, photo, and voice content
- Keep all high-frequency surfaces in one consistent material family
- Let typography and spacing carry most of the interface order
- Make the app feel intimate, composed, and dependable

### Don't

- Do not turn the app into a cute scrapbook
- Do not turn the app into a monochrome tech dashboard
- Do not use candy gradients, loud surfaces, or large saturated fills
- Do not let chips, accents, or action buttons overpower journal content
- Do not mix unrelated styles across cards, dialogs, editors, and sheets
- Do not introduce heavy drop shadows to fake polish
- Do not invent a new dark mode or alternate visual system unless explicitly asked

## 8. Responsive Behavior

### Primary Target

This system is mobile-first and should primarily optimize for:

- iPhone and Android phone portrait layouts
- safe-area aware headers and bottom controls
- one-handed frequent use
- scroll-based reading and editing flows

### Adaptation Rules

- Preserve the single-column memory flow on small screens.
- Keep top actions compact and readable inside safe areas.
- Bottom actions must remain comfortably reachable.
- Dialogs and bottom sheets should maintain the same material language across device sizes.

### Touch and Accessibility

- Tap targets must remain comfortably touchable; refinement must never reduce usability.
- Body text must preserve strong readability against warm backgrounds.
- Metadata can be quieter, but never invisible.
- Entry type colors must not be the only signal; pair them with iconography, labels, or shape cues.
- Avoid low-contrast text on warm neutral surfaces.

### Web or Tablet Spillover

If this design system is temporarily used on tablet or web previews:

- keep the same calm single-column bias
- avoid turning the experience into a dashboard
- preserve large reading surfaces and warm material hierarchy

## 9. Agent Prompt Guide

Use these rules whenever generating or revising DayCapsule UI:

- Design for a mobile memory journal, not a productivity app.
- Preserve a quiet ceramic mood with warm neutrals and restrained hierarchy.
- Keep the current DayCapsule card-based diary flow intact unless a task explicitly changes information architecture.
- Use `#6A89CC` for actions and active state only.
- Use `#8F7AC8`, `#77C9D4`, and `#F0A53A` only for content type classification, never for full panels.
- Prefer soft borders, warm surfaces, and minimal shadows.
- Keep the interface intimate, readable, and calm.
- When in doubt, reduce noise rather than add flair.

### Fast Prompt Summary

Use this short prompt when an agent needs a compressed directive:

> Design this screen for DayCapsule, a mobile-first personal memory journal with a quiet ceramic visual language. Use warm neutral surfaces, restrained rounded geometry, calm editorial typography, brand blue only for actions, and muted type colors only for text/photo/voice classification. Prioritize reading rhythm, diary-flow continuity, and low-noise tactile surfaces over dashboards, candy colors, or flashy motion.

