# Handoff: AI Performance Audit — Load Screen → Report Document

## Overview
This package specifies a single feature: the **AI Performance Audit** that opens from a page's
Lighthouse/Core-Web-Vitals report. The user requests an audit; a **staged load screen** plays
("reading the trace → correlating vitals → tracing the critical chain → ranking fixes"); then it
resolves into a **generated audit document** — a diagnosis, a projected score lift, and a list of
**prioritized, impact-ranked fixes**, each with a copyable code snippet.

It is presented as a **focused side drawer** that slides in from the right (deliberately echoing the
existing Lighthouse "Full Report" drawer pattern).

The audit is powered by a **bring-your-own-key (BYO) AI integration**: before the first audit the
user connects their own API key (Gemini / Claude / OpenAI), and the call runs **directly from the
browser** with the key held in `sessionStorage` only. A scripted fallback always works offline.
**The full AI contract — connect flow, request/response shape, and the system prompt — is in
[`AI_SPEC.md`](./AI_SPEC.md); read that alongside this file.**

> Scope note: this bundle documents **only** the audit drawer — its two entry points, the load
> screen, and the result document. The surrounding dashboard (home, all-pages console, the report
> view itself) is out of scope except where it launches the drawer.

## About the Design Files
The files in `source/` are a **design reference built in HTML/CSS + React-via-Babel** — a working
prototype that demonstrates the intended look, motion, and behavior. They are **not** meant to be
shipped as-is. Your task is to **recreate this design in the target codebase** using its existing
framework, component library, state management, and styling system (CSS Modules, Tailwind,
styled-components, etc.). If the project has no front-end environment yet, pick the most appropriate
one and implement there.

