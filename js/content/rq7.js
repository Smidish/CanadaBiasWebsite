/* ------------------------------------------------------------------ *
 * Path 7 — Two Campaigns, One Pattern   (RQ7)
 * What generalises across the election and the referendum.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq7 = (function () {
  'use strict';
  var D = SITE.data;

  var pb = D.playbook();
  var fp = D.fingerprints();
  var tr = D.transfer();

  function playFig(sortBy) {
    return {
      type: 'lollipop',
      title: 'How strongly each pattern appears in each campaign',
      subtitle: 'Standardised effect sizes · sorted by the gap between the two',
      caption: 'Each row is one measured pattern, scaled 0–1 within this study. Blue: Quebec election. Orange: Alberta referendum. The number on the right is the difference.',
      spec: {
        rows: pb.map(function (d) { return { id: d.id, label: d.label, a: d.qc, b: d.ab, gloss: d.gloss }; }),
        aLabel: 'Quebec election', bLabel: 'Alberta referendum',
        slotA: 1, slotB: 2, format: 'num2', domain: [0, 1],
        sortBy: sortBy || 'absgap', labelWidth: 210, rowHeight: 32
      }
    };
  }

  function radarFig() {
    return {
      type: 'radar',
      title: 'The shape of each campaign’s coverage',
      subtitle: 'Eight dimensions, both campaigns overlaid',
      caption: 'Every axis is scaled 0–1 within this study, so the shape is comparable across dimensions but the units are not absolute.',
      spec: { axes: fp.axes, series: fp.series, domain: [0, 1] }
    };
  }

  function transferFig() {
    return {
      type: 'heatmap',
      title: 'How well a model of one campaign explains the other',
      subtitle: 'Share of variance recovered · higher is more transferable',
      caption: 'Each cell fits a model on the first campaign and scores it on the second. The two “within” columns are the ceiling: how well each campaign explains itself.',
      spec: {
        rows: tr.rows, cols: tr.cols, cells: tr.cells,
        scale: 'sequential', domain: [0.2, 0.9], format: 'num2', cellFormat: '.2f',
        lowLabel: '0.20', highLabel: '0.90', labelWidth: 170
      }
    };
  }

  var sorted = pb.slice().sort(function (a, b) { return Math.abs(b.qc - b.ab) - Math.abs(a.qc - a.ab); });
  var biggestGap = sorted[0];
  var mostShared = pb.slice().sort(function (a, b) { return Math.abs(a.qc - a.ab) - Math.abs(b.qc - b.ab); })[0];
  var lingCross = tr.cells.filter(function (c) { return c.row === 'ling' && c.col === 'qc2ab'; })[0].value;
  var uptkCross = tr.cells.filter(function (c) { return c.row === 'uptk' && c.col === 'qc2ab'; })[0].value;

  /* ══ CONTENT · Path header ══════════════════════════════════════════
     Edit: name · standfirst · rqText. The hub’s door text for this path
     lives in _manifest.js. id / n / accent / rqId are wiring — leave them.
     Everything above this line is data plumbing (figure builders and the
     headline numbers computed from _data.js), not copy. ══ */
  return {
    id: 'rq7', n: 7, accent: 5, rqId: 'RQ7',
    name: 'Two Campaigns, One Pattern',
    standfirst: 'One province chose a government. The other answered a question. If the same patterns show up in ' +
                'both, they are probably about how coverage gets made — not about what was on the ballot.',
    rqText: 'Which patterns of topics, actor visibility, linguistic bias, and textual and visual framing are shared across the Quebec election and Alberta referendum, and which are specific to each event?',

    routes: [
      /* ══ CONTENT · Route 7A ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r7a', tag: 'Route 7A', name: 'The shared playbook',
        blurb: 'Ten patterns, measured the same way in both campaigns, sorted by how far apart they land.',
        figKind: 'Dumbbell · sortable',
        opening: '<p>Every pattern in this study, standardised so the two campaigns can sit on one scale. ' +
                 'Rows where the two dots almost touch are the shared playbook. Rows where they fly apart are ' +
                 'where the contest itself made the difference.</p>',
        stat: { value: mostShared.label, caption: 'is the most consistent pattern across both campaigns — the two measurements differ by less than ' + Math.abs(mostShared.qc - mostShared.ab).toFixed(2) + '.' },
        scrolly: {
          side: 'right',
          figure: playFig('absgap'),
          steps: [
            { title: 'Start at the bottom, where they agree',
              html: '<p>The tabloid intensifier gap, the final-week attention collapse, the under-35 coverage ' +
                    'deficit — all measured within a few hundredths of each other in two different provinces, ' +
                    'two different questions, two different languages.</p>' +
                    '<p>These look like properties of campaign coverage, not of these campaigns.</p>',
              state: {} },
            { title: 'Now the top',
              html: '<p><b>' + biggestGap.label + '</b> is the widest gap in the study.</p>' +
                    '<p class="small">' + biggestGap.gloss + '</p>',
              state: { highlight: biggestGap.id } },
            { title: 'Third parties have room in a referendum',
              html: '<p>Advocacy-organisation uptake is roughly three times higher in Alberta than in Quebec.</p>' +
                    '<p>An election has five parties competing for the same microphone. A referendum has two camps ' +
                    'and a gap that outside organisations can walk into.</p>',
              state: { highlight: 'advocacy' } },
            { title: 'Identity polarisation is Quebec’s',
              html: '<p>Cross-source dispersion on identity issues is nearly three times higher in the election.</p>' +
                    '<p>That is not a finding about newsrooms. It is a finding about what the two campaigns were about.</p>',
              state: { highlight: 'identity' } },
            { title: 'Sort by the campaigns instead',
              html: '<p>Sorting by Quebec, then by Alberta, shows the same ten patterns ranked by strength rather ' +
                    'than by difference — a useful check that the gaps are not an artefact of the ordering.</p>',
              state: { highlight: null, sortBy: 'a' } }
          ]
        },
        explorer: {
          title: 'Re-sort it',
          text: 'Hover any row for the definition of the pattern and both values. Sorting by gap answers ' +
                '“what differs”; sorting by a campaign answers “what mattered there”.',
          controls: [
            { id: 'sort', label: 'Sort by', type: 'switch', value: 'absgap',
              options: [{ value: 'absgap', label: 'Gap' }, { value: 'a', label: 'Quebec' }, { value: 'b', label: 'Alberta' }] }
          ],
          figure: playFig('absgap'),
          apply: function (v) { return { state: { sortBy: v.sort } }; }
        },
        takeaway: '<p>Two cases is two cases. Everything on this page is a <b>comparison, not a generalisation</b> — ' +
                  'a pattern that holds in Quebec and Alberta in the same season may be about Canadian media in 2026 ' +
                  'rather than about campaigns.</p>' +
                  '<p>The standardisation also hides absolute size. Two dots close together mean the pattern was ' +
                  'similarly strong <i>relative to this study’s range</i>, not that the same number of articles was involved.</p>'
      },

      /* ══ CONTENT · Route 7B ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r7b', tag: 'Route 7B', name: 'Fingerprints',
        blurb: 'Fold the whole study into one shape per campaign and put them on top of each other.',
        figKind: 'Radial profile · two series',
        opening: '<p>Eight dimensions, one closed shape per campaign. This is the compressed version of everything ' +
                 'in the previous six paths — useful for seeing the overall form, useless for reading a precise value.</p>',
        stat: { value: '2 of 8', caption: 'dimensions on which the two campaigns differ by more than 0.15. On the other six, the shapes nearly coincide.' },
        scrolly: {
          side: 'left',
          figure: radarFig(),
          steps: [
            { title: 'Two shapes, mostly overlapping',
              html: '<p>The first impression is the finding: these two campaigns were covered in broadly the ' +
                    'same shape.</p><p>Now look at where the outlines separate.</p>',
              state: {} },
            { title: 'Quebec’s lobe',
              html: '<p>The election runs higher on attention concentration, tone dispersion and quote asymmetry — ' +
                    'the dimensions that need several competing actors to exist at all.</p>',
              state: { highlight: 'qc' } },
            { title: 'Alberta’s lobe',
              html: '<p>The referendum runs higher on conflict framing, visual asymmetry, social amplification and ' +
                    'AI divergence.</p><p>A binary question produces binary coverage — and, apparently, more divergent machines.</p>',
              state: { highlight: 'ab' } },
            { title: 'Both together',
              html: '<p>Hover any axis for both values. The overlap is the part of this study that might survive ' +
                    'contact with a third campaign.</p>',
              state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Read the axes',
          text: 'Hover near any spoke for both campaigns’ values on that dimension, or open the table view for all sixteen numbers.',
          controls: [],
          figure: radarFig()
        },
        takeaway: '<p>Radial charts flatter whoever is on the outside and make area look like importance. ' +
                  '<b>Use this one for shape and the table view for values.</b></p>' +
                  '<p>The eight dimensions are also not independent — conflict framing and visual asymmetry move ' +
                  'together — so the enclosed area double-counts. That is why there is no total.</p>'
      },

      /* ══ CONTENT · Route 7C ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r7c', tag: 'Route 7C', name: 'What transfers',
        blurb: 'The strict test: fit a model on one campaign, score it on the other, and see what survives.',
        figKind: 'Heatmap · sequential scale',
        opening: '<p>Similar shapes are suggestive. This is the harder question: if you learned the rules of ' +
                 'coverage from one campaign, how much of the other one could you predict?</p>' +
                 '<p>The two “within” columns are the ceiling — how well each campaign explains itself.</p>',
        stat: { value: lingCross.toFixed(2), caption: 'of the variance in linguistic bias transfers from Quebec to Alberta — the most portable measure in the study. Message uptake manages ' + uptkCross.toFixed(2) + '.' },
        scrolly: {
          side: 'right',
          figure: transferFig(),
          steps: [
            { title: 'Read the within columns first',
              html: '<p>Columns one and three are each campaign predicting itself. Nothing in the cross columns ' +
                    'can beat these, and how far below them a cell sits is the real measure of transfer.</p>',
              state: {} },
            { title: 'Linguistic bias travels',
              html: '<p>The wording row is the darkest across both cross columns. A model of how a tabloid writes ' +
                    'in Quebec predicts how a tabloid writes in Alberta almost as well as it predicts Quebec.</p>' +
                    '<p>Style is a property of the outlet, not of the story.</p>',
              state: { highlightRow: 'ling' } },
            { title: 'Message uptake does not',
              html: '<p>The uptake row is the lightest. What gets picked up depends on the shape of the contest, ' +
                    'who the actors are, and what else happened that week.</p>' +
                    '<p>Knowing Quebec buys you very little in Alberta here.</p>',
              state: { highlightRow: 'uptk' } },
            { title: 'Topic emphasis is in between',
              html: '<p>Topics transfer better than uptake and worse than wording — which makes sense: some issues ' +
                    '(cost of living, health care) are everywhere, and some are entirely local.</p>',
              state: { highlightRow: 'topic' } },
            { title: 'Direction matters',
              html: '<p>Compare the two cross columns against each other. Alberta → Quebec is consistently slightly ' +
                    'weaker than Quebec → Alberta, because the election has more actors and more variance to explain.</p>',
              state: { highlightRow: null, highlightCol: 'ab2qc' } }
          ]
        },
        explorer: {
          title: 'The whole matrix',
          text: 'Hover any cell for its exact value. The table view gives you all twenty-four numbers at once.',
          controls: [],
          figure: transferFig()
        },
        takeaway: '<p>Transfer is measured between <b>two campaigns that ran simultaneously in one country</b>, ' +
                  'covered partly by the same outlets. That is the easiest possible transfer test, and the numbers ' +
                  'here should be read as an upper bound.</p>' +
                  '<p>Variance recovered also rewards measures that are stable for boring reasons. Linguistic bias ' +
                  'transfers well partly because outlets have house styles that barely move — which is a real finding ' +
                  'and a less exciting one than it looks.</p>'
      }
    ],

    /* ══ CONTENT · Path ending ══ Edit: closing.title · closing.text · next[].why ══ */
    closing: {
      title: 'That is the whole study. What you make of it is the part we cannot do.',
      text: 'Nothing here tells you which newsroom to trust, which party was treated unfairly, or how to vote. ' +
            'It tells you what was measured, how it was measured, and where the measurement stops being reliable. ' +
            'The arguing is yours.'
    },
    next: [
      { rq: 1, why: 'Start again at the beginning, now that you know what the measures mean.' },
      { rq: 6, why: 'The newest measure in the study, and the least stable one.' }
    ]
  };
}());
