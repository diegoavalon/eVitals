---
version: alpha
name: eHealth
description: >-
  The visual identity of eHealth (ehealthinsurance.com) — a trusted, modern
  health-insurance marketplace. A confident green expresses health and
  reassurance; a single warm orange drives every primary action. Poppins gives
  headlines a friendly, rounded authority; Open Sans keeps long-form guidance
  calm and legible.
colors:
  primary: "#0c6e1e"
  primary-dark: "#0e3b12"
  primary-bright: "#4dcb2a"
  action: "#fa6200"
  action-hover: "#d14905"
  surface: "#ffffff"
  surface-canvas: "#e9f0ea"
  surface-muted: "#f0f0f0"
  surface-subtle: "#f8f8f8"
  on-surface: "#000000"
  on-surface-dark: "#333333"
  neutral: "#666666"
  border: "#cccccc"
  error: "#b8000f"
  alert: "#dc188e"
  warning: "#ffd35f"
typography:
  headline-display:
    fontFamily: '"Poppins", sans-serif'
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.33
  headline-lg:
    fontFamily: '"Poppins", sans-serif'
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.4
  headline-md:
    fontFamily: '"Poppins", sans-serif'
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.33
  headline-sm:
    fontFamily: '"Poppins", sans-serif'
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.5
  body-lg:
    fontFamily: '"Open Sans", sans-serif'
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.56
  body-md:
    fontFamily: '"Open Sans", sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: '"Open Sans", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  label-lg:
    fontFamily: '"Poppins", sans-serif'
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.33
  label-md:
    fontFamily: '"Open Sans", sans-serif'
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.5
  label-sm:
    fontFamily: '"Open Sans", sans-serif'
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.33
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 24px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 96px
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 16px 32px
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 16px 32px
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    border: "{colors.border}"
    padding: 12px 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-dark}"
    rounded: "{rounded.lg}"
    padding: 24px
---

# eHealth Design System

## Overview

eHealth is a national health- and Medicare-insurance marketplace, and its
identity is built to do one thing above all: earn trust quickly. The palette
leads with a deep, healthy **green** — health, growth, "go" — paired with a
single warm **orange** reserved exclusively for the call to action. Everything
else recedes into clean whites and the faintest green-tinted canvas so the eye
travels naturally from headline, to plan options, to the one button that moves
you forward.

The tone is **professional but approachable**. Headlines in Poppins read warm
and rounded rather than corporate; body copy in Open Sans is quiet and highly
legible, suited to dense plan details and disclosures. The layout is **spacious**
and generous, never cluttered — a lot of breathing room around large, optimistic
headlines and a photographic, human hero (a friendly licensed agent). The brand
feels like a knowledgeable guide: confident, calm, and reassuring at a moment
when people are making consequential, often anxious decisions about their health
coverage.

Descriptive names map to tokens as follows: **Forest Green** → `primary`,
**Deep Pine** → `primary-dark`, **Spring Green** → `primary-bright`, **Action
Orange** → `action`, and **Mist** (the pale green page wash) → `surface-canvas`.

## Colors

- **Primary — Forest Green `#0c6e1e`** (`primary`). The brand's signature. Used
  for links, secondary-button text, icons, and primary brand surfaces. It carries
  the health-and-trust message throughout the site.
- **Primary Dark — Deep Pine `#0e3b12`** (`primary-dark`). The headline color and
  visited-link state. Darker and more grounded, it gives large display type
  weight and excellent contrast on white.
- **Primary Bright — Spring Green `#4dcb2a`** (`primary-bright`). An energetic
  accent for icons, highlights, and decorative borders. Use sparingly to add lift.
- **Action — Orange `#fa6200`** (`action`). The single most important color in the
  system: it is reserved for primary calls to action (the "Compare plans" button).
  Its hover state deepens to `#d14905` (`action-hover`). Never use orange for
  decoration — its scarcity is what makes it read as "the next step."
- **Surfaces.** `surface` (`#ffffff`) is the default card and content background;
  `surface-canvas` (`#e9f0ea`) is the pale green page wash that frames white cards;
  `surface-muted` (`#f0f0f0`) and `surface-subtle` (`#f8f8f8`) are neutral fills for
  secondary panels and divided sections.
- **Text.** `on-surface` (`#000000`) for primary copy, `on-surface-dark` (`#333333`)
  for body within cards, and `neutral` (`#666666`) for muted/supporting text.
