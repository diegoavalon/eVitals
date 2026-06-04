/* shared icons + chart primitives → window */
(function () {
  "use strict";
  var h = React.createElement;

  // ---- icons (stroke, currentColor) ----
  function mk(paths, opts) {
    opts = opts || {};
    return function (p) {
      p = p || {};
      return h("svg", {
        className: "gi " + (p.className || ""),
        width: p.size || 16, height: p.size || 16,
        viewBox: "0 0 24 24", fill: opts.fill ? "currentColor" : "none",
        stroke: opts.fill ? "none" : "currentColor",
        strokeWidth: opts.sw || 1.8, strokeLinecap: "round", strokeLinejoin: "round",
        style: p.style
      }, paths.map(function (d, i) {
        if (typeof d === "string") return h("path", { key: i, d: d });
        return h(d.t, Object.assign({ key: i }, d.a));
      }));
    };
  }

  var Icons = {
    Mobile: mk([{ t: "rect", a: { x: 7, y: 2, width: 10, height: 20, rx: 2.4 } }, { t: "line", a: { x1: 11, y1: 18.5, x2: 13, y2: 18.5 } }]),
    Desktop: mk([{ t: "rect", a: { x: 2.5, y: 4, width: 19, height: 12.5, rx: 2 } }, { t: "line", a: { x1: 8.5, y1: 20.5, x2: 15.5, y2: 20.5 } }, { t: "line", a: { x1: 12, y1: 16.5, x2: 12, y2: 20.5 } }]),
    Sun: mk(["M12 3.5v2", "M12 18.5v2", "M5.5 5.5l1.4 1.4", "M17.1 17.1l1.4 1.4", "M3.5 12h2", "M18.5 12h2", "M5.5 18.5l1.4-1.4", "M17.1 6.9l1.4-1.4", { t: "circle", a: { cx: 12, cy: 12, r: 3.6 } }]),
    Moon: mk(["M20 13.5A8 8 0 0 1 10.5 4a7 7 0 1 0 9.5 9.5z"]),
    Search: mk([{ t: "circle", a: { cx: 11, cy: 11, r: 6.5 } }, "M20 20l-3.5-3.5"]),
    Bolt: mk(["M13 2 4.5 13.5H11l-1 8.5L19 10h-6.5z"], { fill: true }),
    Pulse: mk(["M2 12h4l2.5-7 4 14 2.5-7H22"]),
    Refresh: mk(["M20 11a8 8 0 1 0-1.5 5", "M20 5v5h-5"]),
    Arrow: mk(["M5 12h14", "M13 6l6 6-6 6"]),
    Sparkles: mk(["M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-4.9L6 9.4l4.4-1.6z", "M19 14l.7 2.1L22 17l-2.3.8L19 20l-.8-2.2L16 17l2.2-.9z"], { fill: true }),
    Down: mk(["M12 5v14", "M6 13l6 6 6-6"]),
    Up: mk(["M12 19V5", "M6 11l6-6 6 6"]),
    Dash: mk(["M6 12h12"]),
    ArrowLeft: mk(["M19 12H5", "M11 18l-6-6 6-6"]),
    Clock: mk([{ t: "circle", a: { cx: 12, cy: 12, r: 8.5 } }, "M12 7.5V12l3 2"]),
    Layers: mk(["M12 3 3 8l9 5 9-5z", "M3 13l9 5 9-5", { t: "path", a: { d: "M3 8v0" } }]),
    ImageIcon: mk([{ t: "rect", a: { x: 3, y: 4.5, width: 18, height: 15, rx: 2.2 } }, { t: "circle", a: { cx: 8.5, cy: 10, r: 1.6 } }, "M4 17l5-4 4 3 3.5-3 4 3.5"]),
    ImageOff: mk([{ t: "rect", a: { x: 3, y: 4.5, width: 18, height: 15, rx: 2.2 } }, "M4 18l5-4 3 2.2", "M14 13l3-2.5 4 3.5", "M3.5 3.5l17 17"]),
    Code: mk(["M9 8.5 5 12l4 3.5", "M15 8.5 19 12l-4 3.5", "M13.5 6l-3 12"]),
    Alert: mk(["M12 4 2.5 20.5h19z", "M12 10v4.5", { t: "circle", a: { cx: 12, cy: 17.6, r: 0.4, fill: "currentColor", stroke: "none" } }]),
    Check: mk(["M5 12.5l4.2 4.2L19 6.5"]),
    Info: mk([{ t: "circle", a: { cx: 12, cy: 12, r: 8.5 } }, "M12 11v5", { t: "circle", a: { cx: 12, cy: 8, r: 0.4, fill: "currentColor", stroke: "none" } }]),
    External: mk(["M14 4h6v6", "M20 4l-8.5 8.5", "M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"]),
    Lightbulb: mk(["M9.5 18h5", "M10 21h4", "M12 3a6 6 0 0 0-3.8 10.6c.6.5.8 1 .8 2.4h6c0-1.4.2-1.9.8-2.4A6 6 0 0 0 12 3z"]),
    FileText: mk(["M14 3v5h5", "M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z", "M8.5 13h7", "M8.5 16.5h5"]),
    Eye: mk(["M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z", { t: "circle", a: { cx: 12, cy: 12, r: 2.8 } }]),
    Hourglass: mk(["M6.5 3h11", "M6.5 21h11", "M8 3v3.2l4 3.8 4-3.8V3", "M8 21v-3.2l4-3.8 4 3.8V21"]),
    Key: mk([{ t: "circle", a: { cx: 8, cy: 8, r: 4 } }, "M11 11l8 8", "M16 16l2-2", "M19 13l1.5 1.5"]),
    Shield: mk(["M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z", "M9 12l2 2 4-4"]),
    EyeOff: mk(["M3 3l18 18", "M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8", "M9.4 5.7A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.3 3.1", "M6.3 6.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 2.7-.4"])
  };

  // ---- score → band/color ----
  function scoreBand(s) { return s >= 80 ? "good" : s >= 50 ? "ni" : "poor"; }
  function bandVar(b) { return b === "good" ? "var(--good)" : b === "ni" ? "var(--ni)" : b === "poor" ? "var(--poor)" : "var(--na)"; }

  // ---- area sparkline ----
  function SparkArea(props) {
    var data = props.data || [];
    var w = props.width || 110, ht = props.height || 34, pad = 2;
    var color = props.color || "var(--accent)";
    var gid = "g" + Math.random().toString(36).slice(2, 8);
    if (data.length < 2) return h("svg", { width: w, height: ht });
    var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
    var range = (max - min) || 1;
    var stepX = (w - pad * 2) / (data.length - 1);
    var pts = data.map(function (v, i) {
      var x = pad + i * stepX;
      var y = pad + (ht - pad * 2) * (1 - (v - min) / range);
      return [x, y];
    });
    // smooth path
    function smooth(p) {
      var d = "M" + p[0][0] + "," + p[0][1];
      for (var i = 0; i < p.length - 1; i++) {
        var cx = (p[i][0] + p[i + 1][0]) / 2;
        d += " C" + cx + "," + p[i][1] + " " + cx + "," + p[i + 1][1] + " " + p[i + 1][0] + "," + p[i + 1][1];
      }
      return d;
    }
    var line = smooth(pts);
    var area = line + " L" + pts[pts.length - 1][0] + "," + (ht - pad) + " L" + pts[0][0] + "," + (ht - pad) + " Z";
    return h("svg", { width: w, height: ht, style: { display: "block", overflow: "visible" } },
      h("defs", null, h("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
        h("stop", { offset: "0%", stopColor: color, stopOpacity: 0.22 }),
        h("stop", { offset: "100%", stopColor: color, stopOpacity: 0 }))),
      h("path", { d: area, fill: "url(#" + gid + ")" }),
      h("path", { d: line, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }),
      h("circle", { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 2.6, fill: color })
    );
  }

  // ---- score ring ----
  function ScoreRing(props) {
    var s = props.score, sz = props.size || 64, sw = props.stroke || 6;
    var r = (sz - sw) / 2, c = 2 * Math.PI * r;
    var off = c * (1 - s / 100);
    var col = bandVar(scoreBand(s));
    return h("svg", { width: sz, height: sz, style: { transform: "rotate(-90deg)" } },
      h("circle", { cx: sz / 2, cy: sz / 2, r: r, fill: "none", stroke: "var(--border)", strokeWidth: sw }),
      h("circle", { cx: sz / 2, cy: sz / 2, r: r, fill: "none", stroke: col, strokeWidth: sw,
        strokeDasharray: c, strokeDashoffset: off, strokeLinecap: "round",
        style: { transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" } })
    );
  }

  // ---- delta chip ----
  function Delta(props) {
    var v = props.value, unit = props.unit || "", lowerBetter = props.lowerBetter !== false;
    var improved = lowerBetter ? v < 0 : v > 0;
    var flat = Math.abs(v) < (props.eps || 0.0001);
    var cls = flat ? "flat" : (improved ? "down" : "up");
    var Ico = flat ? Icons.Dash : (v < 0 ? Icons.Down : Icons.Up);
    var txt = (v > 0 ? "+" : "") + props.format(Math.abs(v) === 0 ? 0 : v);
    return h("span", { className: "delta " + cls }, h(Ico, { size: 11 }), props.label || txt);
  }

  window.UI = {
    Icons: Icons, SparkArea: SparkArea, ScoreRing: ScoreRing, Delta: Delta,
    scoreBand: scoreBand, bandVar: bandVar
  };
})();
