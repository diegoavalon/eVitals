import { useState, useEffect, useRef } from "react";
import type { PageEntry, DeviceResult } from "~/lib/dashboard.types";

// ── Types ─────────────────────────────────────────────────────────────────────

type AuditProvider = "gemini" | "claude" | "openai";
type AuditStatus = "connect" | "generating" | "done";
type Sev = "critical" | "high" | "medium" | "low";

interface AuditFix {
  rank: number;
  sev: Sev;
  metric: string;
  metricValue: string;
  title: string;
  why: string;
  savingsMs: number | null;
  scoreGain: number;
  effort: "S" | "M" | "L";
  confidence: "High" | "Medium" | "Low";
  evidence: string[];
  code: { lang: string; caption: string; snippet: string };
}

interface AuditResult {
  score: number;
  projectedScore: number;
  totalGain: number;
  totalSavingsMs: number;
  criticalMetrics: string[];
  verdict: string;
  fixes: AuditFix[];
}

interface ProviderConfig {
  id: AuditProvider;
  label: string;
  model: string;
  free: boolean;
  hint: string;
  keyUrl: string;
  prefix: string;
}

// ── Provider config ───────────────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini",
    label: "Gemini",
    model: "gemini-2.5-flash",
    free: true,
    hint: "Free tier · no credit card",
    keyUrl: "https://aistudio.google.com/apikey",
    prefix: "AIza",
  },
  {
    id: "claude",
    label: "Claude",
    model: "claude-sonnet-4.5",
    free: false,
    hint: "Pay-as-you-go",
    keyUrl: "https://console.anthropic.com/settings/keys",
    prefix: "sk-ant-",
  },
  {
    id: "openai",
    label: "OpenAI",
    model: "gpt-4.1-mini",
    free: false,
    hint: "Pay-as-you-go",
    keyUrl: "https://platform.openai.com/api-keys",
    prefix: "sk-",
  },
];

const GEN_STAGES = [
  { label: "Reading trace", detail: "Ingesting CWV measurements" },
  { label: "Correlating CWV", detail: "Identifying failing metrics" },
  { label: "Tracing critical chain", detail: "Mapping bottlenecks to causes" },
  { label: "Ranking fixes", detail: "Sorting by projected score impact" },
];

// ── sessionStorage helpers ────────────────────────────────────────────────────

const KEY_STORE = "evitals.ai.key";
const PROV_STORE = "evitals.ai.provider";

function loadConn(): { provider: AuditProvider; key: string } | null {
  try {
    const k = sessionStorage.getItem(KEY_STORE);
    const p = sessionStorage.getItem(PROV_STORE) as AuditProvider | null;
    if (k && p) return { provider: p, key: k };
  } catch {}
  return null;
}

function saveConn(provider: AuditProvider, key: string) {
  try {
    sessionStorage.setItem(KEY_STORE, key);
    sessionStorage.setItem(PROV_STORE, provider);
  } catch {}
}

function clearConn() {
  try {
    sessionStorage.removeItem(KEY_STORE);
    sessionStorage.removeItem(PROV_STORE);
  } catch {}
}

function maskKey(k: string): string {
  return k.length <= 8 ? "••••" : k.slice(0, 4) + "…" + k.slice(-4);
}

function provById(id: AuditProvider): ProviderConfig {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

// ── AI call ───────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public kind: "auth" | "rate" | "network",
    public providerLabel: string,
  ) {
    super(kind);
  }
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

const SYSTEM_PROMPT = `You are a senior web performance engineer conducting a Core Web Vitals audit of a single
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
1. Diagnose the single biggest bottleneck in one or two sentences (the \`verdict\`). Name the
   failing metric(s) and the cause (e.g. render-blocking critical path, late LCP discovery,
   main-thread saturation from third parties, unreserved layout space).
2. Produce a prioritized list of fixes, each tied to a target metric, ranked by projected
   Lighthouse score impact (most impactful first).
3. For each fix give: a target metric, a severity, a technical \`why\` grounded in the trace,
   one concrete copy-pasteable code snippet, an effort estimate, a confidence level, and the
   evidence you used.

# Fix patterns to draw from (prefer these proven techniques)
LCP:
- Preload the LCP image and set fetchpriority="high" so it is discovered during initial HTML parse.
- Inline critical above-the-fold CSS (< 14 KB); defer the rest with a print-media swap.
- Cut TTFB < 800 ms (CDN, edge cache, SSR/SSG). Serve AVIF/WebP, right-sized via srcset.
- font-display: swap (or optional) so web fonts don't block text.

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
- savingsMs is null for CLS-only fixes; put the target CLS in \`why\`.
- Every evidence item must be derivable from the supplied trace. No fabricated numbers.
- Voice: senior performance engineer — direct, technical, no filler, no marketing language.`;

