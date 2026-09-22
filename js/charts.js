/* ==================================================================
 * charts.js — the figure library.
 *
 * Every renderer has the same contract:
 *   SITE.Charts.create(type, ctx) -> { update(state), redraw(), destroy() }
 *   ctx = { plot, legend, spec, tip }
 *
 * House rules enforced here, not left to taste:
 *   · one y-axis per plot — two measures become two panels, never two scales
 *   · colour follows the entity (its palette slot), never its rank or row
 *   · categorical hues in fixed slot order, capped at 8; all-pairs forms
 *     (scatter, network) cap at 3 hues and otherwise use emphasis
 *   · sequential = one hue light→dark; diverging = blue↔red, neutral middle
 *   · a hover layer on every plot, and a table-view twin built from the spec
 * ================================================================== */
window.SITE = window.SITE || {};

SITE.Charts = (function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DUR = reduced ? 0 : 520;

  /* First paint (and any resize redraw) applies attributes directly: a chart
     must be correct in the frame it appears in, not one transition later.
     Subsequent state changes animate. */
  var NOW = false;
  d3.selection.prototype.anim = function () {
    return NOW ? this : this.transition().duration(DUR);
  };

  /* ---- tokens ---------------------------------------------------- */
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function pal(slot) { return cssVar('--series-' + (((slot - 1) % 8) + 1)); }
  function seq(step) { return cssVar('--seq-' + step); }
  var SEQ_STEPS = [100, 200, 300, 400, 500, 600, 700];

  function ink() { return cssVar('--ink'); }
  function ink2() { return cssVar('--ink-2'); }
  function muted() { return cssVar('--muted'); }
  function surface() { return cssVar('--surface'); }
  function gridCol() { return cssVar('--grid'); }

  /* diverging scale: blue ← neutral → red */
  function divScale(domain) {
    return d3.scaleLinear()
      .domain([domain[0], 0, domain[1]])
      .range([cssVar('--div-neg'), cssVar('--div-mid'), cssVar('--div-pos')])
      .clamp(true).interpolate(d3.interpolateRgb);
  }
  function seqScale(domain) {
    return d3.scaleQuantize().domain(domain).range(SEQ_STEPS.map(seq));
  }

  /* ---- formats --------------------------------------------------- */
  var FMT = {
    pct0: function (v) { return d3.format('.0%')(v); },
    pct1: function (v) { return d3.format('.1%')(v); },
    pctv: function (v) { return d3.format('.1f')(v) + '%'; },
    num0: function (v) { return d3.format(',.0f')(v); },
    num1: function (v) { return d3.format(',.1f')(v); },
    num2: function (v) { return d3.format(',.2f')(v); },
    sd:   function (v) { return (v > 0 ? '+' : '') + d3.format('.2f')(v) + ' SD'; },
    corr: function (v) { return (v > 0 ? '+' : '') + d3.format('.2f')(v); },
    plain: function (v) { return String(v); }
  };
  function fmt(key) { return FMT[key] || FMT.num2; }

  /* ---- layout helpers -------------------------------------------- */
  function measure(node, ratio, min, max) {
    var w = Math.max(260, node.clientWidth || 640);
    var h = Math.round(w * ratio);
    if (min) h = Math.max(min, h);
    if (max) h = Math.min(max, h);
    return { w: w, h: h };
  }

  function svgOf(plot, w, h) {
    var sel = d3.select(plot).select('svg');
    if (sel.empty()) sel = d3.select(plot).append('svg');
    sel.attr('viewBox', '0 0 ' + w + ' ' + h)
       .attr('width', w).attr('height', h)
       .attr('role', 'img');
    return sel;
  }

  function layerOf(svg, cls, tx, ty) {
    var g = svg.select('g.' + cls);
    if (g.empty()) {
      g = svg.append('g').attr('class', cls);
      // Gridlines are chrome: they always sit behind the marks, whatever
      // order the drawing code happens to create the layers in.
      if (cls === 'grid') g.lower();
    }
    if (tx != null) g.attr('transform', 'translate(' + tx + ',' + ty + ')');
    return g;
  }

  /* ---- tooltip --------------------------------------------------- */
  function Tip(plot) {
    var el = document.createElement('div');
    el.className = 'tip';
    el.setAttribute('role', 'status');
    plot.appendChild(el);
    return {
      show: function (html, x, y) {
        el.innerHTML = html;
        el.dataset.show = '1';
        var pw = plot.clientWidth;
        el.style.left = Math.max(70, Math.min(pw - 70, x)) + 'px';
        el.style.top = y + 'px';
      },
      hide: function () { el.dataset.show = '0'; },
      node: el
    };
  }
  function tipRow(color, k, v) {
    return '<div class="row"><span class="k">' + (color ? '<i style="background:' + color + '"></i>' : '') +
           k + '</span><span class="v">' + v + '</span></div>';
  }

  /* ---- legend ---------------------------------------------------- */
  function drawLegend(node, items, opts) {
    opts = opts || {};
    if (!node) return;
    node.innerHTML = '';
    if (!items || items.length < 2) {
      if (opts.note) node.innerHTML = '<span class="legend-note">' + opts.note + '</span>';
      return;
    }
    items.forEach(function (it) {
      var b = document.createElement(opts.onToggle ? 'button' : 'span');
      b.className = 'legend-item';
      if (opts.onToggle) { b.type = 'button'; b.setAttribute('aria-pressed', it.off ? 'false' : 'true'); }
      if (it.off) b.dataset.off = '1';
      b.innerHTML = '<span class="swatch' + (opts.line ? ' line' : '') + '" style="background:' + it.color + '"></span>' +
                    '<span>' + it.label + '</span>';
      if (opts.onToggle) b.addEventListener('click', function () { opts.onToggle(it); });
      node.appendChild(b);
    });
    if (opts.note) {
      var n = document.createElement('span');
      n.className = 'legend-note';
      n.textContent = opts.note;
      node.appendChild(n);
    }
  }

  function scaleLegend(node, colors, loLabel, hiLabel, midLabel) {
    if (!node) return;
    node.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'scale-legend';
    wrap.innerHTML = '<span>' + loLabel + '</span><span class="ramp">' +
      colors.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('') +
      '</span><span>' + hiLabel + '</span>' + (midLabel ? '<span>· ' + midLabel + '</span>' : '');
    node.appendChild(wrap);
  }

  /* ---- axis helpers ---------------------------------------------- */
  function axisBottom(g, scale, ticks, format) {
    var ax = d3.axisBottom(scale).ticks(ticks).tickSize(0).tickPadding(8);
    if (format) ax.tickFormat(format);
    g.call(ax);
    g.select('.domain').attr('stroke', cssVar('--axis'));
    return g;
  }
  function axisLeft(g, scale, ticks, format) {
    var ax = d3.axisLeft(scale).ticks(ticks).tickSize(0).tickPadding(8);
    if (format) ax.tickFormat(format);
    g.call(ax);
    g.select('.domain').remove();
    return g;
  }
  function hGrid(g, scale, w, ticks) {
    var vals = scale.ticks(ticks || 5);
    var l = g.selectAll('line').data(vals);
    l.enter().append('line').merge(l)
      .attr('x1', 0).attr('x2', w)
      .attr('y1', function (d) { return scale(d); })
      .attr('y2', function (d) { return scale(d); });
    l.exit().remove();
  }

  /* rounded-top / rounded-end bar path: 4px radius on the data end only */
  function barPathH(x0, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, h / 2);
    if (w >= 0) {
      return 'M' + x0 + ',' + y + 'h' + (w - r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
             'v' + (h - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r + 'H' + x0 + 'Z';
    }
    var aw = -w;
    return 'M' + x0 + ',' + y + 'h' + (-(aw - r)) + 'a' + r + ',' + r + ' 0 0 0 ' + (-r) + ',' + r +
           'v' + (h - 2 * r) + 'a' + r + ',' + r + ' 0 0 0 ' + r + ',' + r + 'H' + x0 + 'Z';
  }
  function barPathV(x, yTop, w, h, r) {
    r = Math.min(r, w / 2, Math.abs(h) / 2);
    if (h >= 0) { // grows upward from baseline at yTop+h
      return 'M' + x + ',' + (yTop + h) + 'V' + (yTop + r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) +
             'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'V' + (yTop + h) + 'Z';
    }
    return 'M' + x + ',' + yTop + 'V' + (yTop - h - r) + 'a' + r + ',' + r + ' 0 0 0 ' + r + ',' + r +
           'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 0 ' + r + ',' + (-r) + 'V' + yTop + 'Z';
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  /* ================================================================
   * 1. stream — stacked area over time
   * ================================================================ */
  function stream(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'pct1');

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.56, 260, 420);
      var pad = { t: 14, r: 14, b: 26, l: 40 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var series = spec.series;
      var x = d3.scaleLinear().domain([0, spec.days.length - 1]).range([0, W]);
      var stack = d3.stack().keys(series.map(function (s) { return s.id; }))
        .order(d3.stackOrderNone).offset(d3.stackOffsetNone);
      var rows = spec.days.map(function (d, i) {
        var o = { i: i };
        series.forEach(function (s) { o[s.id] = s.values[i]; });
        return o;
      });
      var st = stack(rows);
      var y = d3.scaleLinear().domain([0, d3.max(st[st.length - 1], function (d) { return d[1]; })]).nice().range([H, 0]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 4); });

      var area = d3.area()
        .x(function (d) { return x(d.data.i); })
        .y0(function (d) { return y(d[0]); })
        .y1(function (d) { return y(d[1]); })
        .curve(d3.curveBasis);

      var hi = state.highlight;
      var paths = g.selectAll('path.area').data(st, function (d) { return d.key; });
      paths.enter().append('path').attr('class', 'area')
        .attr('stroke', surface()).attr('stroke-width', 2).attr('stroke-linejoin', 'round')
        .merge(paths)
        .attr('fill', function (d, i) { return pal(series[i].slot); })
        .attr('stroke', surface())
        .anim()
        .attr('d', area)
        .attr('opacity', function (d) { return !hi ? 1 : (d.key === hi ? 1 : 0.16); });
      paths.exit().remove();

      // direct labels on the largest bands (selective, never all)
      var labelled = series.map(function (s, i) {
        var mid = Math.round(spec.days.length * 0.66);
        var band = st[i][mid];
        return { s: s, y: (y(band[0]) + y(band[1])) / 2, h: Math.abs(y(band[0]) - y(band[1])), x: x(mid) };
      }).filter(function (d) { return d.h > 22; });
      var labs = g.selectAll('text.mark-label').data(labelled, function (d) { return d.s.id; });
      labs.enter().append('text').attr('class', 'mark-label').attr('text-anchor', 'middle')
        .merge(labs)
        .text(function (d) { return d.s.short; })
        .anim()
        .attr('x', function (d) { return d.x; }).attr('y', function (d) { return d.y + 4; })
        .attr('opacity', function (d) { return !hi || d.s.id === hi ? 1 : 0.2; });
      labs.exit().remove();

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H).attr('class', 'axis ax-x'), x, Math.max(3, Math.min(7, Math.floor(W / 95))),
        function (i) { return spec.days[Math.round(i)] ? spec.days[Math.round(i)].label : ''; });
      axisLeft(layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y'), y, 4, f);

      // event annotations from the step state
      var anns = (state.annotate || []);
      var ag = layerOf(svg, 'ann', pad.l, pad.t).attr('class', 'ann');
      var a = ag.selectAll('g.a').data(anns, function (d) { return d.i + d.label; });
      var ae = a.enter().append('g').attr('class', 'a');
      ae.append('line').attr('class', 'annot-line');
      ae.append('text').attr('class', 'annot');
      var am = ae.merge(a).attr('transform', function (d) { return 'translate(' + x(d.i) + ',0)'; });
      am.select('line').attr('y1', 0).attr('y2', H).attr('stroke-dasharray', 'none');
      am.select('text').attr('y', -2).attr('text-anchor', function (d) { return d.i > spec.days.length * 0.7 ? 'end' : 'start'; })
        .attr('x', function (d) { return d.i > spec.days.length * 0.7 ? -4 : 4; })
        .text(function (d) { return d.label; });
      am.attr('opacity', 0).anim().attr('opacity', 1);
      a.exit().remove();

      // hover: crosshair + all-series readout
      var hg = layerOf(svg, 'hover', pad.l, pad.t).attr('class', 'hover');
      hg.selectAll('*').remove();
      var cross = hg.append('line').attr('y1', 0).attr('y2', H)
        .attr('stroke', ink()).attr('stroke-width', 1).attr('opacity', 0);
      hg.append('rect').attr('class', 'hit').attr('width', W).attr('height', H)
        .on('mousemove', function (ev) {
          var i = Math.round(x.invert(d3.pointer(ev, this)[0]));
          i = Math.max(0, Math.min(spec.days.length - 1, i));
          cross.attr('x1', x(i)).attr('x2', x(i)).attr('opacity', .5);
          var html = '<b>' + spec.days[i].label + '</b>' +
            series.slice().sort(function (p, q) { return q.values[i] - p.values[i]; })
              .map(function (s) { return tipRow(pal(s.slot), s.short, f(s.values[i])); }).join('');
          tip.show(html, x(i) + pad.l, pad.t + 10);
        })
        .on('mouseleave', function () { cross.attr('opacity', 0); tip.hide(); });

      drawLegend(ctx.legend, series.map(function (s) {
        return { id: s.id, label: s.name, color: pal(s.slot), off: hi && s.id !== hi };
      }), { note: spec.legendNote });
    }

    return {
      update: function (s) { state = Object.assign({}, state, s || {}); draw(); },
      redraw: function () { instant = true; draw(); }
    };
  }

  /* ================================================================
   * 2. bars — ranked horizontal bars (signed capable, optional reference tick)
   * ================================================================ */
  function bars(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'num1');

    function draw() {
      NOW = instant; instant = false;
      var rows = spec.rows.slice();
      if (state.filter) rows = rows.filter(state.filter);
      if (spec.sort !== false) rows.sort(function (a, b) { return (b.value) - (a.value); });
      var rowH = spec.rowHeight || 30;
      var pad = { t: 8, r: 54, b: 24, l: spec.labelWidth || 150 };
      var m = { w: Math.max(260, plot.clientWidth || 640), h: rows.length * rowH + pad.t + pad.b };
      var W = m.w - pad.l - pad.r, H = rows.length * rowH;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var signed = !!spec.signed;
      var maxV = d3.max(rows, function (d) { return Math.abs(d.value); }) || 1;
      var refMax = spec.reference ? d3.max(rows, function (d) { return Math.abs(d[spec.reference] || 0); }) : 0;
      var x = d3.scaleLinear().domain(signed ? [-maxV, maxV] : [0, Math.max(maxV, refMax)]).nice().range([0, W]);
      var y = d3.scaleBand().domain(rows.map(function (d) { return d.id; })).range([0, H]).paddingInner(0.34);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) {
        var vals = x.ticks(4);
        var l = gg.selectAll('line').data(vals);
        l.enter().append('line').merge(l)
          .attr('y1', 0).attr('y2', H).attr('x1', x).attr('x2', x);
        l.exit().remove();
      });

      var zero = x(0);
      var hi = state.highlight;
      var focus = state.focus; // array of ids to keep in full colour

      function colorOf(d) {
        if (spec.colorMode === 'diverging') return d.value >= 0 ? cssVar('--div-pos') : cssVar('--div-neg');
        return pal(d.slot || spec.slot || 1);
      }
      function opacityOf(d) {
        if (hi) return d.id === hi ? 1 : 0.2;
        if (focus && focus.length) return focus.indexOf(d.id) >= 0 ? 1 : 0.18;
        return 1;
      }

      var b = g.selectAll('path.bar').data(rows, function (d) { return d.id; });
      b.enter().append('path').attr('class', 'bar')
        .attr('d', function (d) { return barPathH(zero, y(d.id), 0, y.bandwidth(), 4); })
        .merge(b)
        .attr('fill', colorOf)
        .anim()
        .attr('d', function (d) { return barPathH(Math.min(zero, x(d.value)) === zero ? zero : x(d.value), y(d.id), x(d.value) - zero, y.bandwidth(), 4); })
        .attr('opacity', opacityOf);
      b.exit().remove();

      // reference tick (e.g. population share, corpus share) — not a second axis
      if (spec.reference) {
        var r = g.selectAll('line.ref').data(rows, function (d) { return d.id; });
        r.enter().append('line').attr('class', 'ref').merge(r)
          .attr('stroke', ink()).attr('stroke-width', 2)
          .anim()
          .attr('x1', function (d) { return x(d[spec.reference]); })
          .attr('x2', function (d) { return x(d[spec.reference]); })
          .attr('y1', function (d) { return y(d.id) - 3; })
          .attr('y2', function (d) { return y(d.id) + y.bandwidth() + 3; })
          .attr('opacity', function (d) { return opacityOf(d) * 0.75; });
        r.exit().remove();
      }

      // row labels
      var lab = g.selectAll('text.rowlab').data(rows, function (d) { return d.id; });
      lab.enter().append('text').attr('class', 'rowlab')
        .attr('text-anchor', 'end').attr('fill', ink2()).style('font-size', '12px')
        .merge(lab)
        .attr('x', -10)
        .attr('fill', ink2())
        .text(function (d) { return d.label; })
        .anim()
        .attr('y', function (d) { return y(d.id) + y.bandwidth() / 2 + 4; })
        .attr('opacity', function (d) { return Math.max(0.45, opacityOf(d)); });
      lab.exit().remove();

      // value labels — outside the bar end, always visible (table-free reading)
      var vl = g.selectAll('text.value-label').data(rows, function (d) { return d.id; });
      vl.enter().append('text').attr('class', 'value-label').merge(vl)
        .attr('text-anchor', function (d) { return d.value < 0 ? 'end' : 'start'; })
        .text(function (d) { return f(d.value); })
        .attr('fill', ink2())
        .anim()
        .attr('x', function (d) { return x(d.value) + (d.value < 0 ? -6 : 6); })
        .attr('y', function (d) { return y(d.id) + y.bandwidth() / 2 + 4; })
        .attr('opacity', opacityOf);
      vl.exit().remove();

      if (signed) {
        layerOf(svg, 'zero', pad.l, pad.t).attr('class', 'zero')
          .selectAll('line').data([0]).join('line').attr('class', 'zero-line')
          .attr('x1', zero).attr('x2', zero).attr('y1', 0).attr('y2', H);
      }

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H + 4).attr('class', 'axis ax-x'), x, 4, f);

      g.selectAll('rect.hit').data(rows, function (d) { return d.id; })
        .join('rect').attr('class', 'hit')
        .attr('x', -pad.l).attr('width', W + pad.l).attr('height', y.step())
        .attr('y', function (d) { return y(d.id) - (y.step() - y.bandwidth()) / 2; })
        .on('mousemove', function (ev, d) {
          var html = '<b>' + esc(d.full || d.label) + '</b>' + tipRow(colorOf(d), spec.valueName || 'Value', f(d.value)) +
            (spec.reference ? tipRow(ink(), spec.referenceName || 'Reference', f(d[spec.reference])) : '') +
            (d.note ? '<span class="hint">' + esc(d.note) + '</span>' : '');
          tip.show(html, d3.pointer(ev, plot)[0], y(d.id) + pad.t + y.bandwidth() / 2);
        })
        .on('mouseleave', function () { tip.hide(); });

      var legendItems = [];
      if (spec.colorMode === 'diverging') {
        legendItems = [{ label: spec.negLabel || 'Below', color: cssVar('--div-neg') },
                       { label: spec.posLabel || 'Above', color: cssVar('--div-pos') }];
      } else if (spec.legendBy === 'slot') {
        var seen = {};
        rows.forEach(function (d) { if (d.slot && !seen[d.slot]) { seen[d.slot] = 1; legendItems.push({ label: d.actorLabel || d.label, color: pal(d.slot) }); } });
      }
      drawLegend(ctx.legend, legendItems, { note: spec.legendNote || (spec.reference ? '▍ marks ' + (spec.referenceName || 'the reference value') : null) });
    }

    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 3. columns — vertical bars with confidence whiskers (lag plots)
   * ================================================================ */
  function columns(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'corr');

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.5, 240, 360);
      var pad = { t: 16, r: 14, b: 40, l: 44 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);
      var rows = spec.rows;

      var x = d3.scaleBand().domain(rows.map(function (d) { return d.id; })).range([0, W]).paddingInner(0.28);
      var ext = d3.max(rows, function (d) { return Math.abs(d.value) + (d.ci || 0); });
      var y = d3.scaleLinear().domain([-ext, ext]).nice().range([H, 0]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 5); });

      var hi = state.highlight;
      var band = state.band; // [lo,hi] of d.k to emphasise
      function op(d) {
        if (hi != null) return d.id === hi ? 1 : 0.2;
        if (band) return (d.k >= band[0] && d.k <= band[1]) ? 1 : 0.22;
        return 1;
      }
      function col(d) { return d.value >= 0 ? cssVar('--div-pos') : cssVar('--div-neg'); }

      var b = g.selectAll('path.col').data(rows, function (d) { return d.id; });
      b.enter().append('path').attr('class', 'col').merge(b)
        .attr('fill', col)
        .anim()
        .attr('d', function (d) { return barPathV(x(d.id), y(Math.max(0, d.value)), x.bandwidth(), Math.abs(y(d.value) - y(0)) * (d.value >= 0 ? 1 : -1), 3); })
        .attr('opacity', op);
      b.exit().remove();

      if (rows[0] && rows[0].ci != null) {
        var w = g.selectAll('line.ci').data(rows, function (d) { return d.id; });
        w.enter().append('line').attr('class', 'ci').merge(w)
          .attr('stroke', ink()).attr('stroke-width', 1.5).attr('stroke-linecap', 'round')
          .anim()
          .attr('x1', function (d) { return x(d.id) + x.bandwidth() / 2; })
          .attr('x2', function (d) { return x(d.id) + x.bandwidth() / 2; })
          .attr('y1', function (d) { return y(d.value - d.ci); })
          .attr('y2', function (d) { return y(d.value + d.ci); })
          .attr('opacity', function (d) { return op(d) * 0.5; });
        w.exit().remove();
      }

      layerOf(svg, 'zero', pad.l, pad.t).attr('class', 'zero')
        .selectAll('line').data([0]).join('line').attr('class', 'zero-line')
        .attr('x1', 0).attr('x2', W).attr('y1', y(0)).attr('y2', y(0));

      var every = Math.ceil(rows.length / 8);
      var byId = {}; rows.forEach(function (d) { byId[d.id] = d; });
      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H).attr('class', 'axis ax-x'),
        d3.scalePoint().domain(rows.map(function (d) { return d.id; })).range([x.bandwidth() / 2, W - x.bandwidth() / 2]),
        null, function (id) { return byId[id].label; })
        .selectAll('text').attr('opacity', function (d, i) { return i % every === 0 ? 1 : 0; });
      axisLeft(layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y'), y, 5, f);

      layerOf(svg, 'axt', 0, 0).attr('class', 'axt').selectAll('text').data([0]).join('text')
        .attr('class', 'axis-title').attr('x', pad.l).attr('y', m.h - 8).text(spec.xLabel || '');

      g.selectAll('rect.hit').data(rows, function (d) { return d.id; })
        .join('rect').attr('class', 'hit')
        .attr('x', function (d) { return x(d.id) - x.step() * 0.14; })
        .attr('width', x.step()).attr('y', 0).attr('height', H)
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.label) + '</b>' + tipRow(col(d), spec.valueName || 'Correlation', f(d.value)) +
                   (d.ci ? '<span class="hint">95% interval ±' + d3.format('.2f')(d.ci) + '</span>' : ''),
                   x(d.id) + x.bandwidth() / 2 + pad.l, y(Math.max(0, d.value)) + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, [
        { label: spec.negLabel || 'Negative', color: cssVar('--div-neg') },
        { label: spec.posLabel || 'Positive', color: cssVar('--div-pos') }
      ], { note: spec.legendNote });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 4. quadrant — scatter with quadrant guides (max 3 hues, all-pairs safe)
   * ================================================================ */
  function quadrant(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var kinds = spec.kinds; // [{id,label,slot}] max 3

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.72, 300, 460);
      var pad = { t: 18, r: 18, b: 44, l: 48 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var pts = spec.points;
      var x = d3.scaleLinear().domain([0, d3.max(pts, function (d) { return d.x; }) * 1.08]).nice().range([0, W]);
      var y = d3.scaleLinear().domain([0, d3.max(pts, function (d) { return d.y; }) * 1.1]).nice().range([H, 0]);
      var r = d3.scaleSqrt().domain([0, d3.max(pts, function (d) { return d.n; })]).range([3, 17]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 4); });

      var xMid = spec.xMid != null ? spec.xMid : d3.mean(pts, function (d) { return d.x; });
      var yMid = spec.yMid != null ? spec.yMid : d3.mean(pts, function (d) { return d.y; });
      var qg = layerOf(svg, 'quad', pad.l, pad.t).attr('class', 'quad');
      qg.selectAll('line').data([0, 1]).join('line')
        .attr('stroke', cssVar('--rule-strong')).attr('stroke-width', 1)
        .attr('x1', function (d) { return d ? 0 : x(xMid); }).attr('x2', function (d) { return d ? W : x(xMid); })
        .attr('y1', function (d) { return d ? y(yMid) : 0; }).attr('y2', function (d) { return d ? y(yMid) : H; });
      var ql = spec.quadrantLabels || [];
      qg.selectAll('text').data(ql).join('text').attr('class', 'quadrant-label')
        .attr('x', function (d) { return d.right ? W - 4 : 4; })
        .attr('y', function (d) { return d.top ? 12 : H - 6; })
        .attr('text-anchor', function (d) { return d.right ? 'end' : 'start'; })
        .text(function (d) { return d.label; });

      var activeKinds = state.kinds || kinds.map(function (k) { return k.id; });
      var hi = state.highlight;
      function kindOf(d) { return kinds.filter(function (k) { return k.id === d.kind; })[0] || kinds[0]; }
      function op(d) {
        if (activeKinds.indexOf(d.kind) < 0) return 0.06;
        if (hi) return d.id === hi ? 1 : 0.22;
        return 0.88;
      }

      var c = g.selectAll('circle.pt').data(pts, function (d) { return d.id; });
      c.enter().append('circle').attr('class', 'pt node-ring')
        .attr('cx', function (d) { return x(d.x); }).attr('cy', function (d) { return y(d.y); }).attr('r', 0)
        .merge(c)
        .attr('fill', function (d) { return pal(kindOf(d).slot); })
        .attr('stroke', surface())
        .anim()
        .attr('cx', function (d) { return x(d.x); }).attr('cy', function (d) { return y(d.y); })
        .attr('r', function (d) { return r(d.n); })
        .attr('opacity', op);
      c.exit().remove();

      // selective labels: highlighted point, plus the extremes
      var labelIds = {};
      if (hi) labelIds[hi] = 1;
      (state.label || []).forEach(function (id) { labelIds[id] = 1; });
      if (!hi && !(state.label || []).length) {
        pts.filter(function (d) { return activeKinds.indexOf(d.kind) >= 0; })
          .slice().sort(function (a, b) { return (b.x * b.y) - (a.x * a.y); }).slice(0, 4)
          .forEach(function (d) { labelIds[d.id] = 1; });
      }
      var shown = pts.filter(function (d) { return labelIds[d.id]; });
      // Flip a label to the left of its point whenever it would otherwise
      // run past the plot edge — estimated from the string, so long names
      // on mid-chart points flip too.
      function flips(d) { return x(d.x) + r(d.n) + 8 + d.label.length * 6.3 > W; }
      var lb = g.selectAll('text.mark-label').data(shown, function (d) { return d.id; });
      lb.enter().append('text').attr('class', 'mark-label').merge(lb)
        .attr('text-anchor', function (d) { return flips(d) ? 'end' : 'start'; })
        .text(function (d) { return d.label; })
        .anim()
        .attr('x', function (d) { return x(d.x) + (flips(d) ? -(r(d.n) + 5) : r(d.n) + 5); })
        .attr('y', function (d) { return y(d.y) + 4; })
        .attr('opacity', 1);
      lb.exit().remove();

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H).attr('class', 'axis ax-x'), x, 5, fmt(spec.xFormat || 'pctv'));
      axisLeft(layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y'), y, 5, fmt(spec.yFormat || 'num2'));
      var t = layerOf(svg, 'axt', 0, 0).attr('class', 'axt');
      t.selectAll('text.x').data([0]).join('text').attr('class', 'axis-title x')
        .attr('x', pad.l).attr('y', m.h - 6).text(spec.xLabel || '');
      t.selectAll('text.y').data([0]).join('text').attr('class', 'axis-title y')
        .attr('transform', 'translate(12,' + (pad.t + H) + ') rotate(-90)').text(spec.yLabel || '');

      g.selectAll('circle.hit').data(pts, function (d) { return d.id; })
        .join('circle').attr('class', 'hit')
        .attr('cx', function (d) { return x(d.x); }).attr('cy', function (d) { return y(d.y); })
        .attr('r', function (d) { return Math.max(13, r(d.n) + 4); })
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.label) + '</b>' +
            tipRow(pal(kindOf(d).slot), kindOf(d).label, '') +
            tipRow(null, spec.xLabel, fmt(spec.xFormat || 'pctv')(d.x)) +
            tipRow(null, spec.yLabel, fmt(spec.yFormat || 'num2')(d.y)) +
            tipRow(null, 'Articles', d3.format(',')(d.n)),
            x(d.x) + pad.l, y(d.y) + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, kinds.map(function (k) {
        return { id: k.id, label: k.label, color: pal(k.slot), off: activeKinds.indexOf(k.id) < 0 };
      }), {
        note: 'Circle area = number of articles',
        onToggle: function (it) {
          var a = (state.kinds || kinds.map(function (k) { return k.id; })).slice();
          var i = a.indexOf(it.id);
          if (i >= 0) { if (a.length > 1) a.splice(i, 1); } else a.push(it.id);
          state.kinds = a; draw();
        }
      });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 5. lollipop / dumbbell — two values per row
   * ================================================================ */
  function lollipop(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'pct1');

    function draw() {
      NOW = instant; instant = false;
      var rows = spec.rows.slice();
      var sortBy = state.sortBy || spec.sortBy || 'gap';
      rows.sort(function (p, q) {
        // 'gap' keeps the sign (over- vs under-), 'absgap' ranks by distance
        // apart regardless of direction.
        if (sortBy === 'gap') return (q.b - q.a) - (p.b - p.a);
        if (sortBy === 'absgap') return Math.abs(q.b - q.a) - Math.abs(p.b - p.a);
        if (sortBy === 'a') return q.a - p.a;
        if (sortBy === 'b') return q.b - p.b;
        return 0;
      });
      var rowH = spec.rowHeight || 32;
      var pad = { t: 10, r: 60, b: 34, l: spec.labelWidth || 178 };
      var m = { w: Math.max(260, plot.clientWidth || 640), h: rows.length * rowH + pad.t + pad.b };
      var W = m.w - pad.l - pad.r, H = rows.length * rowH;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var all = rows.reduce(function (acc, d) { return acc.concat([d.a, d.b]); }, []);
      var x = d3.scaleLinear().domain(spec.domain || [0, d3.max(all) * 1.05]).nice().range([0, W]);
      var y = d3.scaleBand().domain(rows.map(function (d) { return d.id; })).range([0, H]).paddingInner(0.25);
      var cy = function (d) { return y(d.id) + y.bandwidth() / 2; };

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) {
        var l = gg.selectAll('line').data(x.ticks(5));
        l.enter().append('line').merge(l).attr('y1', 0).attr('y2', H).attr('x1', x).attr('x2', x);
        l.exit().remove();
      });

      var hi = state.highlight;
      function op(d) { return !hi ? 1 : (d.id === hi ? 1 : 0.2); }

      var cA = pal(spec.slotA || 1), cB = pal(spec.slotB || 2);

      var ln = g.selectAll('line.conn').data(rows, function (d) { return d.id; });
      ln.enter().append('line').attr('class', 'conn').merge(ln)
        .attr('stroke', cssVar('--rule-strong')).attr('stroke-width', 3).attr('stroke-linecap', 'round')
        .anim()
        .attr('x1', function (d) { return x(d.a); }).attr('x2', function (d) { return x(d.b); })
        .attr('y1', cy).attr('y2', cy).attr('opacity', op);
      ln.exit().remove();

      [['a', cA], ['b', cB]].forEach(function (p) {
        var k = p[0], col = p[1];
        var c = g.selectAll('circle.d-' + k).data(rows, function (d) { return d.id; });
        c.enter().append('circle').attr('class', 'd-' + k + ' node-ring').merge(c)
          .attr('fill', col).attr('stroke', surface())
          .anim()
          .attr('cx', function (d) { return x(d[k]); }).attr('cy', cy).attr('r', 6).attr('opacity', op);
        c.exit().remove();
      });

      var lab = g.selectAll('text.rowlab').data(rows, function (d) { return d.id; });
      lab.enter().append('text').attr('class', 'rowlab').attr('text-anchor', 'end')
        .attr('fill', ink2()).style('font-size', '12px').merge(lab)
        .attr('x', -12).text(function (d) { return d.label; })
        .anim().attr('y', function (d) { return cy(d) + 4; })
        .attr('opacity', function (d) { return Math.max(0.45, op(d)); });
      lab.exit().remove();

      var gl = g.selectAll('text.value-label').data(rows, function (d) { return d.id; });
      gl.enter().append('text').attr('class', 'value-label').merge(gl)
        .text(function (d) { return (d.b - d.a > 0 ? '+' : '') + f(d.b - d.a); })
        .attr('fill', ink2())
        .anim()
        .attr('x', W + 8).attr('y', function (d) { return cy(d) + 4; }).attr('opacity', op);
      gl.exit().remove();

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H + 6).attr('class', 'axis ax-x'), x, 5, f);

      g.selectAll('rect.hit').data(rows, function (d) { return d.id; })
        .join('rect').attr('class', 'hit')
        .attr('x', -pad.l).attr('width', W + pad.l + 40).attr('height', y.step())
        .attr('y', function (d) { return y(d.id); })
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.label) + '</b>' +
            tipRow(cA, spec.aLabel, f(d.a)) + tipRow(cB, spec.bLabel, f(d.b)) +
            tipRow(null, 'Difference', (d.b - d.a > 0 ? '+' : '') + f(d.b - d.a)) +
            (d.gloss ? '<span class="hint">' + esc(d.gloss) + '</span>' : ''),
            d3.pointer(ev, plot)[0], cy(d) + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, [{ label: spec.aLabel, color: cA }, { label: spec.bLabel, color: cB }],
        { note: spec.legendNote || 'Right-hand number is the difference' });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 6. heatmap — matrix, sequential or diverging
   * ================================================================ */
  function heatmap(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'sd');

    function draw() {
      NOW = instant; instant = false;
      var rows = spec.rows, cols = spec.cols;
      // Column heads are set at -32°, so the space they need above the grid
      // depends on how long the longest one is.
      var longest = d3.max(cols, function (c) { return c.label.length; }) || 8;
      var pad = { t: Math.min(120, Math.round(26 + longest * 3.4)), r: 10, b: 10, l: spec.labelWidth || 150 };
      var m = { w: Math.max(260, plot.clientWidth || 640) };
      var cellW = (m.w - pad.l - pad.r) / cols.length;
      var cellH = Math.max(28, Math.min(46, cellW * 0.62));
      m.h = rows.length * cellH + pad.t + pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var vals = spec.cells.map(function (c) { return c.value; });
      var scale, ramp;
      if (spec.scale === 'sequential') {
        var dom = spec.domain || [d3.min(vals), d3.max(vals)];
        scale = seqScale(dom); ramp = SEQ_STEPS.map(seq);
      } else {
        var mx = spec.domain ? spec.domain[1] : d3.max(vals, Math.abs);
        scale = divScale([-mx, mx]);
        ramp = d3.range(9).map(function (i) { return scale(-mx + (2 * mx) * i / 8); });
      }

      var hr = state.highlightRow, hc = state.highlightCol;
      function op(c) {
        if (hr && c.row !== hr) return 0.16;
        if (hc && c.col !== hc) return 0.16;
        return 1;
      }

      var rIdx = {}, cIdx = {};
      rows.forEach(function (d, i) { rIdx[d.id] = i; });
      cols.forEach(function (d, i) { cIdx[d.id] = i; });

      var cell = g.selectAll('rect.cell').data(spec.cells, function (d) { return d.row + '|' + d.col; });
      cell.enter().append('rect').attr('class', 'cell').attr('rx', 3).merge(cell)
        .attr('x', function (d) { return cIdx[d.col] * cellW + 1; })
        .attr('y', function (d) { return rIdx[d.row] * cellH + 1; })
        .attr('width', cellW - 2).attr('height', cellH - 2)
        .anim()
        .attr('fill', function (d) { return scale(d.value); })
        .attr('opacity', op);
      cell.exit().remove();

      // in-cell values only when they fit
      if (cellW > 52) {
        var tx = g.selectAll('text.cellv').data(spec.cells, function (d) { return d.row + '|' + d.col; });
        tx.enter().append('text').attr('class', 'cellv').attr('text-anchor', 'middle')
          .style('font-size', '10.5px').style('font-variant-numeric', 'tabular-nums').merge(tx)
          .attr('x', function (d) { return cIdx[d.col] * cellW + cellW / 2; })
          .attr('y', function (d) { return rIdx[d.row] * cellH + cellH / 2 + 4; })
          .text(function (d) { return d3.format(spec.cellFormat || '+.2f')(d.value); })
          .attr('fill', function (d) {
            var c = d3.color(scale(d.value));
            var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
            return lum > 0.6 ? cssVar('--ink') : '#fff';
          })
          .anim().attr('opacity', op);
        tx.exit().remove();
      } else { g.selectAll('text.cellv').remove(); }

      var rl = g.selectAll('text.rowlab').data(rows, function (d) { return d.id; });
      rl.enter().append('text').attr('class', 'rowlab').attr('text-anchor', 'end')
        .attr('fill', ink2()).style('font-size', '12px').merge(rl)
        .attr('x', -10).attr('y', function (d) { return rIdx[d.id] * cellH + cellH / 2 + 4; })
        .text(function (d) { return d.label; })
        .attr('opacity', function (d) { return !hr || d.id === hr ? 1 : 0.4; });
      rl.exit().remove();

      var cl = layerOf(svg, 'colhead', pad.l, pad.t - 10).attr('class', 'colhead')
        .selectAll('text').data(cols, function (d) { return d.id; });
      cl.enter().append('text').attr('fill', ink2()).style('font-size', '11px').merge(cl)
        .attr('transform', function (d) { return 'translate(' + (cIdx[d.id] * cellW + cellW / 2) + ',0) rotate(-32)'; })
        .attr('text-anchor', 'start')
        .text(function (d) { return d.label; })
        .attr('opacity', function (d) { return !hc || d.id === hc ? 1 : 0.4; });
      cl.exit().remove();

      g.selectAll('rect.hit').data(spec.cells, function (d) { return d.row + '|' + d.col; })
        .join('rect').attr('class', 'hit')
        .attr('x', function (d) { return cIdx[d.col] * cellW; })
        .attr('y', function (d) { return rIdx[d.row] * cellH; })
        .attr('width', cellW).attr('height', cellH)
        .on('mousemove', function (ev, d) {
          var rw = rows[rIdx[d.row]], cc = cols[cIdx[d.col]];
          tip.show('<b>' + esc(rw.label) + '</b>' + tipRow(scale(d.value), cc.label, f(d.value)) +
            (d.n ? tipRow(null, 'Articles', d3.format(',')(d.n)) : '') +
            (cc.gloss ? '<span class="hint">' + esc(cc.gloss) + '</span>' : ''),
            cIdx[d.col] * cellW + cellW / 2 + pad.l, rIdx[d.row] * cellH + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      scaleLegend(ctx.legend, ramp, spec.lowLabel || 'Low', spec.highLabel || 'High', spec.midLabel);
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 7. flow — three-stage sankey, ribbons coloured by originating frame
   * ================================================================ */
  function flow(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.66, 320, 480);
      // Gutters on both sides so the end-stage labels never sit on a ribbon.
      var wide = m.w > 520;
      var pad = { t: 46, r: wide ? 118 : 74, b: 20, l: wide ? 126 : 78 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var nodes = spec.nodes.map(function (d) { return Object.assign({}, d); });
      var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
      var links = spec.links.map(function (d) { return Object.assign({}, d); });

      var stages = d3.groups(nodes, function (d) { return d.stage; }).sort(function (a, b) { return a[0] - b[0]; });
      var nStage = stages.length;
      var nodeW = 13;
      var xOf = function (s) { return nStage === 1 ? 0 : (W - nodeW) * s / (nStage - 1); };

      var total = d3.sum(stages[0][1], function (d) { return d.value; });
      var kY = function (v) { return v / total * (H - 0); };

      stages.forEach(function (st) {
        var list = st[1];
        var want = st[0] === 0 || st[0] === nStage - 1 ? 16 : 28;
        var gap = list.length > 1 ? Math.min(want, (H - d3.sum(list, function (d) { return kY(d.value); })) / (list.length - 1)) : 0;
        var yy = 0;
        list.forEach(function (n) { n.y0 = yy; n.h = kY(n.value); yy += n.h + gap; });
        var off = (H - (yy - gap)) / 2;
        list.forEach(function (n) { n.y0 += off; });
      });

      // Stack each endpoint in the order of the node at the far end, which is
      // what keeps a sankey's ribbons from crossing each other unnecessarily.
      var srcOff = {}, tgtOff = {};
      links.forEach(function (l) { l.w = kY(l.value); l.x0 = xOf(byId[l.source].stage) + nodeW; l.x1 = xOf(byId[l.target].stage); });
      links.slice().sort(function (a, b) {
        return (byId[a.target].y0 - byId[b.target].y0) || ((a.slot || 0) - (b.slot || 0));
      }).forEach(function (l) {
        srcOff[l.source] = srcOff[l.source] || 0;
        l.sy = byId[l.source].y0 + srcOff[l.source];
        srcOff[l.source] += l.w;
      });
      links.slice().sort(function (a, b) {
        return (byId[a.source].y0 - byId[b.source].y0) || ((a.slot || 0) - (b.slot || 0));
      }).forEach(function (l) {
        tgtOff[l.target] = tgtOff[l.target] || 0;
        l.ty = byId[l.target].y0 + tgtOff[l.target];
        tgtOff[l.target] += l.w;
      });

      function ribbon(l) {
        var xm = (l.x0 + l.x1) / 2;
        return 'M' + l.x0 + ',' + l.sy +
               'C' + xm + ',' + l.sy + ' ' + xm + ',' + l.ty + ' ' + l.x1 + ',' + l.ty +
               'v' + l.w +
               'C' + xm + ',' + (l.ty + l.w) + ' ' + xm + ',' + (l.sy + l.w) + ' ' + l.x0 + ',' + (l.sy + l.w) + 'Z';
      }

      var hi = state.highlight;
      function op(l) { return !hi ? 0.62 : (l.slot === hi || l.frame === hi ? 0.9 : 0.08); }

      var rb = g.selectAll('path.ribbon').data(links, function (d) { return d.source + '>' + d.target + '|' + d.slot; });
      rb.enter().append('path').attr('class', 'ribbon').merge(rb)
        .attr('fill', function (d) { return pal(d.slot || 1); })
        .anim()
        .attr('d', ribbon).attr('opacity', op);
      rb.exit().remove();

      var nd = g.selectAll('rect.node').data(nodes, function (d) { return d.id; });
      nd.enter().append('rect').attr('class', 'node').attr('rx', 3).merge(nd)
        .attr('fill', function (d) { return d.stage === 0 ? pal(d.slot || 1) : ink2(); })
        .anim()
        .attr('x', function (d) { return xOf(d.stage); }).attr('y', function (d) { return d.y0; })
        .attr('width', nodeW).attr('height', function (d) { return Math.max(1, d.h); })
        .attr('opacity', function (d) { return !hi ? 1 : (d.stage === 0 ? (d.slot === hi ? 1 : 0.15) : 0.85); });
      nd.exit().remove();

      // First stage labels sit in the left gutter, last stage in the right
      // gutter, and middle stages above their node — never over a ribbon.
      function labAnchor(d) { return d.stage === 0 ? 'end' : d.stage === nStage - 1 ? 'start' : 'middle'; }
      function labX(d) {
        return d.stage === 0 ? -8 : d.stage === nStage - 1 ? xOf(d.stage) + nodeW + 8 : xOf(d.stage) + nodeW / 2;
      }
      function labY(d) { return d.stage === 0 || d.stage === nStage - 1 ? d.y0 + d.h / 2 + 4 : d.y0 - 7; }
      var nl = g.selectAll('text.nodelab').data(nodes.filter(function (d) { return d.h > 13; }), function (d) { return d.id; });
      nl.enter().append('text').attr('class', 'nodelab mark-label').merge(nl)
        .attr('text-anchor', labAnchor)
        .style('font-size', '11px')
        .text(function (d) { return d.label; })
        .anim()
        .attr('x', labX).attr('y', labY)
        .attr('opacity', function (d) { return !hi ? 1 : (d.stage === 0 ? (d.slot === hi ? 1 : 0.2) : 1); });
      nl.exit().remove();

      var sh = layerOf(svg, 'stagehead', pad.l, 0).attr('class', 'stagehead')
        .selectAll('text').data(spec.stages);
      sh.enter().append('text').attr('class', 'axis-title').merge(sh)
        .attr('x', function (d, i) { return i === 0 ? -pad.l + 2 : i === nStage - 1 ? W + pad.r - 2 : xOf(i) + nodeW / 2; })
        .attr('text-anchor', function (d, i) { return i === 0 ? 'start' : i === nStage - 1 ? 'end' : 'middle'; })
        .attr('y', 14).text(function (d) { return d; });
      sh.exit().remove();

      g.selectAll('path.hit').data(links, function (d) { return d.source + '>' + d.target + '|' + d.slot; })
        .join('path').attr('class', 'hit').attr('d', ribbon)
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.label || byId[d.source].label) + '</b>' +
            tipRow(pal(d.slot || 1), byId[d.source].label + ' → ' + byId[d.target].label, d3.format(',')(d.value)),
            d3.pointer(ev, plot)[0], d3.pointer(ev, plot)[1] - 6);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, (spec.legend || []).map(function (l) {
        return { id: l.slot, label: l.label, color: pal(l.slot), off: hi && hi !== l.slot };
      }), { note: spec.legendNote });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 8. slope — two-position slope chart
   * ================================================================ */
  function slope(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'num2');

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.64, 280, 420);
      var pad = { t: 30, r: spec.rightWidth || 150, b: 26, l: spec.leftWidth || 150 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);
      var rows = spec.rows;

      var all = rows.reduce(function (a, d) { return a.concat([d.from, d.to]); }, []);
      var y = d3.scaleLinear().domain(spec.domain || d3.extent(all)).nice().range([H, 0]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 4); });
      g.selectAll('line.rails').data([0, W]).join('line').attr('class', 'rails')
        .attr('x1', function (d) { return d; }).attr('x2', function (d) { return d; })
        .attr('y1', 0).attr('y2', H).attr('stroke', cssVar('--axis')).attr('stroke-width', 1);

      var hi = state.highlight;
      function op(d) { return !hi ? 1 : (d.id === hi ? 1 : 0.18); }

      // End labels are pushed apart so that close-together lines stay readable.
      function spread(key) {
        var items = rows.map(function (d) { return { id: d.id, y: y(d[key]) }; })
                        .sort(function (a, b) { return a.y - b.y; });
        var gapPx = 13;
        for (var i = 1; i < items.length; i++) {
          if (items[i].y - items[i - 1].y < gapPx) items[i].y = items[i - 1].y + gapPx;
        }
        var over = items.length ? items[items.length - 1].y - H : 0;
        if (over > 0) items.forEach(function (it) { it.y -= over; });
        var m = {}; items.forEach(function (it) { m[it.id] = it.y; });
        return m;
      }
      var leftY = spread('from'), rightY = spread('to');

      var ln = g.selectAll('line.slope').data(rows, function (d) { return d.id; });
      ln.enter().append('line').attr('class', 'slope').merge(ln)
        .attr('stroke', function (d) { return pal(d.slot || 1); })
        .attr('stroke-width', 2.5).attr('stroke-linecap', 'round')
        .anim()
        .attr('x1', 0).attr('x2', W)
        .attr('y1', function (d) { return y(d.from); }).attr('y2', function (d) { return y(d.to); })
        .attr('opacity', op);
      ln.exit().remove();

      [['from', 0], ['to', W]].forEach(function (p) {
        var c = g.selectAll('circle.p-' + p[0]).data(rows, function (d) { return d.id; });
        c.enter().append('circle').attr('class', 'p-' + p[0] + ' node-ring').merge(c)
          .attr('fill', function (d) { return pal(d.slot || 1); }).attr('stroke', surface())
          .anim()
          .attr('cx', p[1]).attr('cy', function (d) { return y(d[p[0]]); }).attr('r', 5.5).attr('opacity', op);
        c.exit().remove();
      });

      var ll = g.selectAll('text.l-lab').data(rows, function (d) { return d.id; });
      ll.enter().append('text').attr('class', 'l-lab mark-label').attr('text-anchor', 'end').merge(ll)
        .text(function (d) { return d.label; })
        .anim()
        .attr('x', -10).attr('y', function (d) { return leftY[d.id] + 4; }).attr('opacity', op);
      ll.exit().remove();

      var rl = g.selectAll('text.r-lab').data(rows, function (d) { return d.id; });
      rl.enter().append('text').attr('class', 'r-lab mark-label muted').attr('text-anchor', 'start').merge(rl)
        .text(function (d) { return f(d.to) + (d.toLabel && spec.showEndLabel ? ' · ' + d.toLabel : ''); })
        .anim()
        .attr('x', W + 10).attr('y', function (d) { return rightY[d.id] + 4; }).attr('opacity', op);
      rl.exit().remove();

      axisLeft(layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y'), y, 4, f);
      var hd = layerOf(svg, 'heads', 0, 0).attr('class', 'heads').selectAll('text').data([
        { x: pad.l, a: 'start', t: spec.fromShort || spec.fromLabel || 'Before' },
        { x: pad.l + W, a: 'end', t: spec.toShort || spec.toLabel || 'After' }
      ]);
      hd.enter().append('text').attr('class', 'axis-title').merge(hd)
        .attr('x', function (d) { return d.x; }).attr('y', 16)
        .attr('text-anchor', function (d) { return d.a; }).text(function (d) { return d.t; });
      hd.exit().remove();

      g.selectAll('rect.hit').data(rows, function (d) { return d.id; })
        .join('rect').attr('class', 'hit')
        .attr('x', -pad.l).attr('width', m.w).attr('height', 18)
        .attr('y', function (d) { return (y(d.from) + y(d.to)) / 2 - 9; })
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.label) + '</b>' +
            tipRow(pal(d.slot || 1), d.fromLabel || spec.fromLabel, f(d.from)) +
            tipRow(pal(d.slot || 1), d.toLabel || spec.toLabel, f(d.to)) +
            tipRow(null, 'Shift', (d.to - d.from > 0 ? '+' : '') + f(d.to - d.from)),
            d3.pointer(ev, plot)[0], (y(d.from) + y(d.to)) / 2 + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, rows.length <= 6 ? rows.map(function (d) {
        return { id: d.id, label: d.label, color: pal(d.slot || 1), off: hi && hi !== d.id };
      }) : [], { note: spec.legendNote, line: true });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 9. network — force graph, 3 community hues (all-pairs safe)
   * ================================================================ */
  function network(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var laid = null;

    function layout(W, H) {
      var nodes = spec.nodes.map(function (d) { return Object.assign({}, d); });
      var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
      var links = spec.links.filter(function (l) { return byId[l.source] && byId[l.target]; })
        .map(function (l) { return { source: l.source, target: l.target, value: l.value }; });
      var sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(function (d) { return d.id; }).distance(46).strength(0.28))
        .force('charge', d3.forceManyBody().strength(-120))
        .force('centre', d3.forceCenter(W / 2, H / 2))
        .force('collide', d3.forceCollide().radius(function (d) { return d.size / 2 + 5; }))
        .stop();
      for (var i = 0; i < 320; i++) sim.tick();
      var padX = 24;
      var ex = d3.extent(nodes, function (d) { return d.x; }), ey = d3.extent(nodes, function (d) { return d.y; });
      var sx = d3.scaleLinear().domain(ex).range([padX, W - padX]);
      var sy = d3.scaleLinear().domain(ey).range([padX, H - padX]);
      nodes.forEach(function (n) { n.px = sx(n.x); n.py = sy(n.y); });
      return { nodes: nodes, links: links, byId: byId };
    }

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.78, 320, 500);
      var W = m.w, H = m.h;
      var svg = svgOf(plot, W, H);
      var g = layerOf(svg, 'main', 0, 0);
      if (!laid || laid.W !== W) { laid = layout(W, H); laid.W = W; }

      var commOf = {}; (spec.communities || []).forEach(function (c) { commOf[c.id] = c; });
      var hi = state.highlight;   // community id
      var hn = state.highlightNode;
      function nodeCol(d) { return d.type === 'outlet' ? ink() : pal((commOf[d.comm] || {}).slot || 1); }
      function op(d) {
        if (hn) return (d.id === hn) ? 1 : 0.14;
        if (hi) return d.comm === hi ? 1 : 0.12;
        return 1;
      }

      var lk = g.selectAll('line.link').data(laid.links, function (d) { return d.source.id + '>' + d.target.id; });
      lk.enter().append('line').attr('class', 'link').merge(lk)
        .attr('x1', function (d) { return d.source.px; }).attr('y1', function (d) { return d.source.py; })
        .attr('x2', function (d) { return d.target.px; }).attr('y2', function (d) { return d.target.py; })
        .attr('stroke-width', function (d) { return Math.min(3, 0.6 + d.value * 0.22); })
        .anim()
        .attr('stroke-opacity', function (d) {
          if (hn) return (d.source.id === hn || d.target.id === hn) ? 0.6 : 0.04;
          if (hi) return (d.source.comm === hi && d.target.comm === hi) ? 0.5 : 0.04;
          return 0.28;
        });
      lk.exit().remove();

      var nd = g.selectAll('circle.node').data(laid.nodes, function (d) { return d.id; });
      nd.enter().append('circle').attr('class', 'node node-ring').merge(nd)
        .attr('cx', function (d) { return d.px; }).attr('cy', function (d) { return d.py; })
        .attr('stroke', surface())
        .attr('fill', nodeCol)
        .anim()
        .attr('r', function (d) { return d.size / 2; })
        .attr('opacity', op);
      nd.exit().remove();

      var outlets = laid.nodes.filter(function (d) { return d.type === 'outlet'; });
      var ol = g.selectAll('text.olab').data(outlets, function (d) { return d.id; });
      ol.enter().append('text').attr('class', 'olab mark-label').attr('text-anchor', 'middle')
        .style('font-size', '10.5px').merge(ol)
        .attr('x', function (d) { return d.px; }).attr('y', function (d) { return d.py - d.size / 2 - 5; })
        .text(function (d) { return d.label; })
        .anim().attr('opacity', op);
      ol.exit().remove();

      g.selectAll('circle.hit').data(laid.nodes, function (d) { return d.id; })
        .join('circle').attr('class', 'hit')
        .attr('cx', function (d) { return d.px; }).attr('cy', function (d) { return d.py; })
        .attr('r', function (d) { return Math.max(13, d.size / 2 + 4); })
        .on('mousemove', function (ev, d) {
          var c = commOf[d.comm] || {};
          tip.show('<b>' + esc(d.label) + '</b>' +
            tipRow(nodeCol(d), d.type === 'outlet' ? 'News outlet' : 'Account', '') +
            tipRow(null, 'Cluster', c.label || '—') +
            (d.followers ? tipRow(null, 'Followers', d3.format('.2s')(d.followers)) : '') +
            (d.reshares ? tipRow(null, 'Shares of news', d3.format(',')(d.reshares)) : ''),
            d.px, d.py);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, (spec.communities || []).map(function (c) {
        return { id: c.id, label: c.label, color: pal(c.slot), off: hi && hi !== c.id };
      }).concat([{ id: 'outlet', label: 'News outlet', color: ink() }]),
        { note: 'Circle area = volume of news sharing' });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { laid = null; instant = true; draw(); } };
  }

  /* ================================================================
   * 10. scatter — association, with a fitted trend
   * ================================================================ */
  function scatter(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;

    function fit(pts, xa, ya) {
      var n = pts.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
      pts.forEach(function (p) { var X = xa(p), Y = ya(p); sx += X; sy += Y; sxx += X * X; sxy += X * Y; });
      var b = (n * sxy - sx * sy) / (n * sxx - sx * sx);
      var a = (sy - b * sx) / n;
      return { a: a, b: b };
    }

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.62, 290, 430);
      var pad = { t: 16, r: 16, b: 46, l: 52 };
      var W = m.w - pad.l - pad.r, H = m.h - pad.t - pad.b;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var pts = spec.points;
      var groups = spec.groups || [];
      var active = state.groups || groups.map(function (gr) { return gr.id; });

      var x = d3.scaleLinear().domain(d3.extent(pts, function (d) { return d.x; })).nice().range([0, W]);
      var y = spec.logY
        ? d3.scaleLog().domain([Math.max(0.5, d3.min(pts, function (d) { return d.y; })), d3.max(pts, function (d) { return d.y; })]).nice().range([H, 0])
        : d3.scaleLinear().domain(d3.extent(pts, function (d) { return d.y; })).nice().range([H, 0]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 4); });

      var hi = state.highlight;
      function grOf(d) { return groups.filter(function (gr) { return gr.id === d.group; })[0] || groups[0] || { slot: 1 }; }
      function op(d) {
        if (active.indexOf(d.group) < 0) return 0.04;
        if (hi) return d.group === hi ? 0.85 : 0.08;
        return 0.62;
      }

      var c = g.selectAll('circle.pt').data(pts, function (d) { return d.id; });
      c.enter().append('circle').attr('class', 'pt').attr('r', 0).merge(c)
        .attr('fill', function (d) { return pal(grOf(d).slot); })
        .attr('cx', function (d) { return x(d.x); }).attr('cy', function (d) { return y(d.y); })
        .anim().attr('r', 4.5).attr('opacity', op);
      c.exit().remove();

      // trend on the currently visible subset
      var sub = pts.filter(function (d) { return active.indexOf(d.group) >= 0 && (!hi || d.group === hi); });
      var ya = spec.logY ? function (p) { return Math.log(p.y); } : function (p) { return p.y; };
      var ln = fit(sub, function (p) { return p.x; }, ya);
      var xs = x.domain();
      var tl = g.selectAll('path.trend').data(state.trend === false ? [] : [0]);
      tl.enter().append('path').attr('class', 'trend').merge(tl)
        .attr('stroke', ink())
        .anim()
        .attr('d', 'M' + x(xs[0]) + ',' + y(spec.logY ? Math.exp(ln.a + ln.b * xs[0]) : ln.a + ln.b * xs[0]) +
                   'L' + x(xs[1]) + ',' + y(spec.logY ? Math.exp(ln.a + ln.b * xs[1]) : ln.a + ln.b * xs[1]));
      tl.exit().remove();

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H).attr('class', 'axis ax-x'), x, 5, fmt(spec.xFormat || 'num1'));
      var yAxis = layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y');
      if (spec.logY) {
        var lo = y.domain()[0], hiY = y.domain()[1];
        var tv = [1, 3, 10, 30, 100, 300, 1000].filter(function (v) { return v >= lo && v <= hiY; });
        yAxis.call(d3.axisLeft(y).tickValues(tv).tickFormat(d3.format(',')).tickSize(0).tickPadding(8));
        yAxis.select('.domain').remove();
        yAxis.selectAll('text').attr('fill', cssVar('--axis-ink'));
      } else {
        axisLeft(yAxis, y, 4, fmt(spec.yFormat || 'num0'));
      }
      var t = layerOf(svg, 'axt', 0, 0).attr('class', 'axt');
      t.selectAll('text.x').data([0]).join('text').attr('class', 'axis-title x')
        .attr('x', pad.l).attr('y', m.h - 8).text(spec.xLabel || '');
      t.selectAll('text.y').data([0]).join('text').attr('class', 'axis-title y')
        .attr('transform', 'translate(13,' + (pad.t + H) + ') rotate(-90)').text(spec.yLabel || '');

      // nearest-point hover (dense scatter)
      var hg = layerOf(svg, 'hover', pad.l, pad.t).attr('class', 'hover');
      hg.selectAll('rect').data([0]).join('rect').attr('class', 'hit')
        .attr('width', W).attr('height', H)
        .on('mousemove', function (ev) {
          var p = d3.pointer(ev, this);
          var best = null, bd = 1e9;
          pts.forEach(function (d) {
            if (active.indexOf(d.group) < 0) return;
            var dx = x(d.x) - p[0], dy = y(d.y) - p[1], dist = dx * dx + dy * dy;
            if (dist < bd) { bd = dist; best = d; }
          });
          if (!best || bd > 2600) { tip.hide(); return; }
          tip.show('<b>' + esc(spec.pointName || 'Post') + '</b>' +
            tipRow(pal(grOf(best).slot), grOf(best).label, '') +
            tipRow(null, spec.xLabel, fmt(spec.xFormat || 'num1')(best.x)) +
            tipRow(null, spec.yLabel, fmt(spec.yFormat || 'num0')(best.y)),
            x(best.x) + pad.l, y(best.y) + pad.t);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, groups.map(function (gr) {
        return { id: gr.id, label: gr.label, color: pal(gr.slot), off: active.indexOf(gr.id) < 0 };
      }).concat([{ id: 'trend', label: spec.trendLabel || 'Fitted trend', color: ink() }]),
        { note: spec.legendNote });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 11. diverging — stacked bars pivoted on a neutral centre
   * ================================================================ */
  function diverging(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'pct0');

    function draw() {
      NOW = instant; instant = false;
      var rows = spec.rows;
      var cats = spec.categories;
      var ni = spec.centreIndex != null ? spec.centreIndex : spec.negativeIndex;
      var rowH = spec.rowHeight || 40;
      var pad = { t: 10, r: 16, b: 30, l: spec.labelWidth || 178 };
      var m = { w: Math.max(260, plot.clientWidth || 640), h: rows.length * rowH + pad.t + pad.b };
      var W = m.w - pad.l - pad.r, H = rows.length * rowH;
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      // centre of the neutral band sits on zero
      var offs = rows.map(function (r) {
        var neg = d3.sum(r.values.slice(0, ni));
        return neg + r.values[ni] / 2;
      });
      var maxL = d3.max(offs), maxR = d3.max(rows.map(function (r, i) { return d3.sum(r.values) - offs[i]; }));
      var ext = Math.max(maxL, maxR) * 1.04;
      var x = d3.scaleLinear().domain([-ext, ext]).range([0, W]);
      var y = d3.scaleBand().domain(rows.map(function (d) { return d.id; })).range([0, H]).paddingInner(0.32);

      // diverging ramp: cool → neutral → warm across the ordered categories
      var cols = cats.map(function (c, i) {
        if (i === ni) return cssVar('--div-mid');
        var t = i < ni ? (ni - i) / ni : (i - ni) / (cats.length - 1 - ni);
        return d3.interpolateRgb(cssVar('--div-mid'), i < ni ? cssVar('--div-neg') : cssVar('--div-pos'))(0.35 + 0.65 * t);
      });

      var segs = [];
      rows.forEach(function (r, ri) {
        var acc = -offs[ri];
        r.values.forEach(function (v, ci) {
          segs.push({ key: r.id + '|' + ci, row: r.id, ri: ri, ci: ci, x0: acc, x1: acc + v, v: v });
          acc += v;
        });
      });

      var hi = state.highlight, hcat = state.category;
      function op(s) {
        if (hi && s.row !== hi) return 0.14;
        if (hcat != null && s.ci !== hcat) return 0.2;
        return 1;
      }

      var sg = g.selectAll('rect.seg').data(segs, function (d) { return d.key; });
      sg.enter().append('rect').attr('class', 'seg').merge(sg)
        .attr('fill', function (d) { return cols[d.ci]; })
        .anim()
        .attr('x', function (d) { return x(d.x0) + 1; })
        .attr('width', function (d) { return Math.max(0, x(d.x1) - x(d.x0) - 2); })
        .attr('y', function (d) { return y(d.row); })
        .attr('height', y.bandwidth())
        .attr('opacity', op);
      sg.exit().remove();

      layerOf(svg, 'zero', pad.l, pad.t).attr('class', 'zero')
        .selectAll('line').data([0]).join('line').attr('class', 'zero-line')
        .attr('x1', x(0)).attr('x2', x(0)).attr('y1', -4).attr('y2', H + 4);

      var lab = g.selectAll('text.rowlab').data(rows, function (d) { return d.id; });
      lab.enter().append('text').attr('class', 'rowlab').attr('text-anchor', 'end')
        .attr('fill', ink2()).style('font-size', '12px').merge(lab)
        .attr('x', -12).attr('y', function (d) { return y(d.id) + y.bandwidth() / 2 + 4; })
        .text(function (d) { return d.label; })
        .attr('opacity', function (d) { return !hi || d.id === hi ? 1 : 0.4; });
      lab.exit().remove();

      axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H + 6).attr('class', 'axis ax-x'), x, 5,
        function (v) { return f(Math.abs(v)); });

      g.selectAll('rect.hit').data(rows, function (d) { return d.id; })
        .join('rect').attr('class', 'hit')
        .attr('x', -pad.l).attr('width', m.w).attr('y', function (d) { return y(d.id); }).attr('height', y.step())
        .on('mousemove', function (ev, d) {
          var i = rows.indexOf(d);
          tip.show('<b>' + esc(d.label) + '</b>' +
            cats.map(function (c, ci) { return tipRow(cols[ci], c, f(d.values[ci])); }).join('') +
            (spec.n ? '<span class="hint">' + d3.format(',')(spec.n[i]) + ' replies coded</span>' : ''),
            d3.pointer(ev, plot)[0], y(d.id) + pad.t + y.bandwidth() / 2);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, cats.map(function (c, i) {
        return { id: i, label: c, color: cols[i], off: hcat != null && hcat !== i };
      }), { note: spec.legendNote || 'Bars are centred on the neutral category' });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 12. timeline — lines + uncertainty band + events, with an optional
   *     second PANEL (never a second axis) for coverage volume
   * ================================================================ */
  function timeline(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;
    var f = fmt(spec.format || 'num1');

    function draw() {
      NOW = instant; instant = false;
      var showVol = spec.volume && state.showVolume !== false;
      var m = measure(plot, showVol ? 0.68 : 0.54, showVol ? 320 : 250, 460);
      // A right-hand gutter for the end labels, so they sit beside the lines
      // rather than on top of them.
      var wideEnough = (plot.clientWidth || 640) > 460;
      var pad = { t: 38, r: wideEnough ? 116 : 16, b: 26, l: 44 };
      var gapP = 16;
      var volH = showVol ? Math.round((m.h - pad.t - pad.b) * 0.24) : 0;
      var W = m.w - pad.l - pad.r;
      var H = m.h - pad.t - pad.b - (showVol ? volH + gapP : 0);
      var svg = svgOf(plot, m.w, m.h);
      var g = layerOf(svg, 'main', pad.l, pad.t);

      var xs = spec.x || spec.days.map(function (d) { return d.i; });
      var x = d3.scaleLinear().domain([xs[0], xs[xs.length - 1]]).range([0, W]);
      var allV = spec.series.reduce(function (a, s) { return a.concat(s.lo || s.values, s.hi || s.values); }, []);
      var y = d3.scaleLinear().domain(spec.domain || d3.extent(allV)).nice().range([H, 0]);

      layerOf(svg, 'grid', pad.l, pad.t).attr('class', 'grid').call(function (gg) { hGrid(gg, y, W, 5); });

      var hi = state.highlight;
      var off = state.off || [];
      function vis(s) { return off.indexOf(s.id) < 0; }
      function op(s) { if (!vis(s)) return 0; return !hi ? 1 : (s.id === hi ? 1 : 0.18); }

      // uncertainty bands, drawn first
      if (spec.series[0] && spec.series[0].lo && state.showBand !== false) {
        var area = d3.area().x(function (d, i) { return x(xs[i]); })
          .y0(function (d, i) { return y(d.lo); }).y1(function (d, i) { return y(d.hi); })
          .curve(d3.curveMonotoneX);
        var bd = g.selectAll('path.band').data(spec.series, function (s) { return s.id; });
        bd.enter().append('path').attr('class', 'band').merge(bd)
          .attr('fill', function (s) { return pal(s.slot); })
          .anim()
          .attr('d', function (s) { return area(s.values.map(function (v, i) { return { lo: s.lo[i], hi: s.hi[i] }; })); })
          .attr('opacity', function (s) { return op(s) * 0.14; });
        bd.exit().remove();
      } else { g.selectAll('path.band').remove(); }

      var line = d3.line().x(function (d, i) { return x(xs[i]); }).y(function (d) { return y(d); }).curve(d3.curveMonotoneX);
      var ln = g.selectAll('path.series-line').data(spec.series, function (s) { return s.id; });
      ln.enter().append('path').attr('class', 'series-line').merge(ln)
        .attr('stroke', function (s) { return pal(s.slot); })
        .anim()
        .attr('d', function (s) { return line(s.values); })
        .attr('opacity', op);
      ln.exit().remove();

      // Endpoint direct labels, pushed apart vertically so close-finishing
      // series stay legible.
      var shownSeries = spec.series.filter(vis);
      var endY = (function () {
        var items = shownSeries.map(function (sr) { return { id: sr.id, y: y(sr.values[sr.values.length - 1]) }; })
                               .sort(function (a, b) { return a.y - b.y; });
        for (var i = 1; i < items.length; i++) {
          if (items[i].y - items[i - 1].y < 14) items[i].y = items[i - 1].y + 14;
        }
        var over = items.length ? items[items.length - 1].y - H : 0;
        if (over > 0) items.forEach(function (it) { it.y -= over; });
        var mp = {}; items.forEach(function (it) { mp[it.id] = it.y; });
        return mp;
      }());
      var el = g.selectAll('text.endlab').data(wideEnough ? shownSeries : [], function (s) { return s.id; });
      el.enter().append('text').attr('class', 'endlab mark-label').merge(el)
        .attr('text-anchor', 'start')
        .style('font-size', '11px')
        .text(function (s) { return s.label; })
        .anim()
        .attr('x', W + 8).attr('y', function (s) { return endY[s.id] + 4; })
        .attr('opacity', function (s) { return op(s); });
      el.exit().remove();

      // event annotations
      var evs = spec.events || [];
      var eg = layerOf(svg, 'evs', pad.l, pad.t).attr('class', 'evs');
      var ee = eg.selectAll('g.e').data(state.events === false ? [] : evs, function (d) { return d.label; });
      var en = ee.enter().append('g').attr('class', 'e');
      en.append('line').attr('class', 'annot-line');
      en.append('text').attr('class', 'annot');
      var em = en.merge(ee).attr('transform', function (d) { return 'translate(' + x(d.i) + ',0)'; });
      em.select('line').attr('y1', -6).attr('y2', H)
        .attr('stroke', function (d) { return state.marker === d.i ? cssVar('--accent') : cssVar('--axis'); })
        .attr('stroke-width', function (d) { return state.marker === d.i ? 1.8 : 1; });
      em.select('text').attr('y', function (d, i) { return i % 2 ? -8 : -22; })
        .attr('text-anchor', function (d) { return x(d.i) > W * 0.72 ? 'end' : 'start'; })
        .attr('x', function (d) { return x(d.i) > W * 0.72 ? -4 : 4; })
        .attr('fill', function (d) { return state.marker === d.i ? cssVar('--accent') : muted(); })
        // Below about 380px the captions collide; the rules stay, the words go.
        .attr('opacity', W < 380 ? 0 : 1)
        .text(function (d) { return d.label; });
      ee.exit().remove();

      if (spec.zeroLine) {
        layerOf(svg, 'zl', pad.l, pad.t).attr('class', 'zl')
          .selectAll('line').data([0]).join('line').attr('class', 'zero-line')
          .attr('x1', 0).attr('x2', W).attr('y1', y(0)).attr('y2', y(0));
      }

      axisLeft(layerOf(svg, 'ax-y', pad.l, pad.t).attr('class', 'axis ax-y'), y, 5, f);

      // ---- second panel: coverage volume (own scale, own panel) ----
      if (showVol) {
        var vy = d3.scaleLinear().domain([0, d3.max(spec.volume)]).nice().range([volH, 0]);
        var vg = layerOf(svg, 'vol', pad.l, pad.t + H + gapP).attr('class', 'vol');
        var varea = d3.area().x(function (d, i) { return x(xs[i]); }).y0(volH).y1(function (d) { return vy(d); }).curve(d3.curveMonotoneX);
        vg.selectAll('path.varea').data([spec.volume]).join('path').attr('class', 'varea')
          .attr('fill', ink2()).attr('opacity', 0.16)
          .anim().attr('d', varea);
        vg.selectAll('path.vline').data([spec.volume]).join('path').attr('class', 'vline series-line')
          .attr('stroke', ink2()).attr('stroke-width', 1.5)
          .anim()
          .attr('d', d3.line().x(function (d, i) { return x(xs[i]); }).y(function (d) { return vy(d); }).curve(d3.curveMonotoneX));
        vg.selectAll('text.vt').data([0]).join('text').attr('class', 'vt axis-title')
          .attr('x', 0).attr('y', -4).text(spec.volumeLabel || 'Articles per day');
        axisLeft(layerOf(svg, 'ax-v', pad.l, pad.t + H + gapP).attr('class', 'axis ax-v'), vy, 2, d3.format(',.0f'));
        axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H + gapP + volH).attr('class', 'axis ax-x'), x, Math.max(3, Math.min(7, Math.floor(W / 95))),
          spec.days ? function (i) { return spec.days[Math.round(i)] ? spec.days[Math.round(i)].label : ''; } : function (v) { return (v > 0 ? '+' : '') + v; });
      } else {
        svg.select('g.vol').remove(); svg.select('g.ax-v').remove();
        axisBottom(layerOf(svg, 'ax-x', pad.l, pad.t + H).attr('class', 'axis ax-x'), x, Math.max(3, Math.min(7, Math.floor(W / 95))),
          spec.days ? function (i) { return spec.days[Math.round(i)] ? spec.days[Math.round(i)].label : ''; } : function (v) { return (v > 0 ? '+' : '') + v; });
      }

      // crosshair readout
      var hg = layerOf(svg, 'hover', pad.l, pad.t).attr('class', 'hover');
      hg.selectAll('*').remove();
      var cross = hg.append('line').attr('y1', 0).attr('y2', H).attr('stroke', ink()).attr('stroke-width', 1).attr('opacity', 0);
      hg.append('rect').attr('class', 'hit').attr('width', W).attr('height', H + (showVol ? gapP + volH : 0))
        .on('mousemove', function (ev) {
          var xv = x.invert(d3.pointer(ev, this)[0]);
          var i = Math.max(0, Math.min(xs.length - 1, Math.round(xv - xs[0])));
          cross.attr('x1', x(xs[i])).attr('x2', x(xs[i])).attr('opacity', .45);
          var lbl = spec.days ? spec.days[i].label : (xs[i] > 0 ? '+' : '') + xs[i] + ' days';
          tip.show('<b>' + lbl + '</b>' +
            spec.series.filter(vis).map(function (s) { return tipRow(pal(s.slot), s.label, f(s.values[i])); }).join('') +
            (showVol ? tipRow(ink2(), spec.volumeLabel || 'Articles', d3.format(',')(spec.volume[i])) : ''),
            x(xs[i]) + pad.l, pad.t + 8);
        })
        .on('mouseleave', function () { cross.attr('opacity', 0); tip.hide(); });

      drawLegend(ctx.legend, spec.series.map(function (s) {
        return { id: s.id, label: s.label, color: pal(s.slot), off: !vis(s) || (hi && hi !== s.id) };
      }), {
        line: true,
        note: spec.legendNote || (spec.series[0] && spec.series[0].lo ? 'Shaded band = 95% interval' : null),
        onToggle: function (it) {
          var o = (state.off || []).slice();
          var i = o.indexOf(it.id);
          if (i >= 0) o.splice(i, 1); else if (o.length < spec.series.length - 1) o.push(it.id);
          state.off = o; draw();
        }
      });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 13. radar — multi-dimensional profile, 2-3 series only
   * ================================================================ */
  function radar(ctx) {
    var spec = ctx.spec, plot = ctx.plot, tip = ctx.tip;
    var state = {};
    var instant = true;

    function draw() {
      NOW = instant; instant = false;
      var m = measure(plot, 0.82, 300, 440);
      var svg = svgOf(plot, m.w, m.h);
      var cx = m.w / 2, cy = m.h / 2 + 4;
      var R = Math.min(m.w, m.h) / 2 - 62;
      var g = layerOf(svg, 'main', cx, cy);
      var axes = spec.axes, n = axes.length;
      var ang = function (i) { return -Math.PI / 2 + i * 2 * Math.PI / n; };
      var rs = d3.scaleLinear().domain(spec.domain || [0, 1]).range([0, R]);

      var rings = [0.25, 0.5, 0.75, 1];
      g.selectAll('circle.ring').data(rings).join('circle').attr('class', 'ring')
        .attr('r', function (d) { return R * d; }).attr('fill', 'none')
        .attr('stroke', gridCol()).attr('stroke-width', 1);
      g.selectAll('line.spoke').data(axes).join('line').attr('class', 'spoke')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', function (d, i) { return Math.cos(ang(i)) * R; })
        .attr('y2', function (d, i) { return Math.sin(ang(i)) * R; })
        .attr('stroke', gridCol()).attr('stroke-width', 1);
      g.selectAll('text.axlab').data(axes).join('text').attr('class', 'axlab')
        .attr('x', function (d, i) { return Math.cos(ang(i)) * (R + 14); })
        .attr('y', function (d, i) { return Math.sin(ang(i)) * (R + 14) + 4; })
        .attr('text-anchor', function (d, i) {
          var c = Math.cos(ang(i));
          return c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle';
        })
        .attr('fill', muted()).style('font-size', '10.5px')
        .each(function (d) {
          var words = String(d).split(' ');
          var el = d3.select(this); el.text(null);
          if (words.length > 1 && String(d).length > 12) {
            el.append('tspan').attr('x', el.attr('x')).text(words.slice(0, Math.ceil(words.length / 2)).join(' '));
            el.append('tspan').attr('x', el.attr('x')).attr('dy', '1.1em').text(words.slice(Math.ceil(words.length / 2)).join(' '));
          } else { el.text(d); }
        });

      var hi = state.highlight;
      function pathOf(s) {
        return s.values.map(function (v, i) {
          return (i ? 'L' : 'M') + (Math.cos(ang(i)) * rs(v)) + ',' + (Math.sin(ang(i)) * rs(v));
        }).join('') + 'Z';
      }
      function op(s) { return !hi ? 1 : (s.id === hi ? 1 : 0.15); }

      var p = g.selectAll('path.prof').data(spec.series, function (s) { return s.id; });
      p.enter().append('path').attr('class', 'prof').merge(p)
        .attr('stroke', function (s) { return pal(s.slot); }).attr('stroke-width', 2.5)
        .attr('fill', function (s) { return pal(s.slot); })
        .anim()
        .attr('d', pathOf).attr('fill-opacity', function (s) { return op(s) * 0.12; })
        .attr('stroke-opacity', op);
      p.exit().remove();

      var dots = [];
      spec.series.forEach(function (s) { s.values.forEach(function (v, i) { dots.push({ s: s, i: i, v: v }); }); });
      var dt = g.selectAll('circle.dot').data(dots, function (d) { return d.s.id + d.i; });
      dt.enter().append('circle').attr('class', 'dot node-ring').merge(dt)
        .attr('fill', function (d) { return pal(d.s.slot); }).attr('stroke', surface())
        .anim()
        .attr('cx', function (d) { return Math.cos(ang(d.i)) * rs(d.v); })
        .attr('cy', function (d) { return Math.sin(ang(d.i)) * rs(d.v); })
        .attr('r', 4).attr('opacity', op);
      dt.exit().remove();

      g.selectAll('circle.hit').data(axes.map(function (a, i) { return { a: a, i: i }; }))
        .join('circle').attr('class', 'hit')
        .attr('cx', function (d) { return Math.cos(ang(d.i)) * R * 0.75; })
        .attr('cy', function (d) { return Math.sin(ang(d.i)) * R * 0.75; })
        .attr('r', Math.max(16, R * 0.28))
        .on('mousemove', function (ev, d) {
          tip.show('<b>' + esc(d.a) + '</b>' + spec.series.map(function (s) {
            return tipRow(pal(s.slot), s.label, d3.format('.2f')(s.values[d.i]));
          }).join(''), cx + Math.cos(ang(d.i)) * R * 0.75, cy + Math.sin(ang(d.i)) * R * 0.75);
        })
        .on('mouseleave', function () { tip.hide(); });

      drawLegend(ctx.legend, spec.series.map(function (s) {
        return { id: s.id, label: s.label, color: pal(s.slot), off: hi && hi !== s.id };
      }), { note: spec.legendNote || 'Each axis is scaled 0–1 within this study' });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 14. headlines — annotated close reading (HTML)
   * ================================================================ */
  function headlines(ctx) {
    var spec = ctx.spec, plot = ctx.plot;
    var state = { setId: spec.sets[0].id };
    var instant = true;
    var E = SITE.entities;

    function markup(h) {
      var text = h.text, out = esc(text);
      (h.spans || []).forEach(function (sp) {
        var safe = esc(sp.t);
        out = out.replace(safe, '<span class="span" data-dim="' + sp.dim + '" title="' + esc(sp.note) + '">' + safe + '</span>');
      });
      return out;
    }

    function draw() {
      NOW = instant; instant = false;
      var set = spec.sets.filter(function (s) { return s.id === state.setId; })[0] || spec.sets[0];
      var focus = state.focus;     // source id
      var dim = state.dim;         // bias dimension id to isolate
      var showNotes = state.showNotes !== false;

      var html = '<div class="hl-facts"><span class="tag">What happened</span>' + esc(set.facts) + '</div><div class="hl-list">';
      set.headlines.forEach(function (h) {
        var src = E.sourceById[h.source] || { name: h.source, kind: '', slot: 1 };
        var spans = h.spans || [];
        var relevant = !dim || spans.some(function (s) { return s.dim === dim; });
        var isFocus = focus === h.source;
        var cls = 'hl-row' + (isFocus ? ' is-focus' : '') + ((focus && !isFocus) || !relevant ? ' is-dim' : '');
        html += '<div class="' + cls + '" data-src="' + h.source + '">' +
          '<div class="hl-src"><span class="swatch" style="background:' + pal(src.slot) + '"></span>' +
          '<span>' + esc(src.name) + '<span class="kind">' + esc(src.kind) + '</span></span></div>' +
          '<div class="hl-text">' + markup(h) + '</div>';
        if (showNotes && spans.length && (isFocus || (dim && relevant))) {
          spans.filter(function (s) { return !dim || s.dim === dim; }).forEach(function (s) {
            html += '<div class="hl-note"><b>“' + esc(s.t) + '”</b> — ' + esc(s.note) + '</div>';
          });
        }
        if (!spans.length) html += '<div class="hl-note hl-clean">No bias-carrying spans coded in this headline.</div>';
        html += '</div>';
      });
      html += '</div>';
      plot.innerHTML = html;

      // hovering a headline row promotes it
      plot.querySelectorAll('.hl-row').forEach(function (row) {
        row.addEventListener('mouseenter', function () {
          if (state.lock) return;
          plot.querySelectorAll('.hl-row').forEach(function (r) { r.classList.toggle('is-dim', r !== row); });
        });
        row.addEventListener('mouseleave', function () {
          if (state.lock) return;
          draw();
        });
      });

      drawLegend(ctx.legend, [], {
        note: 'Underlined spans are coded bias markers — hover for the reason.' +
              (dim ? '  ·  Showing ' + (SITE.entities.biasDims.filter(function (d) { return d.id === dim; })[0] || {}).name + ' only' : '')
      });
    }

    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 15. imagegrid — coded press photographs, drawn as abstract glyphs
   * ================================================================ */
  function imagegrid(ctx) {
    var spec = ctx.spec, plot = ctx.plot;
    var state = {};
    var instant = true;
    var E = SITE.entities;

    // An abstract stand-in for a press photo, drawn from its codes, so the
    // coding scheme is visible without publishing anyone's likeness.
    function glyph(d) {
      var headY = d.angle === 'Low (looking up)' ? 62 : d.angle === 'High (looking down)' ? 38 : 50;
      var headR = d.shot === 'Close-up' ? 26 : d.shot === 'Medium' ? 18 : 12;
      var horizon = d.angle === 'Low (looking up)' ? 86 : d.angle === 'High (looking down)' ? 54 : 70;
      var mouth = d.expr === 'Positive' ? 'M' + (50 - headR * 0.32) + ',' + (headY + headR * 0.28) + 'q' + (headR * 0.32) + ',' + (headR * 0.3) + ' ' + (headR * 0.64) + ',0'
                : d.expr === 'Negative' ? 'M' + (50 - headR * 0.32) + ',' + (headY + headR * 0.42) + 'q' + (headR * 0.32) + ',' + (-headR * 0.3) + ' ' + (headR * 0.64) + ',0'
                : 'M' + (50 - headR * 0.3) + ',' + (headY + headR * 0.34) + 'h' + (headR * 0.6);
      var c = d.expr === 'Positive' ? pal(3) : d.expr === 'Negative' ? pal(8) : muted();
      return '<svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<rect width="100" height="100" fill="var(--surface-2)"/>' +
        '<line x1="0" y1="' + horizon + '" x2="100" y2="' + horizon + '" stroke="var(--rule-strong)" stroke-width="1"/>' +
        (d.set === 'Crowd' ? '<g fill="var(--rule-strong)">' + [14, 30, 70, 86].map(function (x) { return '<circle cx="' + x + '" cy="' + (horizon + 6) + '" r="6"/>'; }).join('') + '</g>' : '') +
        (d.set === 'Podium' ? '<rect x="34" y="' + (headY + headR + 6) + '" width="32" height="' + Math.max(4, 96 - headY - headR) + '" fill="var(--rule-strong)"/>' : '') +
        '<circle cx="50" cy="' + headY + '" r="' + headR + '" fill="none" stroke="' + c + '" stroke-width="2.5"/>' +
        '<circle cx="' + (50 - headR * 0.35) + '" cy="' + (headY - headR * 0.18) + '" r="1.8" fill="' + c + '"/>' +
        '<circle cx="' + (50 + headR * 0.35) + '" cy="' + (headY - headR * 0.18) + '" r="1.8" fill="' + c + '"/>' +
        '<path d="' + mouth + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';
    }

    var MAX_TILES = 24;

    function draw() {
      NOW = instant; instant = false;
      var imgs = spec.images;
      var fs = state.source, fa = state.actor, code = state.code || 'angle';
      var pool = imgs.filter(function (d) { return (!fs || d.source === fs) && (!fa || d.actor === fa); });
      // A sticky figure has to fit on screen: show an even sample, say so.
      var shown = pool;
      if (pool.length > MAX_TILES) {
        var k = pool.length / MAX_TILES;
        shown = [];
        for (var i = 0; i < MAX_TILES; i++) shown.push(pool[Math.floor(i * k)]);
      }
      var html = '<div class="img-grid">';
      shown.forEach(function (d) {
        var val = { angle: d.angle, shot: d.shot, expr: d.expr, set: d.set }[code];
        html += '<div class="img-tile" data-id="' + d.id + '" tabindex="0" ' +
          'title="' + esc((E.sourceById[d.source] || {}).name + ' · ' + d.actorLabel + ' · ' + d.angle + ' · ' + d.shot + ' · ' + d.expr + ' · ' + d.set) + '">' +
          glyph(d) + '<div class="meta"><b>' + esc((E.sourceById[d.source] || {}).short) + '</b>' + esc(val) + '</div></div>';
      });
      html += '</div>';
      plot.innerHTML = html;

      var levels = { angle: ['Low (looking up)', 'Eye level', 'High (looking down)'],
                     shot: ['Close-up', 'Medium', 'Wide'],
                     expr: ['Positive', 'Neutral', 'Negative'],
                     set: ['Podium', 'Crowd', 'Candid', 'Institutional'] }[code];
      // Percentages are computed over every matching image, not just the
      // tiles on screen, so the sampling never changes the numbers.
      var counts = levels.map(function (L) {
        return pool.filter(function (d) { return ({ angle: d.angle, shot: d.shot, expr: d.expr, set: d.set }[code] === L); }).length;
      });
      var tot = d3.sum(counts) || 1;
      drawLegend(ctx.legend, [], {
        note: levels.map(function (L, i) { return L + ' ' + Math.round(counts[i] / tot * 100) + '%'; }).join('  ·  ') +
              '  —  ' + (shown.length < pool.length ? shown.length + ' of ' + pool.length + ' images shown' : pool.length + ' images')
      });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * 16. models — AI assistant answers with inline coding (HTML)
   * ================================================================ */
  function models(ctx) {
    var spec = ctx.spec, plot = ctx.plot;
    var state = { qId: spec.questions[0].id };
    var instant = true;
    var E = SITE.entities;
    var HEDGE = /\b(may|might|could|likely|generally|appears?|seems?|suggests?|depends?|uncertain|disagree|unclear|would|expected|widely|some|often)\b/gi;
    var LEAN = /\b(clearly|obviously|winning|expected to|widely expected|hardest|best|worst|leads?|momentum|real|actually|nobody)\b/gi;

    function code(t, on) {
      var out = esc(t);
      if (!on) return out;
      out = out.replace(LEAN, function (mm) { return '<span class="lean">' + mm + '</span>'; });
      out = out.replace(HEDGE, function (mm) { return '<span class="hedge">' + mm + '</span>'; });
      return out;
    }

    function draw() {
      NOW = instant; instant = false;
      var q = spec.questions.filter(function (x) { return x.id === state.qId; })[0] || spec.questions[0];
      var focus = state.focus;
      var on = state.coding !== false;
      var html = '<div class="model-q">“' + esc(q.question) + '”</div>' +
        '<p class="tiny">' + esc(q.context) + '</p><div class="model-cards">';
      q.answers.forEach(function (a) {
        var mdl = E.assistants.filter(function (x) { return x.id === a.model; })[0];
        var cls = 'model-card' + (focus === a.model ? ' is-focus' : focus ? ' is-dim' : '');
        html += '<div class="' + cls + '" data-model="' + a.model + '">' +
          '<div class="who"><span class="swatch" style="background:' + pal(mdl.slot) + '"></span>' + esc(mdl.name) + '</div>' +
          '<div class="body">' + code(a.text, on) + '</div>' +
          '<div class="model-meta">' +
            '<span class="meter">Stance <span class="bar"><i style="width:' + Math.round(Math.abs(a.stance) * 100) + '%;background:' + (a.stance >= 0 ? cssVar('--div-pos') : cssVar('--div-neg')) + '"></i></span> ' + (a.stance > 0 ? '+' : '') + a.stance.toFixed(2) + '</span>' +
            '<span class="meter">Hedging <span class="bar"><i style="width:' + Math.round(a.hedging * 100) + '%"></i></span> ' + Math.round(a.hedging * 100) + '%</span>' +
            '<span class="cites">Cites: ' + a.cites.map(function (c) { return '<span>' + esc((E.sourceById[c] || {}).short || c) + '</span>'; }).join('') + '</span>' +
          '</div></div>';
      });
      html += '</div>';
      plot.innerHTML = html;

      drawLegend(ctx.legend, [], {
        note: on ? 'Shading marks coded spans: hedging · leaning' : 'Coding hidden'
      });
    }
    return { update: function (s) { state = Object.assign({}, state, s || {}); draw(); }, redraw: function () { instant = true; draw(); } };
  }

  /* ================================================================
   * table views — the WCAG-clean twin of every figure
   * ================================================================ */
  function tableFor(type, spec) {
    var f = fmt(spec.format || 'num2');
    var E = SITE.entities;
    switch (type) {
      case 'stream':
        return {
          cols: ['Day'].concat(spec.series.map(function (s) { return s.name; })),
          rows: spec.days.map(function (d, i) {
            return [d.label].concat(spec.series.map(function (s) { return f(s.values[i]); }));
          })
        };
      case 'bars':
        return {
          cols: [spec.rowName || 'Row', spec.valueName || 'Value'].concat(spec.reference ? [spec.referenceName || 'Reference'] : []),
          rows: spec.rows.map(function (d) {
            return [d.full || d.label, f(d.value)].concat(spec.reference ? [f(d[spec.reference])] : []);
          })
        };
      case 'columns':
        return { cols: [spec.xLabel || 'Lag', spec.valueName || 'Value', 'Interval'],
                 rows: spec.rows.map(function (d) { return [d.label, f(d.value), '±' + d3.format('.2f')(d.ci || 0)]; }) };
      case 'quadrant':
        return { cols: ['Item', 'Type', spec.xLabel, spec.yLabel, 'Articles'],
                 rows: spec.points.map(function (d) {
                   return [d.label, d.kind, fmt(spec.xFormat || 'pctv')(d.x), fmt(spec.yFormat || 'num2')(d.y), d3.format(',')(d.n)];
                 }) };
      case 'lollipop':
        return { cols: ['Row', spec.aLabel, spec.bLabel, 'Difference'],
                 rows: spec.rows.map(function (d) { return [d.label, f(d.a), f(d.b), (d.b - d.a > 0 ? '+' : '') + f(d.b - d.a)]; }) };
      case 'heatmap':
        return { cols: [''].concat(spec.cols.map(function (c) { return c.label; })),
                 rows: spec.rows.map(function (r) {
                   return [r.label].concat(spec.cols.map(function (c) {
                     var cell = spec.cells.filter(function (x) { return x.row === r.id && x.col === c.id; })[0];
                     return cell ? f(cell.value) : '—';
                   }));
                 }) };
      case 'flow':
        var byId = {}; spec.nodes.forEach(function (n) { byId[n.id] = n; });
        return { cols: ['From', 'To', 'Messages'],
                 rows: spec.links.map(function (l) { return [byId[l.source].label, byId[l.target].label, d3.format(',')(l.value)]; }) };
      case 'slope':
        return { cols: ['Row', spec.fromLabel || 'From', spec.toLabel || 'To', 'Shift'],
                 rows: spec.rows.map(function (d) { return [d.label, f(d.from), f(d.to), (d.to - d.from > 0 ? '+' : '') + f(d.to - d.from)]; }) };
      case 'network':
        return { cols: ['Node', 'Type', 'Cluster', 'Shares'],
                 rows: spec.nodes.map(function (n) {
                   var c = (spec.communities || []).filter(function (x) { return x.id === n.comm; })[0] || {};
                   return [n.label, n.type, c.label || '—', n.reshares ? d3.format(',')(n.reshares) : '—'];
                 }) };
      case 'scatter':
        return { cols: [spec.xLabel, spec.yLabel, 'Group'],
                 rows: spec.points.map(function (p) {
                   var gr = (spec.groups || []).filter(function (g) { return g.id === p.group; })[0] || {};
                   return [fmt(spec.xFormat || 'num2')(p.x), fmt(spec.yFormat || 'num0')(p.y), gr.label || p.group];
                 }) };
      case 'diverging':
        return { cols: ['Row'].concat(spec.categories),
                 rows: spec.rows.map(function (r) { return [r.label].concat(r.values.map(f)); }) };
      case 'timeline':
        return { cols: [spec.days ? 'Day' : 'Days from event'].concat(spec.series.map(function (s) { return s.label; }))
                   .concat(spec.volume ? [spec.volumeLabel || 'Articles'] : []),
                 rows: (spec.days || spec.x.map(function (v) { return { label: (v > 0 ? '+' : '') + v }; })).map(function (d, i) {
                   return [d.label].concat(spec.series.map(function (s) { return f(s.values[i]); }))
                     .concat(spec.volume ? [d3.format(',')(spec.volume[i])] : []);
                 }) };
      case 'radar':
        return { cols: ['Dimension'].concat(spec.series.map(function (s) { return s.label; })),
                 rows: spec.axes.map(function (a, i) { return [a].concat(spec.series.map(function (s) { return d3.format('.2f')(s.values[i]); })); }) };
      case 'headlines':
        var rows = [];
        spec.sets.forEach(function (set) {
          set.headlines.forEach(function (h) {
            rows.push([set.label, (E.sourceById[h.source] || {}).name || h.source, h.text,
                       (h.spans || []).map(function (s) { return '“' + s.t + '”'; }).join('; ') || '—']);
          });
        });
        return { cols: ['Event', 'Source', 'Headline', 'Coded spans'], rows: rows };
      case 'imagegrid':
        return { cols: ['Source', 'Actor', 'Angle', 'Shot', 'Expression', 'Setting', 'Caption congruence'],
                 rows: spec.images.map(function (d) {
                   return [(E.sourceById[d.source] || {}).name, d.actorLabel, d.angle, d.shot, d.expr, d.set, d3.format('+.2f')(d.congruence)];
                 }) };
      case 'models':
        var mrows = [];
        spec.questions.forEach(function (q) {
          q.answers.forEach(function (a) {
            var mdl = E.assistants.filter(function (x) { return x.id === a.model; })[0];
            mrows.push([q.question, mdl.name, d3.format('+.2f')(a.stance), Math.round(a.hedging * 100) + '%',
                        a.cites.map(function (c) { return (E.sourceById[c] || {}).short || c; }).join(', ')]);
          });
        });
        return { cols: ['Question', 'Assistant', 'Stance', 'Hedging', 'Cited outlets'], rows: mrows };
      default:
        return { cols: ['—'], rows: [] };
    }
  }

  /* ---- registry --------------------------------------------------- */
  var REG = { stream: stream, bars: bars, columns: columns, quadrant: quadrant, lollipop: lollipop,
              heatmap: heatmap, flow: flow, slope: slope, network: network, scatter: scatter,
              diverging: diverging, timeline: timeline, radar: radar, headlines: headlines,
              imagegrid: imagegrid, models: models };

  function create(type, ctx) {
    var fn = REG[type];
    if (!fn) { ctx.plot.innerHTML = '<p class="tiny">Unknown figure type: ' + esc(type) + '</p>'; return { update: function () {}, redraw: function () {} }; }
    ctx.tip = ctx.tip || Tip(ctx.plot);
    var inst = fn(ctx);
    inst.update({});
    return inst;
  }

  return { create: create, tableFor: tableFor, pal: pal, cssVar: cssVar, fmt: fmt, isHtml: function (t) {
    return t === 'headlines' || t === 'imagegrid' || t === 'models';
  } };
}());