- **Lines.** `border` (`#cccccc`) for dividers and input outlines.
- **Status.** `error` (`#b8000f`) for validation errors, `alert` (`#dc188e`) for
  urgent callouts, and `warning` (`#ffd35f`) for cautionary highlights.

## Typography

Two families do all the work. **Poppins** (geometric, rounded) carries headlines
and button labels — it gives the brand its friendly authority. **Open Sans**
(humanist, neutral) carries all body and UI text, optimized for the legibility
that long insurance content demands.

- **headline-display** — Poppins 48px / 700, line-height 1.33. Hero statements.
- **headline-lg** — Poppins 40px / 700, line-height 1.4. Section titles.
- **headline-md** — Poppins 24px / 700. Sub-section headings.
- **headline-sm** — Poppins 20px / 700. Card titles.
- **body-lg** — Open Sans 18px / 400, line-height 1.56. Lead paragraphs.
- **body-md** — Open Sans 16px / 400, line-height 1.5. Default body text.
- **body-sm** — Open Sans 14px / 400. Fine print and helper text.
- **label-lg** — Poppins 18px / 700. Primary button and nav labels.
- **label-md** — Open Sans 16px / 700. Emphasis within UI.
- **label-sm** — Open Sans 12px / 700. Tags, badges, small captions.

## Layout

The system is built on an **8px base grid** with 4px available for fine
adjustments. Spacing steps run `xxs` (4px) → `xs` (8px) → `sm` (12px) → `md`
(16px) → `lg` (24px) → `xl` (32px) → `xxl` (48px) → `xxxl` (96px); 24px is the
workhorse rhythm for stacking content and 96px sets generous top-level section
breaks. Content is constrained to a centered container of roughly **1200px**
(the header uses a 75rem / 1200px max width) with comfortable side gutters, set
against the pale `surface-canvas` wash so white cards float clearly. The overall
feel is open and unhurried — large negative space around hero type, cards spaced
well apart, nothing fighting for attention except the orange CTA.

## Elevation & Depth

Depth is **soft and restrained**. The base raised element uses a subtle shadow
(`0 1px 4px rgba(0,0,0,0.2)`); interactive cards step up through a small set of
layered shadows (e.g. `0 4px 6px -1px rgba(0,0,0,0.1)` and `0 10px 15px -3px
rgba(0,0,0,0.1)` for hover/active lift). Most structure, though, comes from
color contrast — white cards on the green-tinted canvas and 1px `border`
dividers — rather than heavy shadow. The result reads clean and modern, not
skeuomorphic.

## Shapes

The shape language is **friendly and rounded**, echoing Poppins. Radii scale
`sm` (4px) for inputs and small controls, `md` (8px) for standard cards and
fields, `lg` (24px) for large feature cards and containers, and `full` (9999px)
for pill-shaped buttons and tags. The fully-rounded primary button is a
signature: the orange CTA is always a pill.

## Components

- **button-primary** — the orange pill. `action` background, white `label-lg`
  text, `full` radius, ~16px×32px padding; hovers to `action-hover`. The only
  element allowed to use orange. One per view, ideally.
- **button-secondary** — white background, `primary` green `label-lg` text,
  `full` radius. Used for lower-priority actions beside the primary CTA.
- **nav-link** — transparent background, `primary` green Poppins `label-lg`.
  Top-level navigation ("Find Health Insurance", "Learn", phone number).
- **input** — white field, `md` radius, 1px `border` outline, `body-md` text,
  12px×16px padding. ZIP-code and form fields.
- **card** — white surface on the canvas wash, `lg` (24px) radius, 24px padding,
  soft shadow on interaction. The container for plan options and content modules.

## Do's and Don'ts

- **Do** reserve orange (`action`) strictly for the single primary call to
  action. Its impact depends on scarcity.
- **Do** lead with green to signal health and trust; use Deep Pine
  (`primary-dark`) for headlines and Forest Green (`primary`) for links and icons.
- **Do** set headlines in Poppins and all body/UI copy in Open Sans — keep the
  two-family split clean.
- **Do** keep layouts spacious: stack on the 8px grid, let white cards breathe on
  the `surface-canvas` wash.
- **Don't** introduce additional accent hues. The palette is intentionally tight:
  green family + one orange + neutrals + status colors.
- **Don't** put more than one primary orange button in a single decision area —
  it dilutes the "next step."
- **Don't** lean on heavy drop shadows for structure; prefer borders and surface
  contrast.
- **Don't** mix font families within a single label — Poppins for headings/labels,
  Open Sans for prose, never blended mid-component.
  </content>
  </invoke>