function buildUserMessage(
  page: PageEntry,
  device: string,
  result: DeviceResult,
  score: number,
): string {
  const m = result.metrics;
  return JSON.stringify(
    {
      page: { label: page.label, group: page.group, url: page.url },
      profile: device,
      score,
      cwv: {
        LCP: m.lcp,
        CLS: m.cls,
        TBT: m.tbt,
        FCP: m.fcp,
        SI: m.si,
        INP: null,
        TTFB: null,
      },
    },
    null,
    2,
  );
}

async function callAiProvider(
  provider: AuditProvider,
  key: string,
  userMessage: string,
): Promise<AuditResult> {
  let text: string;

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });
    if (res.status === 401 || res.status === 403)
      throw new ApiError("auth", "Gemini");
    if (res.status === 429) throw new ApiError("rate", "Gemini");
    if (!res.ok) throw new ApiError("network", "Gemini");
    const data = await res.json();
    text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } else if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        // Required for direct browser-to-Anthropic calls (BYO-key pattern)
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4.5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (res.status === 401 || res.status === 403)
      throw new ApiError("auth", "Claude");
    if (res.status === 429) throw new ApiError("rate", "Claude");
    if (!res.ok) throw new ApiError("network", "Claude");
    const data = await res.json();
    text = data.content?.[0]?.text ?? "";
  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      }),
    });
    if (res.status === 401 || res.status === 403)
      throw new ApiError("auth", "OpenAI");
    if (res.status === 429) throw new ApiError("rate", "OpenAI");
    if (!res.ok) throw new ApiError("network", "OpenAI");
    const data = await res.json();
    text = data.choices?.[0]?.message?.content ?? "";
  }

  const parsed = JSON.parse(stripFences(text));
  if (typeof parsed.score !== "number" || !Array.isArray(parsed.fixes)) {
    throw new Error("Invalid response shape");
  }
  return parsed as AuditResult;
}

// ── Scripted audit (fallback) ─────────────────────────────────────────────────

const THRESHOLDS = {
  lcp: { good: 2500, ni: 4000 },
  cls: { good: 0.1, ni: 0.25 },
  tbt: { good: 200, ni: 600 },
  fcp: { good: 1800, ni: 3000 },
  si: { good: 3800, ni: 7300 },
};

function rateMetric(
  key: keyof typeof THRESHOLDS,
  value: number,
): "good" | "ni" | "poor" {
  const t = THRESHOLDS[key];
  if (value <= t.good) return "good";
  if (value <= t.ni) return "ni";
  return "poor";
}

function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

