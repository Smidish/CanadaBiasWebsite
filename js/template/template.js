/* ------------------------------------------------------------------ *
 * template.js — the snippet library page (template.html).
 *
 * Every figure example is drawn with the real chart code and printed
 * from the same object, so what you copy is exactly what you see.
 * Development only: not linked from the site and not deployed.
 * ------------------------------------------------------------------ */
(function () {
  'use strict';
  var U = SITE.util, esc = U.esc;

  /* ---- a JavaScript-literal printer ------------------------------- *
   * Prints plain data the way the content files are written: unquoted
   * keys, single-quoted strings, short arrays and objects on one line.
   * ------------------------------------------------------------------ */
  var IDENT = /^[A-Za-z_$][\w$]*$/;
  function str(s) { return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'"; }
  function oneLine(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return '[' + v.map(oneLine).join(', ') + ']';
    if (typeof v === 'object') {
      var ks = Object.keys(v);
      return ks.length ? '{ ' + ks.map(function (k) { return (IDENT.test(k) ? k : str(k)) + ': ' + oneLine(v[k]); }).join(', ') + ' }' : '{}';
    }
    if (typeof v === 'string') return str(v);
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
    return String(v);
  }
  function toJS(v, ind) {
    ind = ind || '';
    var flat = oneLine(v);
    if (flat.length + ind.length <= 96 || v === null || typeof v !== 'object') return flat;
    var next = ind + '  ';
    if (Array.isArray(v)) {
      // arrays of numbers wrap as a block rather than one per line
      if (v.every(function (x) { return typeof x === 'number'; })) return flat;
      return '[\n' + v.map(function (x) { return next + toJS(x, next); }).join(',\n') + '\n' + ind + ']';
    }
    return '{\n' + Object.keys(v).map(function (k) {
      return next + (IDENT.test(k) ? k : str(k)) + ': ' + toJS(v[k], next);
    }).join(',\n') + '\n' + ind + '}';
  }
  SITE.toJS = toJS;

  /* ---- copy buttons ----------------------------------------------- */
  function copyText(text, btn) {
    function done(ok) {
      btn.textContent = ok ? 'Copied' : 'Select + ⌘C';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
    } else done(fallback());
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      return ok;
    }
  }
  function codeBlock(text, label) {
    var w = U.el('div', 'tpl-code');
    var bar = U.el('div', 'tpl-code-bar', '<span>' + esc(label || 'Snippet') + '</span>');
    var b = U.el('button', 'tpl-copy', 'Copy');
    b.type = 'button';
    b.addEventListener('click', function () { copyText(text, b); });
    bar.appendChild(b);
    w.appendChild(bar);
    var pre = U.el('pre');
    pre.textContent = text;
    w.appendChild(pre);
    return w;
  }

  /* ================================================================
   * Building blocks (text)
   * ================================================================ */
  var ROUTE = [
    "/* ══ CONTENT · Route 1D ═══════════════════════════════════════",
    "   Paste inside the routes: [ … ] array of js/content/rqN.js,",
    "   after the closing }, of the previous route. ═════════════════ */",
    "{",
    "  id: 'r1d',                        // unique on the page; also the #anchor",
    "  tag: 'Route 1D',",
    "  name: 'The route’s name',",
    "  blurb: 'One sentence for the route card at the top of the path.',",
    "  figKind: 'Bars · switch the campaign',   // small label on the route card",
    "  opening: '<p>The paragraph on the title card. Say what the reader is about to see.</p>',",
    "  stat: { value: '42%', caption: 'what the headline number means, in one sentence.' },",
    "",
    "  scrolly: {",
    "    side: 'right',                  // where the figure sits on wide screens: 'right' | 'left'",
    "    figure: {                       // ← replace with any figure snippet below",
    "      type: 'bars',",
    "      title: 'Figure title',",
    "      subtitle: 'What, where, which sources',",
    "      caption: 'How to read it, in one or two sentences.',",
    "      spec: {",
    "        format: 'pctv', valueName: 'Share',",
    "        rows: [",
    "          { id: 'a', label: 'First row', value: 42, slot: 1 },",
    "          { id: 'b', label: 'Second row', value: 31, slot: 2 },",
    "          { id: 'c', label: 'Third row', value: 27, slot: 3 }",
    "        ]",
    "      }",
    "    },",
    "    steps: [",
    "      { title: 'Start with the whole picture',",
    "        html: '<p>First comment. One idea per step.</p>',",
    "        state: {} },",
    "      { title: 'Then point at one thing',",
    "        html: '<p>Numbers read best as <b class=\"num\">42%</b>.</p>',",
    "        state: { highlight: 'a' } },",
    "      { title: 'Change the data mid-walk',",
    "        html: '<p>A step can swap the data behind the figure as well as its state.</p>',",
    "        spec: { format: 'pctv', valueName: 'Share', rows: [",
    "          { id: 'a', label: 'First row', value: 35, slot: 1 },",
    "          { id: 'b', label: 'Second row', value: 38, slot: 2 },",
    "          { id: 'c', label: 'Third row', value: 27, slot: 3 }",
    "        ] },",
    "        state: { highlight: null } }",
    "    ]",
    "  },",
    "",
    "  // Optional: the same figure with controls. Delete the whole block to leave it out.",
    "  explorer: {",
    "    title: 'Run it yourself',",
    "    text: 'Pick a campaign. Hover any bar for its value, or open the table.',",
    "    controls: [",
    "      { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',",
    "        options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }",
    "    ],",
    "    figure: { type: 'bars', title: 'Figure title', caption: 'How to read it.',",
    "      spec: { format: 'pctv', rows: [{ id: 'a', label: 'First row', value: 42, slot: 1 }, { id: 'b', label: 'Second row', value: 31, slot: 2 }] } },",
    "    // runs on every control change with the current values, e.g. { event: 'ab' }",
    "    apply: function (v) {",
    "      var rows = v.event === 'qc'",
    "        ? [{ id: 'a', label: 'First row', value: 42, slot: 1 }, { id: 'b', label: 'Second row', value: 31, slot: 2 }]",
    "        : [{ id: 'a', label: 'First row', value: 18, slot: 1 }, { id: 'b', label: 'Second row', value: 55, slot: 2 }];",
    "      return { spec: { format: 'pctv', rows: rows } };",
    "    }",
    "  },",
    "",
    "  takeaway: '<p>What this measurement shows — and, just as plainly, what it cannot.</p>'",
    "}"
  ].join('\n');
  SITE.TEMPLATE_ROUTE = ROUTE;

  var BLOCKS = [
    {
      id: 'b-step', name: 'Step (comment box)',
      where: 'Inside a route’s scrolly.steps: [ … ] (or a tour beat’s steps).',
      preview: '<div class="step-box tpl-live"><span class="step-n">Step 2 / 5</span><h3>Then something happens</h3>' +
               '<p>Day 17: a dispute over platform costings. Day 23: the televised leaders’ debate.</p>' +
               '<p>In the final week the party holds <b class="num">14%</b> of mentions.</p></div>',
      code: "{ title: 'Then something happens',\n" +
            "  html: '<p>Day 17: a dispute over platform costings. Day 23: the televised leaders’ debate.</p>' +\n" +
            "        '<p>In the final week the party holds <b class=\"num\">14%</b> of mentions.</p>',\n" +
            "  state: { highlight: 'ms', annotate: [{ i: 17, label: 'Costing row' }] },\n" +
            "  // spec: { … }   optional: swap the data behind the figure at this step\n" +
            "}",
      notes: ['html takes <p>, <b>, <i>, <em>, <a href>. Wrap figures in <b class="num"> for tabular digits.',
              'state is the figure’s step state — each figure below lists the ones it understands.',
              'A state carries over to the next step unless you reset it (e.g. highlight: null).']
    },
    {
      id: 'b-stat', name: 'Headline number (title card)',
      where: 'A route’s stat: field. Tour beats have no stat.',
      preview: '<div class="statline tpl-live"><span class="val num">67%</span><span class="cap">of all actor mentions in the final week went to just two of the five parties.</span></div>',
      code: "stat: { value: '67%', caption: 'of all actor mentions in the final week went to just two of the five parties.' }",
      notes: ['Keep value short — a number and a unit. The caption finishes the sentence.']
    },
    {
      id: 'b-takeaway', name: 'Takeaway (“What this shows — and what it does not”)',
      where: 'A route’s takeaway: field. Appears after the explorer.',
      preview: '<div class="takeaway tpl-live"><span class="tag">What this shows — and what it does not</span>' +
               '<p>Mention counts measure <b>presence, not approval</b>.</p><p>Difference is measurable; intent is not.</p></div>',
      code: "takeaway: '<p>Mention counts measure <b>presence, not approval</b>.</p>' +\n" +
            "          '<p>Difference is measurable; intent is not.</p>'",
      notes: ['Every route ends with one. State the limit plainly.']
    },
    {
      id: 'b-controls', name: 'Explorer controls',
      where: 'Inside explorer.controls: [ … ]. Each control’s id becomes a key in apply(v).',
      preview: '',
      code: "// two to four options, side by side\n" +
            "{ id: 'event', label: 'Campaign', type: 'switch', value: 'qc',\n" +
            "  options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] },\n\n" +
            "// a long list\n" +
            "{ id: 'source', label: 'Newsroom', type: 'select', value: 'all',\n" +
            "  options: [{ value: 'all', label: 'All sources' }, { value: 'boreal', label: 'Radio Boréal' }] },\n\n" +
            "// toggles; multi: true keeps several on (value is then an array)\n" +
            "{ id: 'kinds', label: 'Show', type: 'chips', multi: true, value: ['actor', 'issue'],\n" +
            "  options: [{ value: 'actor', label: 'Actors', color: 'var(--series-1)' },\n" +
            "            { value: 'issue', label: 'Issues', color: 'var(--series-2)' }] }",
      notes: ['apply(v) returns { spec } to redraw with new data, { state } to change emphasis, or both.']
    },
    {
      id: 'b-beat', name: 'Guided-tour beat',
      where: 'Inside beats: [ … ] in js/content/tour.js.',
      preview: '',
      code: "{\n" +
            "  rq: 1,                                  // which path this beat opens into\n" +
            "  title: 'Attention is finite, and it narrows',\n" +
            "  opening: '<p>The title-card paragraph.</p>',\n" +
            "  figure: { /* any figure snippet */ },\n" +
            "  steps: [\n" +
            "    { title: 'First', html: '<p>…</p>', state: {} },\n" +
            "    { title: 'Second', html: '<p>…</p>', state: { highlight: 'cn' } }\n" +
            "  ],\n" +
            "  deeper: 'One sentence on the “Go deeper” card that links to the full path.'\n" +
            "}",
      notes: []
    },
    {
      id: 'b-path', name: 'Path header and ending',
      where: 'Top-level fields of a js/content/rqN.js file (outside routes).',
      preview: '',
      code: "name: 'Who Gets the Mic',\n" +
            "standfirst: 'Two or three sentences under the path title.',\n" +
            "rqText: 'The research question, word for word.',\n\n" +
            "closing: {\n" +
            "  title: 'You now know who was in the room.',\n" +
            "  text: 'A paragraph that hands over to the next path.'\n" +
            "},\n" +
            "next: [\n" +
            "  { rq: 2, why: 'Why this path is a good next step.' },\n" +
            "  { rq: 7, why: '…' }\n" +
            "]",
      notes: ['The door text on the hub (name, question, minutes) lives in js/content/_manifest.js.']
    }
  ];

  var FORMATS = [
    ['pct0', 0.4235, 'share 0–1 → 42%'], ['pct1', 0.4235, 'share 0–1 → 42.4%'], ['pctv', 42.35, 'already a percentage → 42.4%'],
    ['num0', 1234.5, '1,235'], ['num1', 1234.56, '1,234.6'], ['num2', 0.4567, '0.46'],
    ['sd', 0.42, 'standard deviations, signed'], ['corr', 0.42, 'signed, 2 dp'], ['plain', 'as is', 'unchanged']
  ];

  /* ================================================================
   * Page
   * ================================================================ */
  function renderBlocks(mount) {
    BLOCKS.forEach(function (b) {
      var sec = U.el('section', 'tpl-item');
      sec.id = b.id;
      sec.appendChild(U.el('div', 'tpl-item-head', '<h3>' + esc(b.name) + '</h3><p class="small">' + esc(b.where) + '</p>'));
      var body = U.el('div', 'tpl-item-body' + (b.preview ? '' : ' tpl-code-only'));
      if (b.preview) body.appendChild(U.el('div', 'tpl-preview', b.preview));
      var right = U.el('div', 'tpl-side');
      right.appendChild(codeBlock(b.code));
      if (b.notes.length) right.appendChild(U.el('ul', 'tpl-notes', b.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('')));
      body.appendChild(right);
      sec.appendChild(body);
      mount.appendChild(sec);
    });
  }

  function renderFigures(mount) {
    var figs = [];
    SITE.TEMPLATE_SAMPLES.forEach(function (s) {
      var sec = U.el('section', 'tpl-item');
      sec.id = 'fig-' + s.type;
      sec.appendChild(U.el('div', 'tpl-item-head',
        '<h3><code>' + esc(s.type) + '</code> · ' + esc(s.name) + '</h3><p class="small">' + esc(s.use) + '</p>'));
      var body = U.el('div', 'tpl-item-body');

      var left = U.el('div', 'tpl-preview tpl-fig');
      var fig = SITE.Figure(s.figure);
      left.appendChild(fig.el);
      var st = U.el('div', 'tpl-states', '<span class="tiny">Try a step state:</span>');
      var shown = U.el('pre', 'tpl-state-shown');
      shown.textContent = 'state: {}';
      s.states.forEach(function (x) {
        var b = U.el('button', 'chip', esc(x.label));
        b.type = 'button';
        b.addEventListener('click', function () {
          fig.update(x.state);
          st.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); });
          shown.textContent = 'state: ' + toJS(x.state, '');
        });
        st.appendChild(b);
      });
      left.appendChild(st);
      left.appendChild(shown);
      body.appendChild(left);

      var right = U.el('div', 'tpl-side');
      right.appendChild(codeBlock(toJS(s.figure, ''), 'figure: { … }'));
      right.appendChild(U.el('table', 'tpl-fields',
        '<thead><tr><th>spec field</th><th>what it takes</th></tr></thead><tbody>' +
        s.fields.map(function (f) { return '<tr><td><code>' + esc(f[0]) + '</code></td><td>' + esc(f[1]) + '</td></tr>'; }).join('') +
        '</tbody>'));
      body.appendChild(right);
      sec.appendChild(body);
      mount.appendChild(sec);
      figs.push(fig);
    });
    SITE.flushFigures();
  }

  function renderRef(mount) {
    mount.innerHTML =
      '<div class="tpl-ref"><div><h4>Number formats <code>format: \'…\'</code></h4><table class="tpl-fields"><tbody>' +
      FORMATS.map(function (f) {
        return '<tr><td><code>' + f[0] + '</code></td><td>' + esc(SITE.Charts.fmt(f[0])(f[1])) + '</td><td class="small">' + esc(f[2]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div><h4>Colour slots <code>slot: 1…8</code></h4><p class="small">Colour follows the entity: give each party, source or group ' +
      'the same slot everywhere. Slots 1–8 are validated for contrast in light and dark.</p><div class="tpl-slots">' +
      [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<span><i style="background:var(--series-' + n + ')"></i>' + n + '</span>'; }).join('') +
      '</div></div></div>';
  }

  SITE.renderTemplate = function () {
    document.getElementById('tplRoute').appendChild(codeBlock(ROUTE, 'routes[ … ] entry'));
    renderBlocks(document.getElementById('tplBlocks'));
    renderFigures(document.getElementById('tplFigures'));
    renderRef(document.getElementById('tplRef'));
    document.getElementById('tplNav').innerHTML = SITE.TEMPLATE_SAMPLES.map(function (s) {
      return '<a href="#fig-' + s.type + '">' + s.type + '</a>';
    }).join('');
  };
}());
