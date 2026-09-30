/* ------------------------------------------------------------------ *
 * samples.js — one small, complete example of every figure type, with
 * its data written inline, plus the step states each type understands.
 *
 * template.html draws each example with the real chart code and prints
 * the *same object* as the snippet to copy, so a snippet can never
 * disagree with the preview next to it.
 *
 * Nothing here is loaded by the public site.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.TEMPLATE_SAMPLES = (function () {
  'use strict';

  var days = ['Sep 1', 'Sep 2', 'Sep 3', 'Sep 4', 'Sep 5', 'Sep 6', 'Sep 7'].map(function (l, i) { return { i: i, label: l }; });

  return [
    /* ---------------------------------------------------------------- */
    {
      type: 'stream', name: 'Stacked area over time', use: 'Shares that add up to a whole, day by day (Route 1A).',
      figure: {
        type: 'stream',
        title: 'Share of campaign mentions, by day',
        subtitle: 'Quebec general election · all sources',
        caption: 'Each band is one actor’s share of all actor mentions that day.',
        spec: {
          format: 'pct0',
          days: days,
          series: [
            { id: 'cn', name: 'Coalition Nationale', short: 'CN', slot: 1, values: [0.34, 0.36, 0.35, 0.40, 0.41, 0.43, 0.44] },
            { id: 'pld', name: 'Parti Libéral-Démocrate', short: 'PLD', slot: 2, values: [0.30, 0.29, 0.31, 0.30, 0.31, 0.32, 0.33] },
            { id: 'ms', name: 'Mouvement Solidaire', short: 'MS', slot: 3, values: [0.20, 0.20, 0.19, 0.18, 0.17, 0.15, 0.14] },
            { id: 'other', name: 'Everyone else', short: 'Other', slot: 5, values: [0.16, 0.15, 0.15, 0.12, 0.11, 0.10, 0.09] }
          ]
        }
      },
      states: [
        { label: 'highlight one band', state: { highlight: 'ms' } },
        { label: 'annotate days', state: { highlight: null, annotate: [{ i: 3, label: 'Debate' }] } }
      ],
      fields: [
        ['days', '[{ i, label }] — one per x position, i = 0, 1, 2…'],
        ['series', '[{ id, name, short, slot, values }] — values line up with days; each day should sum to ~1'],
        ['format', "'pct0' · 'pct1' · 'num0' … (see Formats)"],
        ['legendNote', 'optional text after the legend']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'bars', name: 'Ranked horizontal bars', use: 'A ranking, optionally signed or with a reference tick per row.',
      figure: {
        type: 'bars',
        title: 'Final-week share of mentions',
        subtitle: 'Quebec · all sources',
        caption: 'The tick marks each party’s share of the vote in the previous election.',
        spec: {
          format: 'pctv', valueName: 'Share of mentions', rowName: 'Party',
          reference: 'prev', referenceName: 'Previous vote share',
          labelWidth: 170,
          rows: [
            { id: 'cn', label: 'Coalition Nationale', value: 38.2, prev: 34.1, slot: 1 },
            { id: 'pld', label: 'Parti Libéral-Démocrate', value: 29.5, prev: 31.0, slot: 2 },
            { id: 'ms', label: 'Mouvement Solidaire', value: 14.8, prev: 17.6, slot: 3 },
            { id: 'av', label: 'Alliance Verte', value: 9.1, prev: 8.8, slot: 4 },
            { id: 'pr', label: 'Parti de la Relance', value: 8.4, prev: 8.5, slot: 5, note: 'Ran candidates in 60% of ridings.' }
          ]
        }
      },
      states: [
        { label: 'highlight one row', state: { highlight: 'ms', focus: null } },
        { label: 'focus several', state: { highlight: null, focus: ['cn', 'pld'] } }
      ],
      fields: [
        ['rows', '[{ id, label, value, slot?, full?, note? }] — full = longer name for the tooltip'],
        ['sort', 'false keeps your row order (default: largest first)'],
        ['signed', 'true for values either side of zero'],
        ['colorMode', "'diverging' colours bars by sign; also set negLabel / posLabel"],
        ['reference', 'name of a row field to draw as a tick (here prev); referenceName labels it'],
        ['legendBy', "'slot' builds a legend from each row’s slot and actorLabel"],
        ['labelWidth, rowHeight', 'px for the row labels and per row (defaults 150 / 30)'],
        ['valueName, rowName, format', 'tooltip and table labels; number format']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'columns', name: 'Vertical columns with intervals', use: 'Signed values along an ordered axis, e.g. lag correlations.',
      figure: {
        type: 'columns',
        title: 'Does coverage move before the polls?',
        subtitle: 'Correlation of coverage tone with next-day polling change, by lag',
        caption: 'Negative lags: coverage moves first. Whiskers are 95% intervals.',
        spec: {
          format: 'corr', valueName: 'Correlation', xLabel: 'Lag (days)',
          negLabel: 'Negative', posLabel: 'Positive',
          rows: [-3, -2, -1, 0, 1, 2, 3].map(function (k, i) {
            return { id: 'l' + k, k: k, label: (k > 0 ? '+' : '') + k, value: [0.08, 0.21, 0.34, 0.18, 0.02, -0.06, -0.03][i], ci: 0.09 };
          })
        }
      },
      states: [
        { label: 'emphasise a band of k', state: { band: [-3, -1], highlight: null } },
        { label: 'highlight one', state: { band: null, highlight: 'l-1' } }
      ],
      fields: [
        ['rows', '[{ id, label, value, ci?, k? }] — ci = half-width of the whisker; k = number used by band'],
        ['xLabel, valueName', 'axis title and tooltip label'],
        ['negLabel, posLabel', 'legend labels for the two colours']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'quadrant', name: 'Scatter with quadrants', use: 'Two measures per item, sized by volume, split into four regions.',
      figure: {
        type: 'quadrant',
        title: 'Visibility and polarisation',
        subtitle: 'Each circle is an actor, issue or position',
        caption: 'x = share of all mentions; y = how far apart the sources sat on it.',
        spec: {
          xLabel: 'Share of mentions', yLabel: 'Cross-source dispersion', xFormat: 'pctv', yFormat: 'num2',
          kinds: [{ id: 'actor', label: 'Actors', slot: 1 }, { id: 'issue', label: 'Issues', slot: 2 }, { id: 'pos', label: 'Positions', slot: 3 }],
          quadrantLabels: [{ label: 'Loud and contested', top: true, right: true }, { label: 'Quiet consensus', top: false, right: false }],
          points: [
            { id: 'cn', label: 'Coalition Nationale', kind: 'actor', x: 18.4, y: 0.31, n: 2100 },
            { id: 'ms', label: 'Mouvement Solidaire', kind: 'actor', x: 7.2, y: 0.44, n: 820 },
            { id: 'health', label: 'Health care', kind: 'issue', x: 11.3, y: 0.15, n: 1300 },
            { id: 'ident', label: 'Secularism & identity', kind: 'issue', x: 9.6, y: 0.66, n: 1100 },
            { id: 'cap', label: 'Immigration cap', kind: 'pos', x: 4.1, y: 0.58, n: 460 },
            { id: 'tax', label: 'Income-tax cut', kind: 'pos', x: 3.2, y: 0.22, n: 380 }
          ]
        }
      },
      states: [
        { label: 'highlight one', state: { highlight: 'ident', kinds: null, label: [] } },
        { label: 'only some kinds', state: { highlight: null, kinds: ['issue'] } },
        { label: 'label chosen points', state: { highlight: null, kinds: null, label: ['cap', 'tax'] } }
      ],
      fields: [
        ['kinds', '[{ id, label, slot }] — at most 3'],
        ['points', '[{ id, label, kind, x, y, n }] — n sets circle area'],
        ['xMid, yMid', 'where the quadrant lines cross (default: the means)'],
        ['quadrantLabels', '[{ label, top, right }]'],
        ['xLabel, yLabel, xFormat, yFormat', 'axis titles and formats']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'lollipop', name: 'Dumbbell (two values per row)', use: 'Compare two numbers per row — e.g. population share vs coverage share.',
      figure: {
        type: 'lollipop',
        title: 'Who is covered, against who lives here',
        subtitle: 'Share of adults vs share of group mentions · Quebec',
        caption: 'Right-hand number: coverage minus population share.',
        spec: {
          aLabel: 'Share of adults', bLabel: 'Share of coverage', slotA: 1, slotB: 2,
          format: 'pct1', sortBy: 'gap', labelWidth: 190,
          rows: [
            { id: 'young', label: 'Voters under 35', a: 0.238, b: 0.071 },
            { id: 'senior', label: 'Voters 65+', a: 0.226, b: 0.194 },
            { id: 'renters', label: 'Renters', a: 0.331, b: 0.118, gloss: 'Mostly in housing stories.' },
            { id: 'workers', label: 'Energy & union workers', a: 0.118, b: 0.162 }
          ]
        }
      },
      states: [
        { label: 'highlight one', state: { highlight: 'young' } },
        { label: 'sort by distance', state: { highlight: null, sortBy: 'absgap' } }
      ],
      fields: [
        ['rows', '[{ id, label, a, b, gloss? }]'],
        ['aLabel, bLabel, slotA, slotB', 'names and palette slots of the two dots'],
        ['sortBy', "'gap' (b − a) · 'absgap' · 'a' · 'b' · anything else keeps your order"],
        ['domain', '[min, max] to fix the axis'],
        ['labelWidth, rowHeight, format', 'layout and number format']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'heatmap', name: 'Heatmap matrix', use: 'Rows × columns, diverging around zero or sequential.',
      figure: {
        type: 'heatmap',
        title: 'Where each newsroom’s wording departs from the norm',
        subtitle: 'Standardised rate per 1,000 words · 0 = corpus mean',
        caption: 'Blue: below the corpus mean. Red: above it.',
        spec: {
          scale: 'diverging', format: 'sd', cellFormat: '+.2f',
          lowLabel: 'Below mean', highLabel: 'Above mean', labelWidth: 140,
          rows: [{ id: 'boreal', label: 'Radio Boréal' }, { id: 'matin', label: 'Le Matin Express' }, { id: 'signal', label: 'Signal' }],
          cols: [{ id: 'epi', label: 'Epistemological', gloss: 'Verbs that cast doubt on a claim.' }, { id: 'inten', label: 'Intensifiers' }, { id: 'metaph', label: 'Conflict metaphor' }],
          cells: [
            { row: 'boreal', col: 'epi', value: -0.42, n: 3100 }, { row: 'boreal', col: 'inten', value: -0.61, n: 3100 }, { row: 'boreal', col: 'metaph', value: -0.20, n: 3100 },
            { row: 'matin', col: 'epi', value: 0.35, n: 2400 }, { row: 'matin', col: 'inten', value: 0.88, n: 2400 }, { row: 'matin', col: 'metaph', value: 0.71, n: 2400 },
            { row: 'signal', col: 'epi', value: 1.12, n: 900 }, { row: 'signal', col: 'inten', value: 0.54, n: 900 }, { row: 'signal', col: 'metaph', value: 0.26, n: 900 }
          ]
        }
      },
      states: [
        { label: 'highlight a row', state: { highlightRow: 'matin', highlightCol: null } },
        { label: 'highlight a column', state: { highlightRow: null, highlightCol: 'epi' } }
      ],
      fields: [
        ['rows, cols', '[{ id, label }] — cols may carry gloss for the tooltip'],
        ['cells', '[{ row, col, value, n? }] — one per row × col'],
        ['scale', "'diverging' (default, centred on 0) or 'sequential'"],
        ['domain', '[min, max] — for diverging, max sets both ends'],
        ['cellFormat', "d3 format for the in-cell numbers, e.g. '+.2f' or '.0%'"],
        ['lowLabel, highLabel, midLabel', 'colour-scale legend']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'flow', name: 'Three-stage flow (sankey)', use: 'Where things go, in adjacent hops only, coloured by origin.',
      figure: {
        type: 'flow',
        title: 'From press release to print',
        subtitle: 'Campaign messages, how they were pushed, and whether they were reported',
        caption: 'Ribbon width = number of messages. Colour follows the message frame.',
        spec: {
          stages: ['Messages issued', 'How they were pushed', 'What happened next'],
          legend: [{ slot: 1, label: 'Economy' }, { slot: 2, label: 'Health' }],
          nodes: [
            { id: 'f-econ', stage: 0, label: 'Economy', value: 100, slot: 1 },
            { id: 'f-health', stage: 0, label: 'Health', value: 60, slot: 2 },
            { id: 'paid', stage: 1, label: 'Backed by ad spend', value: 90 },
            { id: 'organic', stage: 1, label: 'Organic only', value: 70 },
            { id: 'reported', stage: 2, label: 'Reported in news', value: 70 },
            { id: 'unreported', stage: 2, label: 'Never reported', value: 90 }
          ],
          links: [
            { source: 'f-econ', target: 'paid', value: 60, slot: 1, label: 'Economy' },
            { source: 'f-econ', target: 'organic', value: 40, slot: 1, label: 'Economy' },
            { source: 'f-health', target: 'paid', value: 30, slot: 2, label: 'Health' },
            { source: 'f-health', target: 'organic', value: 30, slot: 2, label: 'Health' },
            { source: 'paid', target: 'reported', value: 36, slot: 1, label: 'Economy' },
            { source: 'paid', target: 'unreported', value: 24, slot: 1, label: 'Economy' },
            { source: 'paid', target: 'reported', value: 12, slot: 2, label: 'Health' },
            { source: 'paid', target: 'unreported', value: 18, slot: 2, label: 'Health' },
            { source: 'organic', target: 'reported', value: 12, slot: 1, label: 'Economy' },
            { source: 'organic', target: 'unreported', value: 28, slot: 1, label: 'Economy' },
            { source: 'organic', target: 'reported', value: 10, slot: 2, label: 'Health' },
            { source: 'organic', target: 'unreported', value: 20, slot: 2, label: 'Health' }
          ]
        }
      },
      states: [
        { label: 'highlight one origin', state: { highlight: 1 } },
        { label: 'clear', state: { highlight: null } }
      ],
      fields: [
        ['stages', 'column headings, one per stage'],
        ['nodes', '[{ id, stage, label, value, slot? }] — stage 0, 1, 2…; slot only on stage 0'],
        ['links', '[{ source, target, value, slot, label }] — adjacent stages only; slot = origin colour'],
        ['legend', '[{ slot, label }]'],
        ['check', 'each node’s value should equal the sum of its links']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'slope', name: 'Slope chart', use: 'Before → after for a handful of rows.',
      figure: {
        type: 'slope',
        title: 'How a claim’s framing shifts on its way into print',
        subtitle: 'Tone of the actor’s statement vs the article · −1 hostile … +1 favourable',
        caption: 'Each line is one claim.',
        spec: {
          fromLabel: 'In the press release', toLabel: 'In the article', fromShort: 'Release', toShort: 'Article',
          format: 'num2', domain: [-1, 1],
          rows: [
            { id: 'c1', label: 'Tax cut “for families”', from: 0.62, to: 0.18, slot: 1 },
            { id: 'c2', label: 'Hospital wait times', from: -0.40, to: -0.52, slot: 2 },
            { id: 'c3', label: 'Pipeline jobs', from: 0.71, to: 0.44, slot: 4 }
          ]
        }
      },
      states: [{ label: 'highlight one', state: { highlight: 'c1' } }, { label: 'clear', state: { highlight: null } }],
      fields: [
        ['rows', '[{ id, label, from, to, slot, fromLabel?, toLabel? }]'],
        ['fromLabel, toLabel', 'tooltip / table names of the two ends'],
        ['fromShort, toShort', 'short column headings on the chart'],
        ['domain, format', 'fix the axis; number format'],
        ['leftWidth, rightWidth, showEndLabel', 'label gutters (px); append toLabel to the right label']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'network', name: 'Network graph', use: 'Who shares whom — outlets and accounts in up to three clusters.',
      figure: {
        type: 'network',
        title: 'Who passes the news on',
        subtitle: 'Accounts linked by sharing the same articles',
        caption: 'Circle area = volume of news sharing. Positions come from a force layout and carry no meaning of their own.',
        spec: {
          communities: [{ id: 'c1', label: 'Sovereignty-aligned', slot: 2 }, { id: 'c2', label: 'Federalist-aligned', slot: 1 }],
          nodes: [
            { id: 'o1', label: 'Herald', type: 'outlet', comm: 'c2', size: 26 },
            { id: 'o2', label: 'Signal', type: 'outlet', comm: 'c1', size: 26 },
            { id: 'a1', label: '@prairie_watch', type: 'account', comm: 'c1', size: 16, followers: 48000, reshares: 1210 },
            { id: 'a2', label: '@AB_sovereignty', type: 'account', comm: 'c1', size: 12, followers: 22000, reshares: 640 },
            { id: 'a3', label: '@fact_check_ca', type: 'account', comm: 'c2', size: 14, followers: 91000, reshares: 820 },
            { id: 'a4', label: '@northwind', type: 'account', comm: 'c2', size: 9, followers: 7000, reshares: 190 }
          ],
          links: [
            { source: 'a1', target: 'o2', value: 8 }, { source: 'a2', target: 'o2', value: 5 }, { source: 'a1', target: 'a2', value: 3 },
            { source: 'a3', target: 'o1', value: 7 }, { source: 'a4', target: 'o1', value: 4 }, { source: 'a3', target: 'o2', value: 1 }
          ]
        }
      },
      states: [
        { label: 'highlight a cluster', state: { highlight: 'c1', highlightNode: null } },
        { label: 'highlight one node', state: { highlight: null, highlightNode: 'a3' } }
      ],
      fields: [
        ['communities', '[{ id, label, slot }] — at most 3'],
        ['nodes', "[{ id, label, type: 'outlet' | 'account', comm, size, followers?, reshares? }] — size = diameter in px"],
        ['links', '[{ source, target, value }] — value sets line width']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'scatter', name: 'Scatter with trend line', use: 'Many points, an association, a fitted line.',
      figure: {
        type: 'scatter',
        title: 'Loaded language and engagement',
        subtitle: 'Each dot is one post that linked to a news article',
        caption: 'Line: least-squares fit on the visible points.',
        spec: {
          xLabel: 'Linguistic bias score', yLabel: 'Engagements', xFormat: 'num1', yFormat: 'num0', logY: true,
          pointName: 'Post', trendLabel: 'Fitted trend',
          groups: [{ id: 'c1', label: 'Sovereignty-aligned', slot: 2 }, { id: 'c2', label: 'Federalist-aligned', slot: 1 }],
          points: [
            [0.4, 12, 'c2'], [0.9, 30, 'c2'], [1.3, 22, 'c2'], [1.8, 60, 'c2'], [2.2, 45, 'c2'], [2.9, 120, 'c2'],
            [0.7, 18, 'c1'], [1.5, 55, 'c1'], [2.1, 140, 'c1'], [2.6, 210, 'c1'], [3.1, 380, 'c1'], [3.6, 520, 'c1']
          ].map(function (p, i) { return { id: 'p' + i, x: p[0], y: p[1], group: p[2] }; })
        }
      },
      states: [
        { label: 'highlight a group', state: { highlight: 'c1', groups: null } },
        { label: 'hide the trend', state: { highlight: null, trend: false } }
      ],
      fields: [
        ['points', '[{ id, x, y, group }]'],
        ['groups', '[{ id, label, slot }] — at most 3'],
        ['logY', 'true for a log y-axis (values must be > 0)'],
        ['xLabel, yLabel, xFormat, yFormat, pointName, trendLabel', 'labels and formats']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'diverging', name: 'Diverging stacked bars', use: 'Likert-style distributions centred on a neutral category.',
      figure: {
        type: 'diverging',
        title: 'How people replied',
        subtitle: 'Stance of replies, by type of post',
        caption: 'Bars are centred on the neutral category.',
        spec: {
          format: 'pct0', centreIndex: 2, labelWidth: 150,
          categories: ['Strongly against', 'Against', 'Neutral', 'For', 'Strongly for'],
          n: [1240, 860, 990],
          rows: [
            { id: 'news', label: 'Plain news link', values: [0.06, 0.14, 0.52, 0.19, 0.09] },
            { id: 'outrage', label: 'Outrage framing', values: [0.24, 0.21, 0.14, 0.18, 0.23] },
            { id: 'explainer', label: 'Explainer', values: [0.04, 0.11, 0.61, 0.17, 0.07] }
          ]
        }
      },
      states: [
        { label: 'highlight a row', state: { highlight: 'outrage', category: null } },
        { label: 'highlight a category', state: { highlight: null, category: 2 } }
      ],
      fields: [
        ['categories', 'ordered labels, negative → positive'],
        ['centreIndex', 'index of the neutral category'],
        ['rows', '[{ id, label, values }] — values line up with categories, sum to 1'],
        ['n', 'optional counts per row, shown in the tooltip']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'timeline', name: 'Lines over time (+ bands, events, volume panel)', use: 'Polls with uncertainty, with coverage volume in its own panel.',
      figure: {
        type: 'timeline',
        title: 'Polling average and coverage volume',
        subtitle: 'Alberta referendum · 95% interval shaded',
        caption: 'The lower panel is a separate scale: articles per day.',
        spec: {
          format: 'pctv', volumeLabel: 'Articles per day',
          days: days,
          series: [
            { id: 'yes', label: 'Yes', slot: 2, values: [44, 45, 45, 47, 46, 48, 49], lo: [42, 43, 43, 45, 44, 46, 47], hi: [46, 47, 47, 49, 48, 50, 51] },
            { id: 'no', label: 'No', slot: 1, values: [51, 50, 50, 48, 49, 47, 46], lo: [49, 48, 48, 46, 47, 45, 44], hi: [53, 52, 52, 50, 51, 49, 48] }
          ],
          volume: [120, 140, 135, 310, 220, 180, 260],
          events: [{ i: 3, label: 'Debate' }]
        }
      },
      states: [
        { label: 'mark an event', state: { marker: 3, highlight: null } },
        { label: 'highlight a line', state: { marker: null, highlight: 'yes' } },
        { label: 'hide band + volume', state: { highlight: null, showBand: false, showVolume: false } }
      ],
      fields: [
        ['days', "[{ i, label }] — or x: [-5, -4, … ] for 'days from event' axes"],
        ['series', '[{ id, label, slot, values, lo?, hi? }] — lo/hi draw the band'],
        ['volume, volumeLabel', 'optional second panel (its own scale, never a second axis)'],
        ['events', '[{ i, label }] — vertical rules'],
        ['zeroLine, domain, format', 'draw y = 0; fix the axis; number format']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'radar', name: 'Radar profile', use: 'Two or three profiles across 5–8 dimensions scaled 0–1.',
      figure: {
        type: 'radar',
        title: 'Two campaigns, one fingerprint?',
        subtitle: 'Eight coverage measures, each scaled 0–1 within the study',
        caption: 'Each axis is scaled 0–1 within this study.',
        spec: {
          domain: [0, 1],
          axes: ['Horse-race framing', 'Conflict metaphor', 'Leader focus', 'Policy depth', 'Quoted citizens', 'Negativity'],
          series: [
            { id: 'qc', label: 'Quebec election', slot: 1, values: [0.78, 0.62, 0.81, 0.35, 0.22, 0.55] },
            { id: 'ab', label: 'Alberta referendum', slot: 2, values: [0.41, 0.70, 0.38, 0.52, 0.31, 0.63] }
          ]
        }
      },
      states: [{ label: 'highlight one', state: { highlight: 'ab' } }, { label: 'clear', state: { highlight: null } }],
      fields: [
        ['axes', 'dimension labels (long ones wrap onto two lines)'],
        ['series', '[{ id, label, slot, values }] — values line up with axes'],
        ['domain', 'default [0, 1]']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'headlines', name: 'Annotated headlines (HTML)', use: 'Close reading: the same event in several newsrooms, with coded spans.',
      figure: {
        type: 'headlines',
        title: 'One event, three headlines',
        subtitle: 'Underlined spans are coded bias markers — hover for the reason',
        caption: 'Source ids must exist in js/content/_entities.js (sources).',
        spec: {
          sets: [{
            id: 'debate', label: 'Leaders’ debate',
            facts: 'A 120-minute televised debate. No new policy announced.',
            headlines: [
              { source: 'fil', text: 'Five leaders meet in only televised debate of the campaign', spans: [] },
              { source: 'matin', text: 'Marchand crushes rivals in fiery debate showdown',
                spans: [{ t: 'crushes', dim: 'metaph', note: 'Combat verb for a debate performance.' },
                        { t: 'fiery', dim: 'inten', note: 'Subjective intensifier.' }] },
              { source: 'herald', text: 'Roy admits costing gap under questioning',
                spans: [{ t: 'admits', dim: 'epi', note: '“Admits” presumes the claim is true and damaging.' }] }
            ]
          }]
        }
      },
      states: [
        { label: 'focus one source', state: { focus: 'matin', dim: null } },
        { label: 'isolate one dimension', state: { focus: null, dim: 'epi' } },
        { label: 'clear', state: { focus: null, dim: null } }
      ],
      fields: [
        ['sets', '[{ id, label, facts, headlines }] — several sets can be switched with setId'],
        ['headlines', '[{ source, text, spans }] — source = a source id from _entities.js'],
        ['spans', '[{ t, dim, note }] — t must appear verbatim in text; dim = a biasDims id'],
        ['states', 'setId · focus (source id) · dim (biasDims id) · showNotes: false · lock: true']
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'imagegrid', name: 'Coded photo grid (HTML)', use: 'Press photographs drawn as glyphs from their codes.',
      figure: {
        type: 'imagegrid',
        title: 'How the leaders were photographed',
        subtitle: 'Each tile is one coded press photograph',
        caption: 'Tiles are drawn from the codes, not the photos. Up to 24 are shown; percentages use all matches.',
        spec: {
          images: [
            ['matin', 'cn', 'Élise Marchand', 'Low (looking up)', 'Close-up', 'Positive', 'Podium', 0.4],
            ['matin', 'ms', 'Amina Ouellet', 'High (looking down)', 'Wide', 'Negative', 'Crowd', -0.3],
            ['boreal', 'cn', 'Élise Marchand', 'Eye level', 'Medium', 'Neutral', 'Institutional', 0.1],
            ['boreal', 'ms', 'Amina Ouellet', 'Eye level', 'Medium', 'Positive', 'Candid', 0.2],
            ['signal', 'pld', 'David Roy', 'High (looking down)', 'Close-up', 'Negative', 'Candid', -0.5],
            ['herald', 'pld', 'David Roy', 'Eye level', 'Wide', 'Neutral', 'Podium', 0.0]
          ].map(function (r, i) {
            return { id: 'img' + i, source: r[0], actor: r[1], actorLabel: r[2], angle: r[3], shot: r[4], expr: r[5], set: r[6], congruence: r[7] };
          })
        }
      },
      states: [
        { label: 'code: expression', state: { code: 'expr', source: null } },
        { label: 'one source', state: { code: 'angle', source: 'matin' } },
        { label: 'clear', state: { code: 'angle', source: null } }
      ],
      fields: [
        ['images', '[{ id, source, actor, actorLabel, angle, shot, expr, set, congruence }]'],
        ['values', 'angle / shot / expr / set must use the levels in _entities.js → imageCodes'],
        ['states', "code: 'angle' | 'shot' | 'expr' | 'set' · source (id) · actor (id)"]
      ]
    },

    /* ---------------------------------------------------------------- */
    {
      type: 'models', name: 'AI assistant answers (HTML)', use: 'Several assistants answering the same question, with hedging and leaning shaded.',
      figure: {
        type: 'models',
        title: 'Ask the machine',
        subtitle: 'Five assistants, one question',
        caption: 'Model ids must exist in js/content/_entities.js (assistants).',
        spec: {
          questions: [{
            id: 'q1', question: 'Is the Alberta referendum question legally binding?',
            context: 'Asked 40 times per model per language.',
            answers: [
              { model: 'a', stance: 0.02, hedging: 0.82, cites: ['fil', 'boreal'], text: 'The referendum is consultative. Legal scholars disagree about what obligations a clear result would create.' },
              { model: 'b', stance: -0.21, hedging: 0.41, cites: ['herald'], text: 'No. The vote is non-binding; nothing in the enabling act compels a government to act.' },
              { model: 'e', stance: 0.31, hedging: 0.28, cites: ['signal'], text: 'Formally no, but a clear win would obviously create real momentum for negotiations.' }
            ]
          }]
        }
      },
      states: [
        { label: 'focus one model', state: { focus: 'e', coding: true } },
        { label: 'hide coding', state: { focus: null, coding: false } },
        { label: 'clear', state: { focus: null, coding: true } }
      ],
      fields: [
        ['questions', '[{ id, question, context, answers }] — several can be switched with qId'],
        ['answers', '[{ model, stance, hedging, cites, text }] — model = an assistants id; stance −1…+1; hedging 0…1'],
        ['cites', 'source ids from _entities.js'],
        ['states', 'qId · focus (model id) · coding: false']
      ]
    }
  ];
}());