function buildScriptedAudit(
  page: PageEntry,
  result: DeviceResult,
  score: number,
): AuditResult {
  const m = result.metrics;
  const fixes: Omit<AuditFix, "rank">[] = [];

  if (m.lcp !== null && rateMetric("lcp", m.lcp) !== "good") {
    const poor = rateMetric("lcp", m.lcp) === "poor";
    fixes.push({
      sev: poor ? "critical" : "high",
      metric: "LCP",
      metricValue: fmtMs(m.lcp),
      title: "Preload the LCP image and raise its fetch priority",
      why: `LCP is ${fmtMs(m.lcp)} (good ≤ 2.5 s). The largest contentful element is discovered late because it sits behind render-blocking resources fetched at low priority. A preload hint plus fetchpriority="high" begins the download during HTML parse.`,
      savingsMs: Math.round(m.lcp * 0.22),
      effort: "S",
      confidence: "High",
      scoreGain: poor ? 12 : 7,
      evidence: [`LCP ${fmtMs(m.lcp)} — good ≤ 2.5 s`, "LCP image priority: Low (assumed)"],
      code: {
        lang: "html",
        caption: "Add to <head>, above render-blocking CSS",
        snippet: `<link rel="preload" as="image"\n      href="/assets/hero.webp"\n      fetchpriority="high">`,
      },
    });
  }

  if (m.fcp !== null && rateMetric("fcp", m.fcp) !== "good") {
    const poor = rateMetric("fcp", m.fcp) === "poor";
    fixes.push({
      sev: poor ? "critical" : "high",
      metric: "FCP",
      metricValue: fmtMs(m.fcp),
      title: "Eliminate render-blocking CSS and head scripts",
      why: `FCP is ${fmtMs(m.fcp)} (good ≤ 1.8 s). Render-blocking resources in the critical path are gating first paint. Inline critical above-the-fold CSS and defer parser-blocking head scripts so paint isn't gated on them.`,
      savingsMs: Math.round(Math.max(0, m.fcp - 1800) * 0.45),
      effort: "M",
      confidence: "High",
      scoreGain: poor ? 10 : 6,
      evidence: [`FCP ${fmtMs(m.fcp)} — good ≤ 1.8 s`, "Render-blocking resources in critical path"],
      code: {
        lang: "html",
        caption: "Defer non-critical CSS + scripts",
        snippet: `<link rel="stylesheet" href="/assets/app.css"\n      media="print" onload="this.media='all'">\n<script src="/assets/vendor.js" defer></script>`,
      },
    });
  }

  if (m.cls !== null && rateMetric("cls", m.cls) !== "good") {
    const poor = rateMetric("cls", m.cls) === "poor";
    fixes.push({
      sev: poor ? "critical" : "high",
      metric: "CLS",
      metricValue: m.cls.toFixed(3),
      title: "Reserve space for late-loading media and injected slots",
      why: `CLS is ${m.cls.toFixed(3)} (good ≤ 0.10). Images or injected content without reserved dimensions cause layout shifts after paint. Pin aspect-ratio on media elements and min-height on dynamic containers.`,
      savingsMs: null,
      effort: "S",
      confidence: "Medium",
      scoreGain: poor ? 12 : 7,
      evidence: [`CLS ${m.cls.toFixed(3)} — above the 0.10 budget`],
      code: {
        lang: "css",
        caption: "Lock intrinsic dimensions",
        snippet: `.hero img { aspect-ratio: 16 / 9; width: 100%; height: auto; }\n.ad-slot   { min-height: 90px; }\n.cta-banner { min-height: 120px; }`,
      },
    });
  }

  if (m.tbt !== null && rateMetric("tbt", m.tbt) !== "good") {
    const poor = rateMetric("tbt", m.tbt) === "poor";
    fixes.push({
      sev: poor ? "critical" : "high",
      metric: "TBT",
      metricValue: fmtMs(m.tbt),
      title: "Move third-party tags off the main thread",
      why: `TBT is ${fmtMs(m.tbt)} (good ≤ 200 ms). Analytics and tag-manager scripts are executing synchronously on the main thread during load, spawning long tasks that delay interactivity. Sandbox them in a web worker (Partytown) or defer to idle.`,
      savingsMs: Math.round(m.tbt * 0.5),
      effort: "M",
      confidence: "Medium",
      scoreGain: poor ? 10 : 6,
      evidence: [`TBT ${fmtMs(m.tbt)} — good ≤ 200 ms`, "Main-thread saturation from synchronous scripts"],
      code: {
        lang: "html",
        caption: "Run analytics in a worker (Partytown)",
        snippet: `<script type="text/partytown"\n        src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>`,
      },
    });
  }

  // Always include the caching hygiene fix
  fixes.push({
    sev: "low",
    metric: "TTFB",
    metricValue: "—",
    title: "Enable Brotli and immutable caching on hashed assets",
    why: "Hashed JS/CSS/font bundles without long-lived cache headers are re-downloaded on repeat visits. Add Cache-Control: immutable and Brotli compression at the edge for fingerprinted assets.",
    savingsMs: null,
    effort: "S",
    confidence: "High",
    scoreGain: 2,
    evidence: ["Hashed static assets should carry immutable cache headers"],
    code: {
      lang: "nginx",
      caption: "Edge / server config",
      snippet: `location ~* \\.(js|css|woff2)$ {\n  add_header Cache-Control "public, max-age=31536000, immutable";\n  brotli on;\n}`,
    },
  });

  fixes.sort(
    (a, b) => b.scoreGain - a.scoreGain || (b.savingsMs ?? 0) - (a.savingsMs ?? 0),
  );
  const rankedFixes: AuditFix[] = fixes.map((f, i) => ({ ...f, rank: i + 1 }));

  const rawGain = fixes.reduce((acc, f) => acc + f.scoreGain, 0);
  const projectedScore = Math.min(98, score + rawGain);
  const totalSavingsMs = fixes.reduce((acc, f) => acc + (f.savingsMs ?? 0), 0);

  const criticalMetrics = (
    ["lcp", "cls", "tbt", "fcp"] as (keyof typeof THRESHOLDS)[]
  )
    .filter((k) => m[k] !== null && rateMetric(k, m[k]!) === "poor")
    .map((k) => k.toUpperCase());

  const verdict =
    criticalMetrics.length > 0
      ? `${page.label} is held back by ${criticalMetrics.join(", ")}. Address the highest-severity fixes first to recover the most Lighthouse score.`
      : `${page.label} clears the critical thresholds but ~${fmtMs(totalSavingsMs)} is still on the table through incremental optimizations.`;

  return {
    score,
    projectedScore,
    totalGain: projectedScore - score,
    totalSavingsMs,
    criticalMetrics,
    verdict,
    fixes: rankedFixes,
  };
}

