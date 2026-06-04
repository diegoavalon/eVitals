/* AI Performance Audit — right-side focused drawer.
   Triggered from the report header CTA or the sidebar card.

   FLOW (3 states):
     1) connect    — bring-your-own-key setup (shown until a key is connected)
     2) generating — staged "reading the trace" load screen
     3) done       — impact-ranked fix document (scripted from P.buildAudit)

   The key is stored in sessionStorage only (this browser tab) — it is never sent
   to any server of ours. In production the model call itself is wired in handoff;
   here, connecting proceeds to the scripted audit so the full design is visible. */
(function () {
  "use strict";
  var h = React.createElement;
  var P = window.PERF, U = window.UI, I = U.Icons;

  // ---- BYO provider config -------------------------------------------------
  var PROVIDERS = [
    { id: "gemini", label: "Gemini",  model: "gemini-2.5-flash",  free: true,
      hint: "Free tier · no credit card", keyUrl: "https://aistudio.google.com/apikey", prefix: "AIza" },
    { id: "claude", label: "Claude",  model: "claude-sonnet-4.5", free: false,
      hint: "Pay-as-you-go", keyUrl: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-" },
    { id: "openai", label: "OpenAI",  model: "gpt-4.1-mini",      free: false,
      hint: "Pay-as-you-go", keyUrl: "https://platform.openai.com/api-keys", prefix: "sk-" }
  ];
  var KEY_STORE = "evitals.ai.key", PROV_STORE = "evitals.ai.provider";
  function loadConn() {
    try {
      var k = sessionStorage.getItem(KEY_STORE), p = sessionStorage.getItem(PROV_STORE);
      if (k && p) return { provider: p, key: k };
    } catch (e) {}
    return null;
  }
  function saveConn(provider, key) {
    try { sessionStorage.setItem(KEY_STORE, key); sessionStorage.setItem(PROV_STORE, provider); } catch (e) {}
  }
  function clearConn() {
    try { sessionStorage.removeItem(KEY_STORE); sessionStorage.removeItem(PROV_STORE); } catch (e) {}
  }
  function provById(id) { return PROVIDERS.filter(function (p) { return p.id === id; })[0] || PROVIDERS[0]; }
  function maskKey(k) { return k.length <= 8 ? "••••" : k.slice(0, 4) + "…" + k.slice(-4); }

  function band(s) { return s >= 80 ? "good" : s >= 50 ? "ni" : "poor"; }
  function CopyBtn(props) {
    var done = props.copied;
    return h("button", { className: "copy-btn" + (done ? " is-copied" : ""), onClick: props.onClick, type: "button" },
      h(done ? I.Check : I.Code, { size: 13 }), done ? "Copied" : props.label);
  }

  // ---- Connect (BYO key) screen -------------------------------------------
  function ConnectScreen(props) {
    var det = props.det;
    var pv = React.useState((loadConn() || {}).provider || "gemini"); var provId = pv[0], setProvId = pv[1];
    var kv = React.useState(""); var key = kv[0], setKey = kv[1];
    var sv = React.useState(false); var show = sv[0], setShow = sv[1];
    var prov = provById(provId);
    var valid = key.trim().length >= 12;

    return h("div", { className: "audit-connect" },
      h("div", { className: "ac-hero" },
        h("span", { className: "ac-hero-glyph" }, h(I.Key, { size: 20 })),
        h("h2", { className: "ac-h" }, "Connect your AI"),
        h("p", { className: "ac-p" },
          "Bring your own API key to audit ", h("b", null, det.page.label),
          ". The model reasons over this page’s real Core Web Vitals trace and returns prioritized, code-level fixes.")
      ),

      h("label", { className: "ac-field-label" }, "Provider"),
      h("div", { className: "ac-providers" }, PROVIDERS.map(function (p) {
        return h("button", { key: p.id, type: "button",
          className: "ac-prov" + (p.id === provId ? " on" : ""),
          onClick: function () { setProvId(p.id); } },
          h("span", { className: "ac-prov-name" }, p.label),
          h("span", { className: "ac-prov-hint" }, p.free ? "Free" : "Paid"),
          p.id === provId ? h("span", { className: "ac-prov-check" }, h(I.Check, { size: 12 })) : null
        );
      })),

      h("label", { className: "ac-field-label", htmlFor: "ac-key" }, "API key",
        h("a", { className: "ac-getkey", href: prov.keyUrl, target: "_blank", rel: "noopener" },
          "Get a ", prov.label, " key", h(I.External, { size: 12 }))),
      h("div", { className: "ac-key-wrap" },
        h("input", { id: "ac-key", className: "ac-key-input mono", type: show ? "text" : "password",
          value: key, placeholder: prov.prefix + "…", spellCheck: false, autoComplete: "off",
          onChange: function (e) { setKey(e.target.value); },
          onKeyDown: function (e) { if (e.key === "Enter" && valid) props.onConnect(provId, key.trim()); } }),
        h("button", { type: "button", className: "ac-eye", "aria-label": show ? "Hide key" : "Show key",
          onClick: function () { setShow(!show); } }, h(show ? I.EyeOff : I.Eye, { size: 15 }))
      ),

      h("div", { className: "ac-trust" },
        h("span", { className: "ac-trust-ico" }, h(I.Shield, { size: 15 })),
        h("div", null,
          h("div", { className: "ac-trust-t" }, "Stays in your browser"),
          h("div", { className: "ac-trust-d" }, "Your key is held in this tab’s session only — never sent to or stored on our servers, and cleared when you close the tab."))
      ),

      h("button", { className: "btn primary full ac-go", disabled: !valid,
        onClick: function () { if (valid) props.onConnect(provId, key.trim()); } },
        h(I.Sparkles, { size: 15 }), "Connect & run audit"),

      h("div", { className: "ac-alt" },
        h("span", { className: "ac-alt-line" }),
        h("button", { type: "button", className: "ac-alt-btn", onClick: props.onScripted }, "Run scripted audit instead"),
        h("span", { className: "ac-alt-line" })
      ),
      h("p", { className: "ac-foot mono" }, "Powered by " + prov.label + " · " + prov.model + (prov.free ? " · free tier" : ""))
    );
  }

  function GenStep(props) {
    var s = props.step, state = props.state; // 'done' | 'active' | 'wait'
    return h("div", { className: "gen-step " + state },
      h("span", { className: "gen-mark" },
        state === "done" ? h(I.Check, { size: 13 }) : state === "active" ? h("span", { className: "gen-spin" }) : h("span", { className: "gen-dot" })),
      h("div", { className: "gen-body" },
        h("div", { className: "gen-label" }, s.label),
        h("div", { className: "gen-detail mono" }, s.detail))
    );
  }

  function Fix(props) {
    var f = props.f, copied = props.copied, onCopy = props.onCopy;
    return h("article", { className: "afix " + f.sev },
      h("div", { className: "afix-rail" }),
      h("div", { className: "afix-top" },
        h("span", { className: "afix-rank mono" }, String(f.rank).padStart(2, "0")),
        h("span", { className: "afix-sev " + f.sev }, P.sevLabel(f.sev)),
        h("span", { className: "afix-metric" }, f.metric),
        h("span", { className: "afix-spacer" }),
        h("span", { className: "afix-gain" }, "+", f.scoreGain, " pts"),
        f.savingsMs ? h("span", { className: "afix-save mono" }, "~" + P.fmtMs(f.savingsMs)) : null
      ),
      h("h4", { className: "afix-title" }, f.title),
      h("p", { className: "afix-why" }, f.why),
      h("div", { className: "afix-evidence" }, f.evidence.map(function (e, i) {
        return h("span", { className: "ev-chip mono", key: i }, e);
      })),
      h("div", { className: "afix-code" },
        h("div", { className: "code-head" },
          h("span", { className: "code-cap" }, h("span", { className: "code-lang mono" }, f.code.lang), f.code.caption),
          h(CopyBtn, { copied: copied === "code-" + f.rank, label: "Copy", onClick: function () { onCopy("code-" + f.rank, f.code.snippet); } })
        ),
        h("pre", { className: "code-pre mono" }, h("code", null, f.code.snippet))
      ),
      h("div", { className: "afix-foot" },
        h("span", { className: "afix-meta mono" }, "Effort ", f.effort, " · ", f.confidence, " confidence"),
        h(CopyBtn, { copied: copied === "fix-" + f.rank, label: "Copy fix", onClick: function () { onCopy("fix-" + f.rank, P.auditFixText(f)); } })
      )
    );
  }

  function AuditDrawer(props) {
    var open = props.open, det = props.det, onClose = props.onClose;
    var cn = React.useState(loadConn()); var conn = cn[0], setConn = cn[1];
    var st = React.useState("connect"); var status = st[0], setStatus = st[1]; // connect | generating | done
    var sp = React.useState(0); var step = sp[0], setStep = sp[1];
    var au = React.useState(null); var audit = au[0], setAudit = au[1];
    var cp = React.useState(null); var copied = cp[0], setCopied = cp[1];
    var timersRef = React.useRef([]);

    function clearTimers() { timersRef.current.forEach(clearTimeout); timersRef.current = []; }
    function runGeneration(cadence) {
      clearTimers();
      var a = P.buildAudit(det);
      setAudit(a); setStatus("generating"); setStep(0); setCopied(null);
      a.steps.forEach(function (s, i) {
        timersRef.current.push(setTimeout(function () { setStep(i + 1); }, cadence * (i + 1)));
      });
      timersRef.current.push(setTimeout(function () { setStatus("done"); }, cadence * a.steps.length + cadence));
    }

    // decide initial state each time the drawer opens for a page/profile
    React.useEffect(function () {
      if (!open || !det) return;
      setAudit(P.buildAudit(det));
      if (conn) runGeneration(460);
      else { setStatus("connect"); setStep(0); setCopied(null); }
      return clearTimers;
    }, [open, det && det.id, det && det.profile]);

    // scroll-lock + Esc to close
    React.useEffect(function () {
      if (!open) return;
      document.body.style.overflow = "hidden";
      function onKey(e) { if (e.key === "Escape") onClose(); }
      window.addEventListener("keydown", onKey);
      return function () { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
    }, [open]);

    function onConnect(provId, key) { saveConn(provId, key); setConn({ provider: provId, key: key }); runGeneration(460); }
    function onScripted() { runGeneration(460); }
    function onDisconnect() { clearConn(); setConn(null); clearTimers(); setStatus("connect"); }

    function doCopy(id, text) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
        else { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
      } catch (e) {}
      setCopied(id);
      setTimeout(function () { setCopied(function (c) { return c === id ? null : c; }); }, 1600);
    }

    var a = audit;
    var prov = conn ? provById(conn.provider) : null;

    return h("div", { className: "audit-layer" + (open ? " open" : ""), "aria-hidden": open ? "false" : "true" },
      h("div", { className: "audit-scrim", onClick: onClose }),
      h("aside", { className: "audit-drawer", role: "dialog", "aria-label": "AI performance audit" },
        // header
        h("div", { className: "audit-head" },
          h("div", { className: "audit-head-l" },
            h("span", { className: "audit-glyph" }, h(I.Sparkles, { size: 17 })),
            h("div", null,
              h("div", { className: "audit-kicker" }, "AI Performance Audit"),
              h("div", { className: "audit-sub" }, a ? a.page.label + " · " + a.profile + " · median of 3 runs" : "")
            )
          ),
          h("div", { className: "audit-head-r" },
            conn && status !== "connect"
              ? h("button", { className: "audit-conn", onClick: onDisconnect, title: "Disconnect key" },
                  h("span", { className: "audit-conn-dot" }), prov.label,
                  h("span", { className: "audit-conn-key mono" }, maskKey(conn.key)))
              : null,
            h("button", { className: "audit-x", onClick: onClose, "aria-label": "Close audit" }, "✕")
          )
        ),

        // body
        h("div", { className: "audit-body" },
          status === "connect"
            ? h(ConnectScreen, { det: det, onConnect: onConnect, onScripted: onScripted })
          : status === "generating" && a
            ? h("div", { className: "audit-gen" },
                h("div", { className: "gen-title" }, "Auditing ", h("b", null, a.page.label)),
                h("div", { className: "gen-note" }, conn
                  ? ["Reasoning with ", h("b", { key: 1 }, prov.label), " over the retained ", a.profile, " trace."]
                  : ["Reasoning over the retained ", a.profile, " trace — no page re-run needed."]),
                h("div", { className: "gen-steps" }, a.steps.map(function (s, i) {
                  var state = i < step ? "done" : i === step ? "active" : "wait";
                  return h(GenStep, { key: i, step: s, state: state });
                })),
                h("div", { className: "gen-shimmer" })
              )
          : a ? h("div", { className: "audit-result" },
                // diagnosis
                h("div", { className: "audit-verdict" },
                  h("div", { className: "av-label" }, "Diagnosis"),
                  h("p", { className: "av-text" }, a.verdict),
                  a.criticalMetrics.length
                    ? h("div", { className: "av-crit" }, a.criticalMetrics.map(function (m) {
                        return h("span", { className: "crit-chip", key: m }, h("span", { className: "dot poor" }), m, " critical");
                      }))
                    : null
                ),
                // projected lift
                h("div", { className: "audit-lift" },
                  h("div", { className: "lift-col" },
                    h("span", { className: "lift-k" }, "Current"),
                    h("span", { className: "lift-n mono txt-" + band(a.score) }, a.score)),
                  h("span", { className: "lift-arrow" }, h(I.Arrow, { size: 18 })),
                  h("div", { className: "lift-col" },
                    h("span", { className: "lift-k" }, "Projected"),
                    h("span", { className: "lift-n mono txt-" + band(a.projectedScore) }, a.projectedScore)),
                  h("div", { className: "lift-meta" },
                    h("span", { className: "lift-gain" }, "+", a.totalGain, " pts"),
                    h("span", { className: "lift-sub mono" }, "~" + P.fmtMs(a.totalSavingsMs) + " faster · " + a.fixes.length + " fixes")
                  )
                ),
                // fixes header
                h("div", { className: "audit-fixhead" },
                  h("h3", null, "Prioritized fixes"),
                  h("span", { className: "fixhead-sub" }, a.fixes.length + " · ranked by projected impact"),
                  h("span", { className: "afix-spacer" }),
                  h(CopyBtn, { copied: copied === "all", label: "Copy all", onClick: function () { doCopy("all", P.auditFullText(a)); } })
                ),
                // fix list
                h("div", { className: "audit-fixes" }, a.fixes.map(function (f) {
                  return h(Fix, { key: f.rank, f: f, copied: copied, onCopy: doCopy });
                })),
                // footer
                h("div", { className: "audit-foot" },
                  h(I.Info, { size: 13 }),
                  h("span", null, "Generated from the median trace. Estimates are directional — re-run the page after applying fixes to confirm."),
                  h("button", { className: "btn ghost sm regen", onClick: function () { runGeneration(360); } },
                    h(I.Refresh, { size: 13 }), "Regenerate")
                )
              ) : null
        )
      )
    );
  }

  window.AuditDrawer = AuditDrawer;
})();
