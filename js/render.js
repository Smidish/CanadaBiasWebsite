/* ------------------------------------------------------------------ *
 * render.js — turns a content object into a page.
 *
 * SITE.Figure(figSpec)      → a framed, hoverable, table-backed figure
 * SITE.renderPath(el, path) → header, crossroads, routes, where-next
 * SITE.renderTour(el, tour) → the default guided path
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

(function () {
  'use strict';

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; });
  }
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var CAUTION = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5 14.5 13.5h-13L8 2.5Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.5v3M8 11.6v.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var SIM = '<span class="sim-badge" title="These numbers are placeholders generated for the prototype.">Simulated<span class="long"> data</span></span>';

  // Card-like blocks sit inside a .wrap rather than wearing it, so their own
  // padding can never cancel the page gutter.
  function wrapped(node) { var w = el('div', 'wrap'); w.appendChild(node); return w; }

  // A chart sizes itself from its container, so a figure is not drawn at
  // construction time — it is drawn once its section is in the document and
  // has a real width. Page builders call flush() after appending.
  var pending = [];
  function flush() {
    var q = pending; pending = [];
    q.forEach(function (f) { f.build(); });
  }
  SITE.flushFigures = flush;

  /* ================================================================
   * Figure — the frame every chart lives in
   * ================================================================ */
  SITE.Figure = function (fig) {
    var root = el('figure', 'figure');
    var id = 'fig-' + Math.random().toString(36).slice(2, 8);

    var head = el('div', 'figure-head');
    var t = el('div', 't');
    t.appendChild(el('p', 'figure-title', esc(fig.title || '')));
    if (fig.subtitle) t.appendChild(el('p', 'figure-sub', esc(fig.subtitle)));
    head.appendChild(t);

    var tools = el('div', 'figure-tools');
    var tableBtn = el('button', null, 'Table');
    tableBtn.type = 'button';
    tableBtn.setAttribute('aria-pressed', 'false');
    tableBtn.setAttribute('aria-controls', id + '-table');
    tools.appendChild(tableBtn);
    head.appendChild(tools);
    root.appendChild(head);

    var plot = el('div', 'figure-plot');
    root.appendChild(plot);
    var legend = el('div', 'legend');
    root.appendChild(legend);

    var table = el('div', 'table-view');
    table.id = id + '-table';
    table.hidden = true;
    root.appendChild(table);

    var cap = el('figcaption', 'figure-caption');
    cap.innerHTML = SIM + '<span>' + (fig.caption || '') + '</span>';
    root.appendChild(cap);

    var inst = null, lastState = {}, spec = fig.spec;

    function build() {
      plot.querySelectorAll('svg, .tip').forEach(function (n) { n.remove(); });
      plot.innerHTML = '';
      inst = SITE.Charts.create(fig.type, { plot: plot, legend: legend, spec: spec });
      inst.update(lastState);
      // an SVG with role="img" needs a name; the numbers are in the table view
      var svg = plot.querySelector('svg');
      if (svg) svg.setAttribute('aria-label', (fig.title || 'Figure') + (fig.subtitle ? ' — ' + fig.subtitle : '') +
                                '. Use the Table button for the values.');
      table.dataset.built = '';
    }

    function buildTable() {
      if (table.dataset.built === '1') return;
      var d = SITE.Charts.tableFor(fig.type, spec);
      var h = '<table><caption class="visually-hidden">' + esc(fig.title || '') + '</caption><thead><tr>' +
        d.cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        d.rows.map(function (r) {
          return '<tr>' + r.map(function (v, i) { return i === 0 ? '<th scope="row">' + esc(v) + '</th>' : '<td>' + esc(v) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      table.innerHTML = h;
      table.dataset.built = '1';
    }

    tableBtn.addEventListener('click', function () {
      var on = table.hidden;
      buildTable();
      table.hidden = !on;
      tableBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });


    // redraw on container resize and on theme change (palette is read from CSS)
    var rt;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (inst && inst.redraw) inst.redraw(); }, 120);
      }).observe(plot);
    }
    window.addEventListener('themechange', function () { if (inst) inst.redraw(); });

    var api = {
      el: root,
      build: function () { if (!inst) build(); },
      update: function (s) { lastState = Object.assign({}, lastState, s || {}); if (inst) inst.update(lastState); },
      setSpec: function (newSpec, keepState) {
        spec = newSpec;
        if (!keepState) lastState = {};
        // Before the first build the new spec is simply what gets drawn.
        if (inst) build();
      },
      get spec() { return spec; }
    };
    pending.push(api);
    return api;
  };

  /* ================================================================
   * Controls — one filter row above everything it scopes
   * ================================================================ */
  function buildControls(defs, onChange) {
    var row = el('div', 'controls');
    var values = {};
    defs.forEach(function (c) { values[c.id] = c.value; });

    defs.forEach(function (c) {
      var wrap = el('div', 'control');
      wrap.appendChild(el('label', null, esc(c.label)));

      if (c.type === 'select') {
        var sel = el('select');
        sel.setAttribute('aria-label', c.label);
        c.options.forEach(function (o) {
          var op = document.createElement('option');
          op.value = o.value; op.textContent = o.label;
          if (o.value === c.value) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener('change', function () { values[c.id] = sel.value; onChange(values, c.id); });
        wrap.appendChild(sel);

      } else if (c.type === 'switch') {
        var sw = el('div', 'switch');
        sw.setAttribute('role', 'group');
        sw.setAttribute('aria-label', c.label);
        c.options.forEach(function (o) {
          var b = el('button', null, esc(o.label));
          b.type = 'button';
          b.setAttribute('aria-pressed', o.value === c.value ? 'true' : 'false');
          b.addEventListener('click', function () {
            values[c.id] = o.value;
            sw.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
            b.setAttribute('aria-pressed', 'true');
            onChange(values, c.id);
          });
          sw.appendChild(b);
        });
        wrap.appendChild(sw);

      } else if (c.type === 'chips') {
        var cs = el('div', 'chips');
        cs.setAttribute('role', 'group');
        cs.setAttribute('aria-label', c.label);
        c.options.forEach(function (o) {
          var b = el('button', 'chip');
          b.type = 'button';
          var on = c.multi ? (c.value || []).indexOf(o.value) >= 0 : c.value === o.value;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.innerHTML = (o.color ? '<span class="swatch" style="--chip-color:' + o.color + '"></span>' : '') + esc(o.label);
          b.addEventListener('click', function () {
            if (c.multi) {
              var v = (values[c.id] || []).slice();
              var i = v.indexOf(o.value);
              if (i >= 0) { if (v.length > 1) v.splice(i, 1); } else v.push(o.value);
              values[c.id] = v;
              cs.querySelectorAll('.chip').forEach(function (x, k) {
                x.setAttribute('aria-pressed', v.indexOf(c.options[k].value) >= 0 ? 'true' : 'false');
              });
            } else {
              values[c.id] = o.value;
              cs.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
              b.setAttribute('aria-pressed', 'true');
            }
            onChange(values, c.id);
          });
          cs.appendChild(b);
        });
        wrap.appendChild(cs);
      }
      row.appendChild(wrap);
    });
    return { el: row, values: values };
  }

  /* ================================================================
   * Route section
   * ================================================================ */
  var onMounted = [];
  function mounted() { var q = onMounted; onMounted = []; q.forEach(function (fn) { fn(); }); }

  /* Reveal-on-enter for the tail blocks, so the explorer and the takeaway
     arrive on a cleared page instead of sliding up behind the last scene. */
  var revealIO = null;
  function reveal(node) {
    node.classList.add('reveal');
    if (!('IntersectionObserver' in window)) { node.classList.add('is-in'); return; }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            e.target.classList.remove('is-out');
          } else if (e.boundingClientRect.top < 0) {
            // gone past the top — clear it out rather than let it linger
            e.target.classList.add('is-out');
          } else {
            e.target.classList.remove('is-in');
          }
        });
      }, { rootMargin: '-6% 0px -14% 0px', threshold: 0 });
    }
    revealIO.observe(node);
  }

  /* A scene: a pinned stage whose title hands over to its figure, with the
     step boxes as the only thing that actually scrolls. Shared by the path
     pages and the guided tour. */
  function buildScene(cfg) {
    var scene = el('div', 'route-scene');
    var slot = cfg.slot || '';

    var stage = el('div', 'route-stage');
    var fx = document.createElement('canvas');
    fx.className = 'stage-fx';
    fx.setAttribute('aria-hidden', 'true');
    stage.appendChild(fx);

    var title = el('div', 'stage-title');
    var inner = el('div', 'stage-title-inner');
    inner.dataset.slot = slot + ' › ' + cfg.titleFields;
    inner.innerHTML =
      '<span class="tag">' + esc(cfg.tag) + '</span>' +
      '<h2>' + esc(cfg.name) + '</h2>' +
      '<div class="route-opening">' + cfg.opening + '</div>' +
      (cfg.stat ? '<div class="statline"><span class="val num">' + esc(cfg.stat.value) +
                  '</span><span class="cap">' + cfg.stat.caption + '</span></div>' : '') +
      '<button type="button" class="stage-hint" aria-label="Show the figure and the first step">' +
        '<span class="stage-hint-arrow"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3v9.5M3.8 8.3 8 12.5l4.2-4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
        '<span>Keep scrolling</span></button>';
    title.appendChild(inner);
    stage.appendChild(title);

    var figWrap = el('div', 'stage-figure');
    figWrap.dataset.slot = slot + ' › ' + cfg.figureField;
    var figure = SITE.Figure(cfg.figure);
    figWrap.appendChild(figure.el);
    stage.appendChild(figWrap);

    scene.appendChild(stage);

    var flow = el('div', 'route-flow');
    flow.appendChild(el('div', 'phase phase-intro'));
    var counted = cfg.steps.filter(function (s) { return !s.deeper; }).length;
    cfg.steps.forEach(function (s, i) {
      var step = el('div', 'step');
      var box = el('div', 'step-box');
      box.dataset.slot = slot + ' › ' + cfg.stepsField + '[' + i + ']';
      if (s.deeper) {
        // the tour's "go deeper" door, as the last card of the walk
        box.className += ' step-box--deeper';
        box.dataset.slot = s.slot;
        box.innerHTML = '<span class="step-n">' + esc(s.tag) + '</span><h3>' + esc(s.title) + '</h3>' + s.html +
          '<a class="btn step-cta" href="' + s.href + '">' + esc(s.cta) + ARROW + '</a>';
        step.appendChild(box);
        flow.appendChild(step);
        return;
      }
      box.innerHTML = '<span class="step-n">Step ' + (i + 1) + ' / ' + counted + '</span>' +
        (s.title ? '<h3>' + esc(s.title) + '</h3>' : '') + s.html;
      step.appendChild(box);
      flow.appendChild(step);
    });
    flow.appendChild(el('div', 'phase phase-outro'));
    scene.appendChild(flow);

    return { el: scene, flow: flow, figure: figure };
  }

  function wireScene(sec, scene, cfg) {
    onMounted.push(function () {
      SITE.Stage.register(sec, cfg.figure.type);
      SITE.Scrolly(scene.flow, function (i) {
        var s = cfg.steps[i];
        if (!s) return;
        SITE.Stage.step(sec, i);
        // a step may swap the data behind the figure as well as its state
        if (s.spec) {
          scene.figure.setSpec(typeof s.spec === 'function' ? s.spec() : s.spec, true);
          SITE.Stage.refresh();
        }
        scene.figure.update(s.state || {});
      });
    });
  }

  function renderRoute(route, pathId, ri) {
    var sec = el('section', 'route');
    sec.id = route.id;
    sec.dataset.side = route.scrolly.side || 'right';

    var cfg = {
      tag: route.tag, name: route.name, opening: route.opening, stat: route.stat,
      figure: route.scrolly.figure, steps: route.scrolly.steps,
      slot: pathId + '.js › routes[' + ri + '] (' + route.tag + ')',
      titleFields: 'name · opening · stat', figureField: 'scrolly.figure', stepsField: 'scrolly.steps'
    };
    var scene = buildScene(cfg);
    sec.appendChild(scene.el);

    /* ---- tail: explorer and takeaway, on a page the scene has cleared ---- */
    var tail = el('div', 'route-tail');

    if (route.explorer) {
      var ex = el('div', 'explorer');
      ex.dataset.slot = cfg.slot + ' › explorer';
      var exHead = el('div', 'explorer-head');
      exHead.innerHTML = '<span class="tag">Your turn</span><h3>' + esc(route.explorer.title) + '</h3><p>' + route.explorer.text + '</p>';
      ex.appendChild(exHead);

      var exFigure = SITE.Figure(route.explorer.figure);
      var ctrls = buildControls(route.explorer.controls || [], function (values) {
        var res = route.explorer.apply ? route.explorer.apply(values) : {};
        if (res.spec) exFigure.setSpec(res.spec, true);
        if (res.state) exFigure.update(res.state);
      });
      ex.appendChild(ctrls.el);
      var body = el('div', 'explorer-body');
      body.appendChild(exFigure.el);
      ex.appendChild(body);
      var exWrap = wrapped(ex);
      reveal(exWrap);
      tail.appendChild(exWrap);

      if (route.explorer.apply) {
        var init = route.explorer.apply(ctrls.values);
        if (init.spec) exFigure.setSpec(init.spec, true);
        if (init.state) exFigure.update(init.state);
      }
    }

    var tk = el('div', 'takeaway col-wide');
    tk.dataset.slot = cfg.slot + ' › takeaway';
    tk.innerHTML = '<span class="tag">' + CAUTION + 'What this shows — and what it does not</span>' + route.takeaway;
    var tkWrap = wrapped(tk);
    reveal(tkWrap);
    tail.appendChild(tkWrap);

    sec.appendChild(tail);

    wireScene(sec, scene, cfg);
    return sec;
  }

  /* ================================================================
   * Path page
   * ================================================================ */
  SITE.renderPath = function (mount, path) {
    document.body.dataset.accent = path.accent;
    document.title = path.name + ' · Same Campaign, Different Story';

    var head = el('header', 'path-head wrap');
    head.id = 'overview';
    head.innerHTML =
      '<div class="col-wide" data-slot="' + path.id + '.js › name · standfirst · rqText">' +
      '<p class="kicker"><span class="dot"></span>Path ' + path.n + ' of 7 · ' + esc(path.rqId) + '</p>' +
      '<div class="path-n num">' + path.n + '</div>' +
      '<h1>' + esc(path.name) + '</h1>' +
      '<p class="dek" style="margin-top:1.4rem">' + path.standfirst + '</p>' +
      '<div class="rq-box"><p class="tiny">The research question behind this path</p><p>' + esc(path.rqText) + '</p></div>' +
      '</div>';
    mount.appendChild(head);

    var cross = el('section', 'crossroads wrap');
    cross.id = 'routes';
    cross.innerHTML = '<div class="col-wide"><h2>Choose where to start.</h2>' +
      '<p class="small" style="margin-top:.6rem">Three routes through this question. Take them in order, or jump to the one you came for — nothing is hidden behind a choice.</p></div>';
    var routes = el('div', 'routes');
    path.routes.forEach(function (r, ri) {
      var a = el('a', 'route-card');
      a.href = '#' + r.id;
      a.dataset.slot = path.id + '.js › routes[' + ri + '] › name · blurb · figKind';
      a.innerHTML = '<span class="tag">' + esc(r.tag) + '</span><h3>' + esc(r.name) + '</h3><p>' + r.blurb + '</p>' +
        '<span class="fig-kind">' + esc(r.figKind) + '</span>';
      routes.appendChild(a);
    });
    cross.appendChild(routes);
    mount.appendChild(cross);

    path.routes.forEach(function (r, ri) { mount.appendChild(renderRoute(r, path.id, ri)); });
    flush();
    mounted();

    /* where next */
    var next = el('section', 'nextup wrap');
    next.id = 'nextup';
    var M = SITE.manifest;
    next.dataset.slot = path.id + '.js › closing · next';
    next.innerHTML = '<div class="col-wide"><p class="kicker"><span class="dot"></span>Where next</p><h2>' + esc(path.closing.title) + '</h2>' +
      '<p class="dek" style="margin-top:1rem">' + path.closing.text + '</p></div>';
    var ng = el('div', 'next-grid');
    path.next.forEach(function (n) {
      var m = M.paths.filter(function (p) { return p.n === n.rq; })[0];
      var a = el('a', 'route-card');
      a.href = 'path.html?rq=' + n.rq;
      a.style.setProperty('--door-accent', 'var(--series-' + m.accent + ')');
      a.innerHTML = '<span class="tag tag-accent">Path ' + m.n + '</span>' +
        '<h3>' + esc(m.name) + '</h3><p>' + n.why + '</p><span class="fig-kind">' + esc(m.rqId) + '</span>';
      ng.appendChild(a);
    });
    var tour = el('a', 'route-card');
    tour.href = 'tour.html';
    tour.innerHTML = '<span class="tag">The short way</span><h3>The guided tour</h3>' +
      '<p>One headline result from each of the seven paths, in about eight minutes.</p><span class="fig-kind">Default path</span>';
    ng.appendChild(tour);
    next.appendChild(ng);
    mount.appendChild(next);

    SITE.markSeen(path.n);

    SITE.buildToc(document.querySelector('.toc'), {
      items: [{ id: 'overview', label: path.name, kind: 'title' }]
        .concat(path.routes.map(function (r) {
          return { id: r.id, tag: r.tag.replace('Route ', ''), label: r.name, steps: r.scrolly.steps.length };
        }))
    });
  };

  /* ================================================================
   * Tour page — the default path
   * ================================================================ */
  SITE.renderTour = function (mount, tour) {
    tour.beats.forEach(function (b, i) {
      var m = SITE.manifest.paths.filter(function (p) { return p.n === b.rq; })[0];

      var sec = el('section', 'route');
      sec.id = 'beat-' + (i + 1);
      sec.dataset.side = i % 2 ? 'left' : 'right';
      // each beat wears its own path's accent, so the colour changes with the scene
      sec.style.setProperty('--accent', 'var(--series-' + m.accent + ')');

      var cfg = {
        tag: 'Beat ' + (i + 1) + ' of ' + tour.beats.length + ' · ' + m.rqId,
        name: b.title,
        opening: b.opening,
        stat: null,
        figure: b.figure,
        // the door into the full path is the walk's last card, not a block after it
        steps: b.steps.concat([{
          deeper: true, tag: 'Go deeper · Path ' + m.n, title: m.name,
          html: '<p>' + b.deeper + '</p>', href: 'path.html?rq=' + b.rq, cta: 'Open the full path',
          slot: 'tour.js › beats[' + i + '].deeper'
        }]),
        slot: 'tour.js › beats[' + i + ']',
        titleFields: 'title · opening', figureField: 'figure', stepsField: 'steps'
      };
      var scene = buildScene(cfg);
      sec.appendChild(scene.el);

      // No tail: the next beat's scene is butted straight onto this one
      // (.route.no-tail in base.css), so there is no empty screen between them.
      sec.classList.add('no-tail');

      mount.appendChild(sec);
      flush();
      wireScene(sec, scene, cfg);
      mounted();
    });

    SITE.buildToc(document.querySelector('.toc'), {
      items: [{ id: 'tour-top', label: 'The guided tour', kind: 'title' }]
        .concat(tour.beats.map(function (b, i) {
          var m = SITE.manifest.paths.filter(function (p) { return p.n === b.rq; })[0];
          return { id: 'beat-' + (i + 1), tag: m.rqId, label: b.title, steps: b.steps.length + 1 };
        }))
    });
  };

  SITE.util = { el: el, esc: esc, ARROW: ARROW, SIM: SIM };
}());