The prototype uses `React.createElement` (`h(...)`) instead of JSX so it can run without a build step
in a browser. **Treat it as pseudocode for a normal component tree** — translate it to idiomatic JSX
(or your framework's equivalent). Don't replicate the `h()` calls literally.

## Fidelity
**High-fidelity.** Colors, typography, spacing, motion timing, and copy are final. Recreate the UI
pixel-perfectly, mapping the design tokens below onto your own system. The data shown is mock; wire it
to real audit output (see **Data Model**).

---

## The Two Entry Points
The drawer is opened by a single boolean state (`auditOpen`) on the report view. Two controls set it true:

1. **Header CTA** — a primary button, `Request AI audit`, in the report header
   (class `.audit-cta`, sparkle icon + label).
2. **Sidebar launcher card** — class `.audit-card`. A bordered card (accent-tinted border + a soft
   radial "glow" in the top-right corner) with a heading, a lead paragraph that names the failing
   metrics in bold, a full-width primary button `Request AI audit`, and a mono footnote
   ("Reasons over the median <profile> trace").

Both simply call `setAuditOpen(true)`. The drawer component is always mounted; visibility is driven by
the `open` prop toggling the `.open` class.

---

## Screen 0 — Connect (BYO key) `status === 'connect'`

The first state when the drawer opens **without** a stored key. It's the bring-your-own-key setup.
Full behavioral + security contract is in **`AI_SPEC.md` §2–3**; the visual spec:

**Container** `.audit-connect` — centered column, `max-width: 460px`, inside the scrolling body.

- **Hero** (`.ac-hero`, centered): a 52px accent-soft rounded **key glyph** tile, a serif title
  `Connect your AI` (26px), and a muted lead paragraph that bolds the page name —
  "Bring your own API key to audit **Homepage**. The model reasons over this page's real Core Web
  Vitals trace and returns prioritized, code-level fixes."
- **Provider picker** (`.ac-providers`, 3-col grid of `.ac-prov` cards): **Gemini** (badge "Free"),
  **Claude** ("Paid"), **OpenAI** ("Paid"). Selected card = accent border + accent-soft fill + a
  round accent check (`.ac-prov-check`) top-right. Gemini is the default.
- **API-key field** — a label row (`.ac-field-label`) with a right-aligned external link
  `Get a <Provider> key ↗` (`.ac-getkey`, opens the provider's console). Below it a password
  `<input>` (`.ac-key-input`, mono, placeholder = the provider's key prefix e.g. `AIza…`) with a
  trailing **eye toggle** (`.ac-eye`, Eye / EyeOff) to reveal the value. Enter submits when valid.
- **Trust panel** (`.ac-trust`, good-soft background): a shield icon + **"Stays in your browser"** /
  "Your key is held in this tab's session only — never sent to or stored on our servers, and cleared
  when you close the tab." **Render this copy verbatim — it's a trust contract.**
- **Primary CTA** (`.btn.primary.full.ac-go`): `✦ Connect & run audit`, **disabled** until the key
  is ≥ 12 chars. On click: persist key + provider to `sessionStorage`, transition to `generating`.
- **Scripted escape hatch** (`.ac-alt`): a centered divider with `Run scripted audit instead` —
  proceeds to `generating` using the offline `buildAudit()` (no key needed).
- **Footnote** (`.ac-foot`, mono): `Powered by <Provider> · <model> · free tier`.

**Connected pill** (header, once a key is stored, `status !== 'connect'`): `.audit-conn` shows a
green live dot + `<Provider>` + masked key (`AIza…7890`). Clicking it **disconnects** (clears
`sessionStorage`, returns to Screen 0).

> Validation/error states (rejected key, rate-limit, parse failure → scripted fallback) are
> specified in `AI_SPEC.md §3` and `§8`.

---

## Screen 1 — Drawer Shell (always present when open)

**Layout.** A fixed, full-viewport layer (`.audit-layer`, `z-index: 1000`) containing:
- **Scrim** (`.audit-scrim`): covers the viewport, `background: color-mix(ink 42%, transparent)`,
  `backdrop-filter: blur(2px)`, fades `opacity 0→1` over `.32s`. Clicking it closes the drawer.
- **Drawer panel** (`.audit-drawer`): pinned to the right edge, full height,
  `width: min(580px, 94vw)`, `background: var(--bg)`, `1px` left border, `--shadow-lg`. It's a
  vertical flex column. Slides in via `transform: translateX(102% → 0)` over
  `.4s cubic-bezier(.22,.61,.36,1)`.

**Open/close behavior.**
- Open = add `.open` to `.audit-layer` (enables pointer events, shows scrim, slides panel in).
- Close on: scrim click, the **✕** button, or **Escape** key.
- While open, **lock body scroll** (`document.body.style.overflow = 'hidden'`); restore on close.

**Header** (`.audit-head`, fixed, doesn't scroll):
- Left: a rounded accent-soft **glyph tile** (38×38, sparkle icon) + a two-line title block —
  kicker `AI Performance Audit` (serif, 18px/600) and a muted subline
  `<Page label> · <Desktop|Mobile> · median of 3 runs`.
- Right: **✕** close button (`.audit-x`, 32×32, bordered, hover darkens).

**Body** (`.audit-body`): `flex: 1; overflow-y: auto; padding: 22px`. Holds either Screen 2 or Screen 3.

---

## Screen 2 — Load Screen (staged generation)

Shown while `status !== 'done'`. Container `.audit-gen`.

**Structure (top → bottom):**
1. **Title** (`.gen-title`, serif 22px): `Auditing <b>Page Label</b>`.
2. **Note** (`.gen-note`, 13px muted): `Reasoning over the retained <profile> trace — no page re-run needed.`
3. **Step list** (`.gen-steps`) — one `.gen-step` row per stage. Each row:
   - A **status mark** (`.gen-mark`, 22px circle):
     - `wait` → small grey dot (`.gen-dot`), row at `opacity .5`.
     - `active` → accent-soft circle containing a spinning ring (`.gen-spin`, `audSpin .7s linear infinite`); row gets surface background + border + `--shadow-sm`, `opacity 1`.
     - `done` → solid `--good` circle with a white check, `opacity 1`.
   - A **label** (`.gen-label`, 14px/600) + a **mono detail** line (`.gen-detail`, 11.5px faint).
4. **Shimmer bar** (`.gen-shimmer`) — a 3px track with an accent gradient sweeping left→right (`audShim 1.1s ease-in-out infinite`).

**The four stages** (label + detail, all derived from the trace):
| # | Label | Detail (example) |
|---|-------|------------------|
| 1 | Reading sitespeed.io trace | `128 requests · 6.6 s visual-complete` |
| 2 | Correlating Core Web Vitals | `LCP 6.6 s · CLS 0.00 · TBT 756 ms` |
| 3 | Tracing the critical request chain | `4 render-blocking · 12 third-party` |
| 4 | Ranking fixes by projected score impact | `6 opportunities found` |

**Timing.** Each step activates sequentially: step *i* turns `active` at `460ms × (i+1)`, and the whole
thing flips to `done` (revealing Screen 3) at `460 × stepCount + 480` ms (≈ 2.3s total for 4 steps).
A "Regenerate" action in Screen 3 replays this with a faster `360ms` cadence. **Honor
`prefers-reduced-motion`**: skip spinners/shimmer and shorten or remove the staging delay.

State machine: `connect → generating → done` (connect is skipped when a key is already stored).
Step index advances 0→N; `step` drives each row's
`done | active | wait` state (`i < step ? done : i === step ? active : wait`).

---

## Screen 3 — Report Document (result)

Shown when `status === 'done'`. Container `.audit-result` (fades/rises in, `audFade .4s`). Sections top→bottom:

### 3a. Diagnosis (`.audit-verdict`)
- Eyebrow `Diagnosis` (`.av-label`, 11px/700, uppercase, tracked, faint).
- **Verdict** (`.av-text`, serif 18px/500) — a plain-English paragraph naming the bottleneck.
- **Critical chips** (`.av-crit` → `.crit-chip`): one pill per failing core metric, e.g.
  `● LCP critical` in poor-ink on poor-soft. Omitted when nothing is critical.

### 3b. Projected Score Lift (`.audit-lift`)
A bordered surface row, horizontal flex:
- **Current** column: label + big mono number (`.lift-n`, 32px) colored by score band.
- An **arrow** glyph.
- **Projected** column: same treatment, the post-fix score.
- Right-aligned **meta** (`.lift-meta`): `+N pts` in `--good` (`.lift-gain`, 16px) over a mono subline
  `~<time> faster · <N> fixes`.

Score → color band: `>=80 good`, `50–79 ni (needs-improvement)`, `<50 poor`.

### 3c. Fixes Header (`.audit-fixhead`)
`Prioritized fixes` (serif 18px) + subline `N · ranked by projected impact` + a right-aligned
**Copy all** button (`.copy-btn`) that copies the full audit as plain text.

### 3d. Fix Cards (`.audit-fixes` → `.afix`, one per fix, ranked)
Each card (`background --surface`, `1px border`, `--r-md`, `--shadow-sm`, `padding 16px 16px 14px 19px`):
- **Severity rail** (`.afix-rail`): a 4px colored bar pinned to the left edge —
  `critical → --poor`, `high → --ni`, `medium → --accent`, `low → --border-strong`.
- **Top row** (`.afix-top`): two-digit mono **rank** (`01`), a **severity tag** (`.afix-sev`, colored
  by level), a **metric chip** (`.afix-metric`, e.g. `LCP`, mono, bordered), a spacer, then the
  **gain** (`+12 pts`, `--good`) and an optional mono **savings** (`~0.4 s`).
- **Title** (`.afix-title`, 15.5px/700).
- **Why** (`.afix-why`, 13px muted) — the technical rationale.
- **Evidence chips** (`.afix-evidence` → `.ev-chip`): small mono fact pills (priority, discovery time, budget).
- **Code block** (`.afix-code`): a header (`.code-head`) with a uppercase **lang tag**
  (`.code-lang`, accent), the **caption**, and a per-snippet **Copy** button; below it a
  `<pre><code>` (`.code-pre`, mono 12px, horizontal scroll, preserves whitespace).
- **Footer** (`.afix-foot`): mono meta `Effort S · High confidence` on the left, a **Copy fix** button
  on the right (copies that one fix as text).

### 3e. Audit Footer (`.audit-foot`)
An info icon + caveat line (`Generated from the median trace. Estimates are directional — re-run the
page after applying fixes to confirm.`) and a right-aligned **Regenerate** ghost button that replays
the load screen.

---

## Interactions & Behavior (summary)
- **Open**: header CTA or sidebar card → `setAuditOpen(true)`.
- **Generate**: on open (and on page/profile change while open), build the audit object, set
  `status='generating'`, `step=0`, then run the staged timers above; set `status='done'` at the end.
  Clear all timers on unmount/close.
- **Close**: scrim click, ✕, or Escape → `setAuditOpen(false)`. Restore body scroll.
- **Copy** (three scopes): per-snippet (`Copy`), per-fix (`Copy fix`), whole audit (`Copy all`).
  Use `navigator.clipboard.writeText` with a `document.execCommand('copy')` fallback. On success, swap
  the button to a `✓ Copied` state (`.is-copied`) for ~1.6s.
- **Regenerate**: replays the staged load at the faster cadence, then re-reveals the document.

## State Management
Minimal local component state (no global store required):
| State | Type | Purpose |
|-------|------|---------|
| `auditOpen` | boolean | drawer visibility (lives on the report view) |
| `status` | `'connect' \| 'generating' \| 'done'` | connect (BYO) vs. load-screen vs. document |
| `conn` | `{provider,key} \| null` | the connected key, hydrated from `sessionStorage` (see AI_SPEC §2) |
| `step` | number | active stage index in the load screen |
| `audit` | object \| null | the built audit (see Data Model) |
| `copied` | string \| null | id of the most-recently-copied target, for the ✓ flash |

Side effects: a generation `useEffect` keyed on `(open, page.id, profile)` that builds the audit and
schedules the staged timers (cleanup clears them); a second `useEffect` for body-scroll-lock + the
Escape listener while open.

## Data Model
The audit object the UI renders (produced by `source/audit.js`, `buildAudit(detail)`):
```
{
  page, profile,
  score, projectedScore, totalGain,   // numbers (0–100)
  totalSavingsMs, criticalMetrics[],  // e.g. ["LCP","TBT"]
  verdict,                            // diagnosis string
  steps: [{ label, detail }],         // load-screen stages
  fixes: [{
    rank, sev,                        // 'critical'|'high'|'medium'|'low'
    metric, metricValue,              // target CWV
    title, why,                       // copy
    savingsMs, scoreGain,             // impact
    effort, confidence,               // 'S'|'M'|'L', 'High'|...
    evidence: [string],
    code: { lang, caption, snippet }
  }]
}
```
In the prototype this is **scripted deterministically from the page's real CWV metrics** (render-
blocking count, transfer breakdown, third-party weight) so the numbers always match the report. In
production, swap `buildAudit` for your real audit service / LLM call that returns the same shape — the
UI doesn't change. `source/audit.js` also exports `auditFixText(fix)` and `auditFullText(audit)`, the
plain-text builders used by the copy actions; keep their format if you want ticket-ready output.

## Design Tokens
Full token block (light + dark) is in `source/audit.css`. Key values:

**Neutrals (light):** bg `#eef2f2` · surface `#ffffff` · surface-2 `#f6f9f9` · border `#dde5e5` ·
border-strong `#c8d4d4` · ink `#0e1c1b` · ink-2 `#3a4b4a` · muted `#6b7d7c` · faint `#93a3a2`
**Accent (teal):** accent `#0e9b8c` · accent-soft `#d6f0ec` · accent-ink `#064f47`
**Status (CWV, constant across themes):** good `#138a5e`/soft `#dcf2e8`/ink `#0a4d34` ·
ni `#b97608`/soft `#f7ecd2`/ink `#6e4602` · poor `#cf3b38`/soft `#f7dedd`/ink `#7c1d1b`
**Radii:** sm 7 · md 12 · lg 18 (px). **Shadows:** sm/md/lg per `audit.css`.
**Type:** sans `Hanken Grotesk`; serif `Playfair Display` (titles/verdict); mono `JetBrains Mono`
(numbers, metric chips, code). A dark theme is included via `[data-theme="dark"]`.

**Motion:** drawer slide `.4s cubic-bezier(.22,.61,.36,1)`; scrim fade `.32s`; step cadence `460ms`
(regenerate `360ms`); spinner `audSpin .7s`; shimmer `audShim 1.1s`; result reveal `audFade .4s`.
Gate all of it behind `prefers-reduced-motion`.

## Assets
No raster assets. Icons are inline stroke SVGs (sparkle, check, arrow, code, info, refresh, bolt).
Substitute your codebase's icon set — names are referenced in `auditDrawer.jsx` via an `Icons` map.
Fonts (Hanken Grotesk, Playfair Display, JetBrains Mono) are Google Fonts; use your app's font setup.

## Files
## Files
- **`AI_SPEC.md`** — the BYO-key AI integration contract: connect flow, state machine,
  security rules, the model request/response schema, and **the full system prompt** (grounded in the
  `core-web-vitals` skill). **Read this with the README — it's where the real AI wiring lives.**
- `source/auditDrawer.jsx` — the drawer component: connect (BYO) screen, shell, load screen, result
  document, copy logic, sessionStorage key handling. **The primary reference for structure and behavior.**
- `source/audit.js` — `buildAudit()` (scripted audit generator) + the plain-text copy/export builders.
  This is the scripted fallback; the live model call returns the same object shape.
- `source/components.jsx` — shared icon set (incl. Key / Shield / Eye / EyeOff used by the connect screen).
- `source/audit.css` — self-contained styles: tokens (light + dark) + every audit class incl. the
  connect screen. Map onto your styling system.

> Reference only (not included — they belong to the larger dashboard): the report view that hosts the
> drawer (`pageDetail.jsx`) wires the two entry points and renders `<AuditDrawer open={…} det={…}
> onClose={…} />`. You only need to reproduce those three props and the `auditOpen` toggle.
