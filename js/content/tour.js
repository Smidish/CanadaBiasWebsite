/* ------------------------------------------------------------------ *
 * tour.js — the default path.
 * Seven beats, one headline result per research question, ordered as a
 * story rather than by number. Every beat opens a door into its path.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.TOUR = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  var fwAll = D.finalWeek('qc', 'all');
  var top2 = Math.round(fwAll[0].value + fwAll[1].value);
  var up = D.uptake('qc');
  var best = up.slice().sort(function (a, b) { return b.value - a.value; })[0];
  var lagQ = D.lagCorrelation('qc');
  var peak = lagQ.slice().sort(function (a, b) { return b.value - a.value; })[0];
  var pb = D.playbook();
  var mostShared = pb.slice().sort(function (a, b) { return Math.abs(a.qc - a.ab) - Math.abs(b.qc - b.ab); })[0];

  return {
    beats: [
      /* ---- 1 ---- */
      {
        rq: 1, title: 'Attention is finite, and it narrows',
        opening: '<p>Forty-one days of the Quebec campaign, every actor’s share of the mentions stacked up the side. ' +
                 'Watch what the last week does to the bottom three bands.</p>',
        figure: {
          type: 'stream',
          title: 'Share of campaign mentions, by day',
          subtitle: 'Quebec general election · all eight sources combined',
          caption: 'Each band is one actor’s share of all actor mentions that day.',
          spec: (function () { var v = D.visibility('qc', 'all'); return { days: v.days, series: v.series, format: 'pct0' }; }())
        },
        steps: [
          { title: 'Five parties, one budget',
            html: '<p>Two parties hold about half the attention from day one. The other three share what is left.</p>',
            state: {} },
          { title: 'Events move it, briefly',
            html: '<p>A costing row on day 17, the leaders’ debate on day 23. Both lift the parties that were already leading.</p>',
            state: { annotate: [{ i: 17, label: 'Costing row' }, { i: 23, label: 'Debate' }] } },
          { title: 'Then the field collapses',
            html: '<p>In the final week <b class="num">' + top2 + '%</b> of mentions go to two names — in every ' +
                  'newsroom we measured. If you decided late, that was the menu.</p>',
            state: { annotate: [{ i: 34, label: 'Final week' }] } }
        ],
        deeper: 'Switch newsrooms and watch the same campaign change shape — then map which issues the sources disagreed about most.'
      },

      /* ---- 2 ---- */
      {
        rq: 2, title: 'One event. Seven ways to announce it.',
        opening: '<p>A 120-minute debate. Health care, immigration, taxes. No new policy announced. Here is how ' +
                 'seven newsrooms told readers it had happened.</p>',
        figure: {
          type: 'headlines',
          title: 'One event, seven headlines',
          subtitle: 'Underlined spans are coded bias markers — hover for the reason',
          caption: 'Headlines are written for the prototype; the coding scheme is the one used throughout the study.',
          spec: { sets: D.headlineSets() }
        },
        steps: [
          { title: 'The wire is the control',
            html: '<p>Fil Public writes copy other newsrooms can run unedited, so it strips evaluation out. ' +
                  'No coded spans at all.</p><p>Everything the other six added, they chose to add.</p>',
            state: { setId: 'debate', focus: 'fil' } },
          { title: '“Says”, “claims”, “insists”',
            html: '<p>Verbs that report speech also rate it. “Claims” withholds endorsement in a way “says” does not.</p>',
            state: { setId: 'debate', focus: null, dim: 'epi' } },
          { title: 'And the fight frame',
            html: '<p>Spar, clash, real winner. Four of seven headlines turned a policy debate into a contest ' +
                  'with a scoreboard.</p>',
            state: { setId: 'debate', focus: null, dim: 'metaph' } }
        ],
        deeper: 'Take the close reading apart span by span, then see the same signatures across 14,000 articles — and in the photographs.'
      },

      /* ---- 3 ---- */
      {
        rq: 3, title: 'The message that money could not buy',
        opening: '<p>Campaigns issue thousands of distinct claims. Only some are echoed in news coverage. ' +
                 'Advertising spend predicts it much less well than you would expect.</p>',
        figure: {
          type: 'bars',
          title: 'Uptake rate by message, against share of ad spend',
          subtitle: 'Quebec general election · nine campaign messages',
          caption: 'Bar: share of the message’s appearances echoed in news within 72 hours. Black tick: its share of the campaign’s ad spend.',
          spec: {
            rows: up.map(function (d) {
              return { id: d.id, label: d.label, full: d.label + ' — ' + d.actorLabel, value: d.value,
                       spend: d.spend, slot: d.slot, actorLabel: d.actorLabel, note: 'Pushed by ' + d.actorLabel };
            }),
            format: 'pct0', reference: 'spend', referenceName: 'Share of ad spend',
            valueName: 'Uptake rate', labelWidth: 210, rowHeight: 34
          }
        },
        steps: [
          { title: 'Bar is coverage, tick is money',
            html: '<p>Where the black tick sits far to the right of the bar, a campaign paid heavily for a message ' +
                  'that newsrooms did not pick up.</p>', state: {} },
          { title: 'The cheapest message won',
            html: '<p>“' + best.label.replace(/[“”]/g, '') + '” led the board on a modest share of the budget. ' +
                  'It was specific, contestable, and gave rivals something to answer.</p>',
            state: { highlight: best.id } },
          { title: 'And the bottom of the list',
            html: '<p>Advocacy organisations barely register in an election — though in the Alberta referendum, ' +
                  'they do roughly three times better.</p>', state: { highlight: null } }
        ],
        deeper: 'Follow every message through the funnel from campaign channel to advertisement to news page — and watch how the framing changes on the way.'
      },

      /* ---- 4 ---- */
      {
        rq: 4, title: 'Loaded posts travel further. A bit.',
        opening: '<p>Once a story leaves the newsroom it enters a second distribution system with no editors and a ' +
                 'live scoreboard. We scored 260 posts sharing campaign coverage on the same bias dimensions used ' +
                 'for the newspapers.</p>',
        figure: {
          type: 'scatter',
          title: 'Linguistic bias of a post against the engagement it received',
          subtitle: '260 posts · engagement on a log scale',
          caption: 'Each dot is one post. The line is an ordinary least-squares fit on the visible points.',
          spec: (function () {
            var be = D.biasEngagement(), net = D.ampNetwork();
            return {
              points: be.map(function (d) { return { id: d.id, x: d.bias, y: d.engagement, group: d.comm }; }),
              groups: net.communities.map(function (c) { return { id: c.id, label: c.label, slot: c.slot }; }),
              xLabel: 'Linguistic bias of the post', yLabel: 'Reshares per 1,000 followers',
              xFormat: 'num1', yFormat: 'num0', logY: true, pointName: 'Post'
            };
          }())
        },
        steps: [
          { title: 'Look at the spread first',
            html: '<p>At every level of bias there are posts that went nowhere and posts that went everywhere. ' +
                  'Whatever the trend is, it is not destiny.</p>', state: { trend: false } },
          { title: 'Now the line',
            html: '<p>It slopes up. More loaded wording is associated with more engagement — modestly, and with ' +
                  'enormous scatter around it.</p>', state: { trend: true } },
          { title: 'Not in every cluster',
            html: '<p>In the civic cluster the relationship nearly disappears. Audience composition matters at least ' +
                  'as much as wording.</p>', state: { trend: true, highlight: 'c3' } }
        ],
        deeper: 'See who the amplifiers actually are, how the clusters separate, and what the replies said back.'
      },

      /* ---- 5 ---- */
      {
        rq: 5, title: 'Coverage moved first — probably',
        opening: '<p>The most tempting chart in political journalism is two lines that move together. Here is the ' +
                 'careful version: coverage tone correlated against polling change at every lag from −14 to +14 days.</p>',
        figure: {
          type: 'columns',
          title: 'Coverage tone against subsequent change in polling',
          subtitle: 'Quebec general election · lags of −14 to +14 days',
          caption: 'Negative lags mean coverage moved first. Whiskers are 95% intervals.',
          spec: {
            rows: lagQ.map(function (d) {
              return { id: 'l' + d.lag, k: d.lag, label: (d.lag > 0 ? '+' : '') + d.lag + ' days', value: d.value, ci: d.ci };
            }),
            format: 'corr', xLabel: 'Lag in days — negative means coverage moved first', valueName: 'Correlation'
          }
        },
        steps: [
          { title: 'The whole curve, not the peak',
            html: '<p>One correlation is easy to cherry-pick. A clean single hump across 29 lags is harder.</p>',
            state: {} },
          { title: 'It sits on the left',
            html: '<p>The strongest association is at <b class="num">' + peak.lag + ' days</b> — coverage leading ' +
                  'polling change. The right-hand side is nearly flat.</p>', state: { band: [-14, -1] } },
          { title: 'And it is not causation',
            html: '<p>Both series can be responding to the same unobserved event, with coverage reacting faster ' +
                  'because publishing is faster than polling. This design cannot separate the two.</p>',
            state: { band: null, highlight: 'l' + peak.lag } }
        ],
        deeper: 'Line the polling up against coverage volume day by day, then watch what prediction markets did around the four biggest shocks.'
      },

      /* ---- 6 ---- */
      {
        rq: 6, title: 'And what did the machines say?',
        opening: '<p>A growing share of “what is going on in this election” gets answered by a model. We asked five ' +
                 'of them the same questions, forty times each, in two languages, and coded the answers the same way ' +
                 'we coded the newspapers.</p>',
        figure: {
          type: 'models',
          title: 'Five assistants, one campaign question',
          subtitle: 'Modal answer over 40 repetitions · stance and hedging coded',
          caption: 'Shading marks coded spans: hedging and leaning.',
          spec: { questions: D.modelAnswers() }
        },
        steps: [
          { title: 'A question with a factual core',
            html: '<p>“Is the Alberta referendum question legally binding?” has a defensible legal answer and a ' +
                  'genuinely contested implication. Watch which assistants separate the two.</p>',
            state: { qId: 'q1', focus: null } },
          { title: 'The careful one and the confident one',
            html: '<p>One states the legal position and stops. Another answers the political question the reader ' +
                  'probably meant — in one direction.</p><p>Neither is false. They are different products.</p>',
            state: { qId: 'q1', focus: 'e' } },
          { title: 'The horse race splits them widest',
            html: '<p>On “who is winning?”, one assistant refuses the premise and gives the historical polling error ' +
                  'instead. If you asked one assistant, you got one campaign.</p>',
            state: { qId: 'q3', focus: null } }
        ],
        deeper: 'Compare the answers in English and French, and see which outlets each assistant chose to cite.'
      },

      /* ---- 7 ---- */
      {
        rq: 7, title: 'And what holds across both?',
        opening: '<p>An election and a referendum, running in the same five weeks in two provinces. If a pattern ' +
                 'shows up in both, it is probably about how coverage gets made rather than what was on the ballot.</p>',
        figure: {
          type: 'lollipop',
          title: 'How strongly each pattern appears in each campaign',
          subtitle: 'Standardised effect sizes · sorted by the gap',
          caption: 'Blue: Quebec election. Orange: Alberta referendum. The number on the right is the difference.',
          spec: {
            rows: pb.map(function (d) { return { id: d.id, label: d.label, a: d.qc, b: d.ab, gloss: d.gloss }; }),
            aLabel: 'Quebec election', bLabel: 'Alberta referendum',
            slotA: 1, slotB: 2, format: 'num2', domain: [0, 1], sortBy: 'absgap', labelWidth: 210, rowHeight: 32
          }
        },
        steps: [
          { title: 'The bottom of the list is the shared playbook',
            html: '<p>Tabloid intensifiers, the final-week attention collapse, the under-35 coverage deficit — ' +
                  'measured within a few hundredths of each other in two provinces and two languages.</p>', state: {} },
          { title: 'The most consistent pattern of all',
            html: '<p><b>' + mostShared.label + '</b> differs by less than ' +
                  '<b class="num">' + Math.abs(mostShared.qc - mostShared.ab).toFixed(2) + '</b> between the two campaigns.</p>',
            state: { highlight: mostShared.id } },
          { title: 'And the top is what the contest did',
            html: '<p>Third-party message uptake and identity polarisation fly apart — because one campaign had ' +
                  'five parties and the other had two camps and a question.</p>', state: { highlight: null } }
        ],
        deeper: 'See both campaigns as overlaid profiles, then run the strict test: fit a model on one and score it on the other.'
      }
    ]
  };
}());
