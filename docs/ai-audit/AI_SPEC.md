# AI Wiring Spec — Bring-Your-Own-Key Performance Audit

This document specifies the **client-side AI integration** for the audit drawer: the
bring-your-own-key (BYO) connect flow, the model request/response contract, and the
**system prompt** (grounded in the [`core-web-vitals` skill](https://github.com/addyosmani/web-quality-skills/tree/main/skills/core-web-vitals)).

> The UI is already built (`auditDrawer.jsx`). This doc is the contract for replacing the
> scripted `buildAudit()` with a real model call. The drawer's render code does **not**
> change — your call just has to return the same audit object shape (see §4).

---

## 1. Why BYO key (the hosting constraint)
The app is a **static site** (GitHub Pages) — there is no server to hold a secret key, and
any key embedded in the page's JS is publicly extractable. So for the public MVP, the
**user supplies their own API key**, the call goes **directly from the browser** to the
provider, and the key is stored **only in `sessionStorage`** (this tab, this session). It is
never transmitted to or stored on our servers.

When the app later moves behind an auth wall, swap the direct browser call for a tiny
server proxy that holds one shared key — the audit object shape stays identical, so the
drawer UI is unaffected.

---

## 2. Connect flow & state machine
The drawer has **three** states (`status`): `connect → generating → done`.

```
open drawer
   │
   ├─ sessionStorage has key? ──yes──▶ generating ──▶ done
   │                                      ▲
   └─ no ──▶ connect (BYO screen) ─────────┘
                 │  (or "Run scripted audit instead")
                 └────────────────────────────────────▶ generating (scripted fallback)
```

- **connect** — the BYO setup screen (provider picker + key field). Shown until a key is connected.
- **generating** — the staged load screen plays while the model call is in flight (see §5 for mapping the four stages onto a real call).
- **done** — the audit document renders.

### sessionStorage contract
| Key | Value |
|-----|-------|
| `evitals.ai.key` | the raw API key string |
| `evitals.ai.provider` | provider id: `gemini` \| `claude` \| `openai` |

On **Connect**: validate (non-empty, length ≥ 12), write both keys, transition to `generating`.
On **Disconnect** (the header pill): remove both keys, return to `connect`.
The connected pill shows `● <Provider> <masked key>` where masked = `first4…last4`.

### Provider config (from `auditDrawer.jsx`)
| id | label | default model | tier | key console |
|----|-------|---------------|------|-------------|
| `gemini` | Gemini | `gemini-2.5-flash` | **Free tier** | https://aistudio.google.com/apikey |
| `claude` | Claude | `claude-sonnet-4.5` | Paid | https://console.anthropic.com/settings/keys |
| `openai` | OpenAI | `gpt-4.1-mini` | Paid | https://platform.openai.com/api-keys |

Gemini is the default and the only free option — lead with it. Use a **Flash-class** model
(not Pro) to stay inside the free tier's daily request budget.

---

## 3. Security requirements (non-negotiable for BYO)
- **Never** persist the key beyond the session (`sessionStorage`, not `localStorage`, not a cookie). It clears when the tab closes.
- **Never** log, echo, or send the key anywhere except the provider's own endpoint over HTTPS.
- Show the "stays in your browser" reassurance copy verbatim (it's a trust contract with the user).
- Surface provider errors plainly: `401/403` → "That key was rejected — check it and try again"; `429` → "Rate-limited by <provider>. Wait a moment or use the scripted audit."; network error → offer the scripted fallback.
- Note in the UI that Gemini's **free tier may use prompts to improve Google's models** — users auditing sensitive URLs should use a paid tier.
- Gemini requires **referrer-restricted keys** (unrestricted keys are being blocked) — mention this in the "Get a key" help text.

---

## 4. The audit object contract (what the model must return)
The model must return **strict JSON** matching the shape the drawer renders. This is the
same object `buildAudit()` produces today:

```jsonc
{
  "score": 72,                    // current Lighthouse perf score (you pass this in)
  "projectedScore": 98,           // estimated score after all fixes (cap ~98)
  "totalGain": 26,                // projectedScore - score
  "totalSavingsMs": 677,          // summed directional time savings
  "criticalMetrics": ["CLS"],     // metrics currently in the "poor" band
  "verdict": "Homepage is held back by CLS. The critical path is the bottleneck — …",
  "fixes": [
    {
      "rank": 1,                          // 1-based, after sorting by impact
      "sev": "critical",                  // critical | high | medium | low
      "metric": "FCP",                    // target metric label
      "metricValue": "2.7 s",             // current value, formatted
      "title": "Eliminate render-blocking CSS and head scripts",
      "why": "4 resources block first paint for ~1.1 s, including app.7f3c.css … Inline the critical above-the-fold CSS, defer the rest.",
      "savingsMs": 494,                   // null if the fix targets CLS (unitless)
      "scoreGain": 12,                    // projected Lighthouse points
      "effort": "M",                      // S | M | L
      "confidence": "High",               // High | Medium | Low
      "evidence": ["4 render-blocking requests", "~1.1 s before first paint"],
      "code": {
        "lang": "html",                   // html | css | js | nginx | …
        "caption": "Defer non-critical CSS + scripts",
        "snippet": "<link rel=\"stylesheet\" href=\"/app.css\" media=\"print\" onload=\"this.media='all'\">"
      }
    }
    // … more fixes, ranked
  ]
}
```

**Rules the model must follow:**
- `fixes` sorted by descending impact; `rank` reassigned 1..N after sorting.
- `projectedScore = min(98, score + Σ scoreGain)` — never promise 100.
- Every `evidence` item must be traceable to a metric you passed in — **no invented numbers**.
- `savingsMs` is `null` for CLS-only fixes (CLS is unitless); include a target CLS in `why` instead.
- One concrete, copy-pasteable `code` snippet per fix.

Parse defensively: request JSON-only output, strip any markdown fences, `JSON.parse`, and on
any parse/shape failure **fall back to the scripted `buildAudit()`** so the UI never breaks.

---

## 5. Mapping the staged load screen onto a real call
The four stages (`Reading trace → Correlating CWV → Tracing critical chain → Ranking fixes`)
are **cosmetic** — they convey progress while one request is in flight. Two options:
- **Simple:** start the timed stage animation, fire the request, and reveal `done` when *both*
  the animation's minimum duration **and** the response have completed (whichever is later).
- **Streaming (nicer):** if the provider streams, advance the stage as tokens arrive
  (e.g. flip to stage 4 once the `fixes` array starts parsing). Optional.

Keep a **minimum visible duration** (~1.5–2 s) so the staging doesn't flash on a fast response.

---

## 6. SYSTEM PROMPT
Send this as the system / developer message. It encodes the senior-engineer voice and the
Core Web Vitals knowledge from the `core-web-vitals` skill. The page's live metrics go in the
**user** message (§7).

```text
You are a senior web performance engineer conducting a Core Web Vitals audit of a single
web page. You are direct, technical, and precise. You reason only from the trace data you are
given — you never invent metrics, request URLs, or savings you cannot derive from it.

# Core Web Vitals reference (Google, measured at the 75th percentile)
| Metric | Measures        | Good     | Needs work    | Poor     |
| LCP    | Loading         | ≤ 2.5 s  | 2.5 s – 4 s   | > 4 s    |
| INP    | Interactivity   | ≤ 200 ms | 200 – 500 ms  | > 500 ms |
| CLS    | Visual stability| ≤ 0.10   | 0.10 – 0.25   | > 0.25   |

Supporting lab metrics you will also receive:
- TBT (Total Blocking Time) is the lab proxy for INP. Treat high TBT as an interactivity
  problem and apply INP fixes (break up long tasks, defer third-party JS, yield to the scheduler).
- FCP (First Contentful Paint) and SI (Speed Index) describe how fast the page paints; they are
  driven mostly by TTFB, render-blocking resources, and critical-path CSS.

# Your task
1. Diagnose the single biggest bottleneck in one or two sentences (the `verdict`). Name the
   failing metric(s) and the cause (e.g. render-blocking critical path, late LCP discovery,
   main-thread saturation from third parties, unreserved layout space).
2. Produce a prioritized list of fixes, each tied to a target metric, ranked by projected
   Lighthouse score impact (most impactful first).
3. For each fix give: a target metric, a severity, a technical `why` grounded in the trace,
   one concrete copy-pasteable code snippet, an effort estimate, a confidence level, and the
   evidence you used.

# Fix patterns to draw from (prefer these proven techniques)
LCP:
- Preload the LCP image and set fetchpriority="high" so it is discovered during initial HTML parse:
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
- Inline critical above-the-fold CSS (< 14 KB); defer the rest with a print-media swap:
  <link rel="stylesheet" href="/app.css" media="print" onload="this.media='all'">
- Cut TTFB < 800 ms (CDN, edge cache, SSR/SSG). Serve AVIF/WebP, right-sized via srcset.
- font-display: swap (or optional) so web fonts don't block text.
- For likely-next navigations, add Speculation Rules (prerender, moderate eagerness) to make
  the *next* page's LCP ~0 ms — but warn that side effects fire early and to scope `where`.

INP / TBT:
- Break long tasks into chunks and yield with scheduler.yield() (fallback setTimeout(0)).
- Give immediate visual feedback in handlers, then yield before heavy work; defer analytics
  with requestIdleCallback.
- Move heavy third-party tags off the main thread (e.g. a web worker / Partytown) or lazy-load
  them on interaction or visibility.

CLS:
- Give every <img>, <video>, ad, and embed explicit width/height or aspect-ratio.
- Reserve space for injected slots (min-height); insert dynamic content below the viewport.
- Animate transform/opacity only — never width/height/top/left.
- font-display: optional or size-adjust/ascent-override to match fallback metrics.

# Output contract
Return ONLY a JSON object (no prose, no markdown fences) matching exactly this shape:
{ "score", "projectedScore", "totalGain", "totalSavingsMs", "criticalMetrics", "verdict",
  "fixes": [ { "rank","sev","metric","metricValue","title","why","savingsMs","scoreGain",
               "effort","confidence","evidence":[…],"code":{"lang","caption","snippet"} } ] }

Constraints:
- sev ∈ critical|high|medium|low; effort ∈ S|M|L; confidence ∈ High|Medium|Low.
- Sort fixes by descending impact; set rank = 1..N after sorting.
- projectedScore = min(98, score + sum(scoreGain)). Never claim 100.
- savingsMs is null for CLS-only fixes; put the target CLS in `why`.
- Every evidence item must be derivable from the supplied trace. No fabricated numbers.
- Voice: senior performance engineer — direct, technical, no filler, no marketing language.
```

---

## 7. USER MESSAGE (the page's live trace)
Serialize the page's real metrics (the same data the report renders) as JSON and send it as
the user turn:

```json
{
  "page": { "label": "Homepage", "group": "Acquisition", "url": "/" },
  "profile": "mobile",
  "score": 72,
  "cwv": { "LCP": 6600, "CLS": 0.769, "TBT": 756, "FCP": 2700, "SI": 4000, "INP": null, "TTFB": 920 },
  "renderBlocking": [
    { "name": "app.7f3c.css", "blockMs": 420 },
    { "name": "theme.2a91.css", "blockMs": 310 }
  ],
  "thirdParty": 12,
  "transfer": { "total": 2400000, "image": 980000, "script": 760000, "css": 120000 },
  "totalRequests": 128,
  "visualCompleteMs": 6600
}
```

(Units: ms for time metrics, raw ratio for CLS, bytes for transfer.) The model returns the
§4 object; render it through the existing drawer unchanged.

---

## 8. Reference: the scripted fallback
`source/audit.js` (`buildAudit`) already produces a valid §4 object deterministically from the
same input. Keep it as: (a) the "Run scripted audit instead" path, and (b) the automatic
fallback whenever the model call errors, rate-limits, or returns unparseable JSON. This is what
guarantees the feature works offline and never shows the user a broken state.
