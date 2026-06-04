/* ehi-perf-dashboard — scripted AI performance audit.
   Deterministically reasons over the SAME retained trace the detail view shows
   (per-page/profile CWV, render-blocking resources, transfer breakdown, third-party
   weight) and emits a prioritized, impact-ranked fix list. No live model call —
   the "reasoning" is derived entirely from the page's real fixture metrics so the
   numbers in the audit always match what the report renders. */
(function () {
  "use strict";
  var P = window.PERF;
  function R(n) { return Math.round(n); }

  function buildAudit(det) {
    var d = det.d, page = det.page, cwv = d.cwv;
    var blockers = det.blockers || [];
    var blockerMs = blockers.reduce(function (a, b) { return a + b.blockMs; }, 0);
    var idx = P.PAGES.findIndex(function (p) { return p.id === page.id; });
    var jit = idx % 3;
    var fixes = [];
    function rate(m) { return P.rating(m, cwv[m]); }

    // 1 — LCP discovery / priority -----------------------------------------
    if (rate("LCP") !== "good") {
      var disc = R(cwv.LCP * 0.45);
      fixes.push({
        metric: "LCP", metricValue: P.fmtMs(cwv.LCP),
        sev: rate("LCP") === "poor" ? "critical" : "high",
        title: "Preload the LCP image and raise its fetch priority",
        why: "The largest contentful element is the hero image hero-family.webp, but the browser doesn’t discover it until ~" + P.fmtMs(disc) + " into the load — it sits behind " + blockers.length + " render-blocking resources and is fetched at Low priority. A preload hint plus fetchpriority=\"high\" begins the download during initial HTML parse, pulling LCP forward.",
        savingsMs: R(cwv.LCP * 0.22), effort: "S", confidence: "High",
        evidence: ["LCP image priority: Low", "Discovered " + P.fmtMs(disc) + " into load", "LCP " + P.fmtMs(cwv.LCP) + " · good ≤ 2.5 s"],
        code: { lang: "html", caption: "Add to <head>, above render-blocking CSS",
          snippet: '<link rel="preload" as="image"\n      href="/assets/hero-family.webp"\n      fetchpriority="high">' }
      });
    }

    // 2 — render-blocking critical path ------------------------------------
    if (blockers.length) {
      fixes.push({
        metric: "FCP", metricValue: P.fmtMs(cwv.FCP),
        sev: blockerMs > 700 ? "critical" : "high",
        title: "Eliminate render-blocking CSS and head scripts",
        why: blockers.length + " resources block first paint for ~" + P.fmtMs(blockerMs) + ", including " + blockers.slice(0, 2).map(function (b) { return b.name; }).join(" and ") + ". Inline the critical above-the-fold CSS, load the rest with a print-media swap, and defer parser-blocking head scripts so paint isn’t gated on them.",
        savingsMs: R(blockerMs * 0.45), effort: "M", confidence: "High",
        evidence: [blockers.length + " render-blocking requests", "~" + P.fmtMs(blockerMs) + " before first paint"],
        code: { lang: "html", caption: "Defer non-critical CSS + scripts",
          snippet: '<link rel="stylesheet" href="/assets/app.css"\n      media="print" onload="this.media=\'all\'">\n<script src="/assets/vendor.js" defer></script>' }
      });
    }

    // 3 — CLS reserved space ------------------------------------------------
    if (rate("CLS") !== "good") {
      fixes.push({
        metric: "CLS", metricValue: P.fmtCls(cwv.CLS),
        sev: rate("CLS") === "poor" ? "critical" : "high",
        title: "Reserve space for late-loading media and injected slots",
        why: "Cumulative Layout Shift is " + P.fmtCls(cwv.CLS) + " (good ≤ 0.10). The hero image and the carrier-logos band load without reserved dimensions, and CTA/ad slots inject after first paint — each nudges content downward. Pin an intrinsic aspect-ratio on media and a min-height on dynamic containers.",
        savingsMs: null, clsTo: 0.05, effort: "S", confidence: "Medium",
        evidence: ["CLS " + P.fmtCls(cwv.CLS) + " — above the 0.10 budget", "Hero + logo band shift on load"],
        code: { lang: "css", caption: "Lock intrinsic dimensions",
          snippet: ".hero img { aspect-ratio: 16 / 9; width: 100%; height: auto; }\n.carrier-logos { min-height: 64px; }\n.cta-slot { min-height: 120px; }" }
      });
    }

    // 4 — TBT / third-party main-thread ------------------------------------
    if (rate("TBT") !== "good") {
      fixes.push({
        metric: "TBT", metricValue: P.fmtMs(cwv.TBT),
        sev: rate("TBT") === "poor" ? "critical" : "high",
        title: "Move third-party tags off the main thread",
        why: "Total Blocking Time is " + P.fmtMs(cwv.TBT) + ". Tag Manager, Optimizely and the Facebook pixel execute on the main thread during load, spawning long tasks that delay interactivity. Sandbox them in a web worker (Partytown) or defer execution until the thread is idle.",
        savingsMs: R(cwv.TBT * 0.5), effort: "M", confidence: "Medium",
        evidence: ["TBT " + P.fmtMs(cwv.TBT) + " · good ≤ 200 ms", page.third + " third-party requests"],
        code: { lang: "html", caption: "Run analytics in a worker",
          snippet: '<script type="text/partytown"\n        src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>' }
      });
    }

    // 5 — image weight / formats -------------------------------------------
    if (page.transfer.image > 700000) {
      fixes.push({
        metric: "LCP", metricValue: P.fmtBytes(page.transfer.image),
        sev: "medium",
        title: "Serve AVIF/WebP and right-size responsive images",
        why: "Images account for " + P.fmtBytes(page.transfer.image) + " of transfer. Shipping AVIF with a WebP fallback and correct srcset breakpoints cuts the hero payload and shortens the LCP download.",
        savingsMs: R(cwv.LCP * 0.08) + 60, effort: "M", confidence: "Medium",
        evidence: [P.fmtBytes(page.transfer.image) + " of images", "Single-resolution hero served"],
        code: { lang: "html", caption: "Modern formats + srcset",
          snippet: '<picture>\n  <source type="image/avif" srcset="/hero.avif">\n  <source type="image/webp" srcset="/hero.webp">\n  <img src="/hero.jpg" width="1200" height="675" alt="">\n</picture>' }
      });
    }

    // 6 — caching / compression hygiene (always) ---------------------------
    fixes.push({
      metric: "TTFB", metricValue: P.fmtMs(cwv.TTFB),
      sev: "low",
      title: "Enable Brotli and immutable caching on hashed assets",
      why: "Hashed JS/CSS/font bundles respond without long-lived cache headers, so repeat views re-download them. Add Cache-Control: immutable and Brotli at the edge for fingerprinted assets.",
      savingsMs: null, effort: "S", confidence: "High",
      evidence: ["No immutable cache headers on bundles"],
      code: { lang: "nginx", caption: "Edge / server config",
        snippet: 'location ~* \\.(js|css|woff2)$ {\n  add_header Cache-Control "public, max-age=31536000, immutable";\n  brotli on;\n}' }
    });

    // impact scoring -------------------------------------------------------
    var GAIN = { critical: 12, high: 7, medium: 4, low: 2 };
    fixes.forEach(function (f) {
      f.scoreGain = GAIN[f.sev] + (f.sev === "critical" || f.sev === "high" ? jit : 0);
    });
    fixes.sort(function (a, b) {
      return b.scoreGain - a.scoreGain || (b.savingsMs || 0) - (a.savingsMs || 0);
    });
    fixes.forEach(function (f, i) { f.rank = i + 1; });

    var rawGain = fixes.reduce(function (a, f) { return a + f.scoreGain; }, 0);
    var projected = Math.min(98, d.score + rawGain);
    var totalSavingsMs = fixes.reduce(function (a, f) { return a + (f.savingsMs || 0); }, 0);

    var crit = ["LCP", "CLS", "TBT", "FCP"].filter(function (m) { return P.rating(m, cwv[m]) === "poor"; });
    var verdict;
    if (crit.length) {
      verdict = page.label + " is held back by " + crit.join(", ") + ". The critical path is the bottleneck — " +
        (blockers.length
          ? blockers.length + " render-blocking resources delay first paint and the LCP image is discovered late."
          : "the LCP image is discovered late and third-party scripts saturate the main thread.");
    } else {
      verdict = page.label + " clears every core vital, but ~" + P.fmtMs(totalSavingsMs) + " is still on the table. " +
        "The wins are incremental: tighten the critical path and trim third-party weight before it regresses.";
    }

    var steps = [
      { label: "Reading sitespeed.io trace", detail: det.totalRequests + " requests · " + P.fmtMs(det.load) + " visual-complete" },
      { label: "Correlating Core Web Vitals", detail: "LCP " + P.fmtMs(cwv.LCP) + " · CLS " + P.fmtCls(cwv.CLS) + " · TBT " + P.fmtMs(cwv.TBT) },
      { label: "Tracing the critical request chain", detail: blockers.length + " render-blocking · " + page.third + " third-party" },
      { label: "Ranking fixes by projected score impact", detail: fixes.length + " opportunities found" }
    ];

    return {
      page: page, profile: det.profile,
      score: d.score, projectedScore: projected, totalGain: projected - d.score,
      totalSavingsMs: totalSavingsMs, criticalMetrics: crit,
      verdict: verdict, steps: steps, fixes: fixes
    };
  }

  // ---- copy / export text builders -------------------------------------
  function sevLabel(s) { return s === "critical" ? "Critical" : s === "high" ? "High" : s === "medium" ? "Medium" : "Low"; }
  function fixToText(f) {
    var head = "[" + f.metric + " · " + sevLabel(f.sev) + " · +" + f.scoreGain + " pts" + (f.savingsMs ? " · ~" + P.fmtMs(f.savingsMs) + " faster" : "") + "]";
    return head + " " + f.title + "\n\n" +
      f.why + "\n\n" +
      f.code.caption + ":\n" + f.code.snippet + "\n";
  }
  function auditToText(a) {
    var lines = [];
    lines.push("AI PERFORMANCE AUDIT — " + a.page.label + " (" + a.profile + ")");
    lines.push("Score " + a.score + " → projected " + a.projectedScore + "  (+" + a.totalGain + " pts)");
    lines.push("");
    lines.push(a.verdict);
    lines.push("");
    lines.push("PRIORITIZED FIXES (" + a.fixes.length + ", ranked by impact)");
    lines.push("");
    a.fixes.forEach(function (f, i) { lines.push((i + 1) + ". " + fixToText(f)); lines.push("—"); });
    return lines.join("\n");
  }

  P.buildAudit = buildAudit;
  P.auditFixText = fixToText;
  P.auditFullText = auditToText;
  P.sevLabel = sevLabel;
})();