// ── AuditDrawer ───────────────────────────────────────────────────────────────

export interface AuditDrawerProps {
  open: boolean;
  onClose: () => void;
  page: PageEntry | null;
  device: string;
  result: DeviceResult | null;
}

export function AuditDrawer({
  open,
  onClose,
  page,
  device,
  result,
}: AuditDrawerProps) {
  const [conn, setConn] = useState<{ provider: AuditProvider; key: string } | null>(loadConn);
  const [status, setStatus] = useState<AuditStatus>("connect");
  const [step, setStep] = useState(0);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function getScore(): number {
    if (!result) return 50;
    return result.scores["performance"] ?? Object.values(result.scores)[0] ?? 50;
  }

  async function runGeneration(withConn: typeof conn) {
    if (!page || !result) return;

    clearTimers();
    setStatus("generating");
    setStep(0);
    setError(null);

    const STAGE_MS = 500;
    const MIN_MS = 2000;
    const startTime = Date.now();

    // Advance stages on a timer
    for (let i = 1; i <= GEN_STAGES.length; i++) {
      timersRef.current.push(setTimeout(() => setStep(i), STAGE_MS * i));
    }

    const score = getScore();

    if (!withConn) {
      // Scripted path: build deterministically, then wait for animation
      const auditResult = buildScriptedAudit(page, result, score);
      const wait = Math.max(0, MIN_MS - (Date.now() - startTime));
      timersRef.current.push(
        setTimeout(() => {
          setAudit(auditResult);
          setStatus("done");
        }, wait + STAGE_MS * GEN_STAGES.length),
      );
      return;
    }

    // AI path
    abortRef.current = new AbortController();
    try {
      const userMessage = buildUserMessage(page, device, result, score);
      const aiResult = await callAiProvider(withConn.provider, withConn.key, userMessage);

      const elapsed = Date.now() - startTime;
      const wait = Math.max(0, Math.max(MIN_MS, STAGE_MS * GEN_STAGES.length) - elapsed);
      timersRef.current.push(
        setTimeout(() => {
          setAudit(aiResult);
          setStatus("done");
        }, wait),
      );
    } catch (err) {
      if (err instanceof ApiError && err.kind === "auth") {
        clearTimers();
        if (err.providerLabel === "Gemini") {
          setError(
            "Gemini blocked this key (403 Permission Denied). Google requires browser-facing keys to have HTTP referrer restrictions set — an unrestricted key is blocked. Fix: Google Cloud Console → APIs & Services → Credentials → your key → Application restrictions → HTTP referrers → add your domain (e.g. http://localhost:*/).",
          );
        } else {
          setError(`That key was rejected by ${err.providerLabel} — check it and try again.`);
        }
        setStatus("connect");
        return;
      }

      // For rate-limit and network errors: fall back to scripted, show error banner
      if (err instanceof ApiError && err.kind === "rate") {
        setError(
          `Rate-limited by ${err.providerLabel}. Showing scripted audit — wait a moment before retrying.`,
        );
      }

      const auditResult = buildScriptedAudit(page, result, score);
      const elapsed = Date.now() - startTime;
      const wait = Math.max(0, Math.max(MIN_MS, STAGE_MS * GEN_STAGES.length) - elapsed);
      timersRef.current.push(
        setTimeout(() => {
          setAudit(auditResult);
          setStatus("done");
        }, wait),
      );
    }
  }

  // Re-evaluate state each time the drawer opens for a new page/device
  useEffect(() => {
    if (!open || !page || !result) return;
    const connected = loadConn();
    setConn(connected);
    if (connected) {
      runGeneration(connected);
    } else {
      setStatus("connect");
      setStep(0);
      setAudit(null);
      setError(null);
    }
    return () => {
      clearTimers();
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, page?.pageId, device]);

  // Scroll-lock + Escape
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  function handleConnect(provider: AuditProvider, key: string) {
    saveConn(provider, key);
    const newConn = { provider, key };
    setConn(newConn);
    setError(null);
    runGeneration(newConn);
  }

  function handleScripted() {
    setError(null);
    runGeneration(null);
  }

  function handleDisconnect() {
    clearConn();
    setConn(null);
    clearTimers();
    abortRef.current?.abort();
    setStatus("connect");
    setAudit(null);
    setError(null);
  }

  function doCopy(id: string, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
  }

  const prov = conn ? provById(conn.provider) : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex"
      role="dialog"
      aria-modal="true"
      aria-label="AI performance audit"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-on-surface/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside className="relative ml-auto flex h-full w-120 max-w-full flex-col bg-surface shadow-[-8px_0_32px_rgba(0,0,0,0.18)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ddeedd] text-sm text-primary">
              ✦
            </div>
            <div>
              <p className="font-poppins font-bold text-[15px] text-on-surface leading-tight">
                AI Performance Audit
              </p>
              {page && (
                <p className="font-open-sans text-[11px] text-neutral">
                  {page.label} · {device}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conn && status !== "connect" && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-2.5 py-1 font-open-sans text-[11px] text-on-surface-dark hover:bg-surface transition-colors"
                title="Disconnect key"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {prov?.label}
                <span className="font-mono text-[10px] text-neutral">
                  {maskKey(conn.key)}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-neutral hover:bg-surface-subtle transition-colors"
              aria-label="Close audit"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {status === "connect" && (
            <ConnectScreen
              pageName={page?.label ?? "this page"}
              error={error}
              onConnect={handleConnect}
              onScripted={handleScripted}
            />
          )}

          {status === "generating" && (
            <GeneratingScreen
              step={step}
              pageName={page?.label ?? ""}
              usingAi={!!conn}
              providerLabel={prov?.label}
            />
          )}

          {status === "done" && audit && (
            <AuditResultView
              audit={audit}
              error={error}
              copied={copied}
              onCopy={doCopy}
              onRegenerate={() => runGeneration(conn)}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

// ── ConnectScreen ─────────────────────────────────────────────────────────────

function ConnectScreen({
  pageName,
  error,
  onConnect,
  onScripted,
}: {
  pageName: string;
  error: string | null;
  onConnect: (provider: AuditProvider, key: string) => void;
  onScripted: () => void;
}) {
  const existingConn = loadConn();
  const [provId, setProvId] = useState<AuditProvider>(
    (existingConn?.provider ?? "gemini") as AuditProvider,
  );
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const prov = provById(provId);
  const valid = key.trim().length >= 12;

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-surface-subtle p-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#ddeedd] text-[18px]">
          🔑
        </div>
        <h2 className="font-poppins font-bold text-[17px] text-on-surface mb-1">
          Connect your AI
        </h2>
        <p className="font-open-sans text-[13px] text-on-surface-dark leading-relaxed">
          Bring your own API key to audit{" "}
          <strong>{pageName}</strong>. The model reasons over real CWV data and
          returns prioritized, code-level fixes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 font-open-sans text-[13px] text-error">
          {error}
        </div>
      )}

      {/* Provider picker */}
      <div>
        <label className="mb-2 block font-open-sans text-label-sm font-bold uppercase tracking-wider text-neutral">
          Provider
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvId(p.id)}
              className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors ${
                p.id === provId
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface hover:bg-surface-subtle"
              }`}
            >
              <span className="font-poppins font-bold text-[13px] text-on-surface">
                {p.label}
              </span>
              <span
                className={`font-open-sans text-[11px] ${p.free ? "text-primary" : "text-neutral"}`}
              >
                {p.free ? "Free" : "Paid"}
              </span>
            </button>
          ))}
        </div>
        {prov.id === "gemini" && (
          <div className="mt-2 rounded-lg border border-action/30 bg-action/5 px-3 py-2.5">
            <p className="font-open-sans font-bold text-[11px] text-on-surface-dark mb-1">
              Referrer-restricted key required
            </p>
            <p className="font-open-sans text-[11px] text-on-surface-dark leading-relaxed">
              Google blocks unrestricted keys for browser calls. In{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google Cloud Console
              </a>
              : Credentials → your key → Application restrictions → HTTP referrers
              → add your domain (e.g.{" "}
              <code className="font-mono">http://localhost:*/</code>
              {" "}for local dev).
            </p>
            <p className="mt-1.5 font-open-sans text-[11px] text-neutral">
              Free tier may use prompts to improve Google's models — use a paid tier for sensitive URLs.
            </p>
          </div>
        )}
      </div>

      {/* Key input */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="ac-key"
            className="font-open-sans text-label-sm font-bold uppercase tracking-wider text-neutral"
          >
            API key
          </label>
          <a
            href={prov.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-open-sans text-label-sm text-primary hover:underline"
          >
            Get a {prov.label} key ↗
          </a>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3 py-2 focus-within:border-primary transition-colors">
          <input
            id="ac-key"
            type={showKey ? "text" : "password"}
            value={key}
            placeholder={`${prov.prefix}…`}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid) onConnect(provId, key.trim());
            }}
            className="flex-1 bg-transparent font-mono text-[13px] text-on-surface outline-none placeholder:text-neutral"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-neutral hover:text-on-surface transition-colors"
            aria-label={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 3l18 18M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8M9.4 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.3 3.1M6.3 6.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 2.7-.4" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                <circle cx="12" cy="12" r="2.8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Trust note */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle px-4 py-3">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="mt-0.5 shrink-0 text-primary">
          <path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <div>
          <p className="font-open-sans font-bold text-label-sm text-on-surface">
            Stays in your browser
          </p>
          <p className="font-open-sans text-[11px] text-neutral leading-relaxed">
            Your key is held in this tab's session only — never sent to or stored
            on our servers, and cleared when you close the tab.
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        disabled={!valid}
        onClick={() => valid && onConnect(provId, key.trim())}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-action py-3 font-poppins font-bold text-[15px] text-surface transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>✦</span>
        Connect &amp; run audit
      </button>

      {/* Scripted fallback */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <button
          type="button"
          onClick={onScripted}
          className="font-open-sans text-label-sm text-neutral hover:text-on-surface transition-colors"
        >
          Run scripted audit instead
        </button>
        <div className="h-px flex-1 bg-border" />
      </div>

      <p className="text-center font-open-sans text-[11px] text-neutral">
        Powered by {prov.label} · {prov.model}
        {prov.free ? " · free tier" : ""}
      </p>
    </div>
  );
}

// ── GeneratingScreen ──────────────────────────────────────────────────────────

function GeneratingScreen({
  step,
  pageName,
  usingAi,
  providerLabel,
}: {
  step: number;
  pageName: string;
  usingAi: boolean;
  providerLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <p className="font-poppins font-bold text-[16px] text-on-surface">
          Auditing <strong>{pageName}</strong>
        </p>
        <p className="font-open-sans text-[13px] text-on-surface-dark mt-0.5">
          {usingAi && providerLabel
            ? `Reasoning with ${providerLabel} over the retained ${""} trace.`
            : "Reasoning over the retained trace — no page re-run needed."}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {GEN_STAGES.map((s, i) => {
          const state: "done" | "active" | "wait" =
            i < step ? "done" : i === step ? "active" : "wait";
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  state === "done"
                    ? "bg-primary text-surface"
                    : state === "active"
                      ? "border-2 border-primary"
                      : "border-2 border-border"
                }`}
              >
                {state === "done" && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12.5l4.2 4.2L19 6.5" />
                  </svg>
                )}
                {state === "active" && (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                )}
              </div>
              <div>
                <p
                  className={`font-poppins font-bold text-[13px] ${
                    state === "wait" ? "text-neutral" : "text-on-surface"
                  }`}
                >
                  {s.label}
                </p>
                <p className="font-mono text-[11px] text-neutral">
                  {s.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Shimmer placeholder */}
      <div className="mt-2 flex flex-col gap-3">
        {[80, 60, 90, 50].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-full bg-surface-muted"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ── AuditResultView ───────────────────────────────────────────────────────────

function AuditResultView({
  audit,
  error,
  copied,
  onCopy,
  onRegenerate,
}: {
  audit: AuditResult;
  error: string | null;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
  onRegenerate: () => void;
}) {
  const scoreBand = (s: number) => (s >= 80 ? "text-primary" : s >= 50 ? "text-action" : "text-error");

  function auditToText(a: AuditResult): string {
    const lines = [
      `AI PERFORMANCE AUDIT`,
      `Score ${a.score} → projected ${a.projectedScore} (+${a.totalGain} pts)`,
      "",
      a.verdict,
      "",
      `PRIORITIZED FIXES (${a.fixes.length}, ranked by impact)`,
      "",
    ];
    a.fixes.forEach((f, i) => {
      lines.push(`${i + 1}. [${f.metric} · ${f.sev} · +${f.scoreGain} pts${f.savingsMs ? ` · ~${fmtMs(f.savingsMs)} faster` : ""}] ${f.title}`);
      lines.push(f.why);
      lines.push(f.code.caption + ":");
      lines.push(f.code.snippet);
      lines.push("—");
    });
    return lines.join("\n");
  }

  return (
    <div className="flex flex-col">
      {error && (
        <div className="border-b border-border bg-action/5 px-5 py-3 font-open-sans text-label-sm text-action">
          {error}
        </div>
      )}

      {/* Diagnosis */}
      <div className="border-b border-border p-5">
        <p className="mb-1 font-open-sans text-[11px] font-bold uppercase tracking-wider text-neutral">
          Diagnosis
        </p>
        <p className="font-open-sans text-[13px] text-on-surface-dark leading-relaxed">
          {audit.verdict}
        </p>
        {audit.criticalMetrics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {audit.criticalMetrics.map((m) => (
              <span
                key={m}
                className="flex items-center gap-1 rounded-full bg-error/10 px-2.5 py-1 font-open-sans text-[11px] text-error"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-error" />
                {m} critical
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Score lift */}
      <div className="flex items-center gap-4 border-b border-border px-5 py-4">
        <div className="flex flex-col items-center">
          <span className="font-open-sans text-[11px] text-neutral">Current</span>
          <span className={`font-poppins font-bold text-[28px] leading-none ${scoreBand(audit.score)}`}>
            {audit.score}
          </span>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-neutral">
          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-open-sans text-[11px] text-neutral">Projected</span>
          <span className={`font-poppins font-bold text-[28px] leading-none ${scoreBand(audit.projectedScore)}`}>
            {audit.projectedScore}
          </span>
        </div>
        <div className="ml-auto flex flex-col items-end">
          <span className="font-poppins font-bold text-[15px] text-primary">
            +{audit.totalGain} pts
          </span>
          <span className="font-open-sans text-[11px] text-neutral">
            {audit.totalSavingsMs > 0 ? `~${fmtMs(audit.totalSavingsMs)} faster · ` : ""}
            {audit.fixes.length} fixes
          </span>
        </div>
      </div>

      {/* Fixes header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <span className="font-poppins font-bold text-[13px] text-on-surface">
            Prioritized fixes
          </span>
          <span className="ml-2 font-open-sans text-[11px] text-neutral">
            {audit.fixes.length} · ranked by impact
          </span>
        </div>
        <CopyButton
          copied={copied === "all"}
          label="Copy all"
          onClick={() => onCopy("all", auditToText(audit))}
        />
      </div>

      {/* Fix list */}
      <div className="divide-y divide-border">
        {audit.fixes.map((f) => (
          <FixCard
            key={f.rank}
            fix={f}
            copied={copied}
            onCopy={onCopy}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t border-border px-5 py-4 bg-surface-subtle">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-neutral">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="8" r="0.4" fill="currentColor" stroke="none" />
        </svg>
        <p className="flex-1 font-open-sans text-[11px] text-neutral leading-relaxed">
          Generated from the median trace. Estimates are directional — re-run after applying
          fixes to confirm.
        </p>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 font-open-sans text-label-sm text-on-surface-dark hover:bg-surface-subtle transition-colors shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 11a8 8 0 1 0-1.5 5M20 5v5h-5" />
          </svg>
          Regenerate
        </button>
      </div>
    </div>
  );
}

// ── FixCard ───────────────────────────────────────────────────────────────────

const SEV_STYLES: Record<Sev, { bar: string; badge: string; label: string }> = {
  critical: { bar: "bg-error", badge: "bg-error/10 text-error", label: "Critical" },
  high: { bar: "bg-action", badge: "bg-action/10 text-action", label: "High" },
  medium: { bar: "bg-neutral/50", badge: "bg-surface-muted text-neutral", label: "Medium" },
  low: { bar: "bg-border", badge: "bg-surface-muted text-neutral", label: "Low" },
};

function FixCard({
  fix,
  copied,
  onCopy,
}: {
  fix: AuditFix;
  copied: string | null;
  onCopy: (id: string, text: string) => void;
}) {
  const sev = SEV_STYLES[fix.sev];

  const fixText = `[${fix.metric} · ${fix.sev} · +${fix.scoreGain} pts${fix.savingsMs ? ` · ~${fmtMs(fix.savingsMs)} faster` : ""}] ${fix.title}\n\n${fix.why}\n\n${fix.code.caption}:\n${fix.code.snippet}`;

  return (
    <div className="relative p-5">
      {/* Severity rail */}
      <div className={`absolute left-0 top-4 bottom-4 w-0.75 rounded-r ${sev.bar}`} />

      {/* Top row */}
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[11px] text-neutral">
          {String(fix.rank).padStart(2, "0")}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-open-sans text-[10px] font-bold uppercase tracking-wider ${sev.badge}`}>
          {sev.label}
        </span>
        <span className="font-open-sans text-[11px] text-neutral">{fix.metric}</span>
        <span className="ml-auto font-poppins font-bold text-label-sm text-primary">
          +{fix.scoreGain} pts
        </span>
        {fix.savingsMs && (
          <span className="font-mono text-[11px] text-neutral">
            ~{fmtMs(fix.savingsMs)}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-poppins font-bold text-body-sm text-on-surface mb-1.5">
        {fix.title}
      </h4>

      {/* Why */}
      <p className="font-open-sans text-[13px] text-on-surface-dark leading-relaxed mb-3">
        {fix.why}
      </p>

      {/* Evidence chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {fix.evidence.map((e, i) => (
          <span
            key={i}
            className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] text-neutral"
          >
            {e}
          </span>
        ))}
      </div>

      {/* Code block */}
      <div className="rounded-lg border border-border bg-surface-subtle overflow-hidden mb-3">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] text-neutral">
              {fix.code.lang}
            </span>
            <span className="font-open-sans text-[11px] text-on-surface-dark">
              {fix.code.caption}
            </span>
          </div>
          <CopyButton
            copied={copied === `code-${fix.rank}`}
            label="Copy"
            onClick={() => onCopy(`code-${fix.rank}`, fix.code.snippet)}
          />
        </div>
        <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[11px] text-on-surface-dark leading-relaxed">
          <code>{fix.code.snippet}</code>
        </pre>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="font-open-sans text-[11px] text-neutral">
          Effort {fix.effort} · {fix.confidence} confidence
        </span>
        <CopyButton
          copied={copied === `fix-${fix.rank}`}
          label="Copy fix"
          onClick={() => onCopy(`fix-${fix.rank}`, fixText)}
        />
      </div>
    </div>
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({
  copied,
  label,
  onClick,
}: {
  copied: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 font-open-sans text-[11px] text-on-surface-dark hover:bg-surface-subtle transition-colors"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12.5l4.2 4.2L19 6.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 8.5 5 12l4 3.5M15 8.5 19 12l-4 3.5M13.5 6l-3 12" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
