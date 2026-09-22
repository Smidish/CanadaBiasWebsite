/* ------------------------------------------------------------------ *
 * Path 5 — Coverage and the Polls   (RQ5)
 * Topics, visibility, bias and framing against polling and markets.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq5 = (function () {
  'use strict';
  var D = SITE.data;

  function pollFig(eventId) {
    var p = D.polls(eventId);
    return {
      type: 'timeline',
      title: 'Polling estimates and daily coverage volume',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · 41 campaign days',
      caption: 'Upper panel: poll estimates with 95% intervals. Lower panel: articles published per day across all eight sources. Two measures, two panels, never two scales on one plot.',
      spec: {
        days: p.days, series: p.series, volume: p.volume, events: p.events,
        volumeLabel: 'Articles per day', format: 'num1',
        domain: eventId === 'qc' ? [0, 42] : [0, 60]
      }
    };
  }

  function lagFig(eventId) {
    var l = D.lagCorrelation(eventId);
    return {
      type: 'columns',
      title: 'Coverage tone against subsequent change in polling',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · lags of −14 to +14 days',
      caption: 'Each bar is the correlation between coverage tone on one day and the change in polling k days later. Negative lags mean coverage moved first. Whiskers are 95% intervals.',
      spec: {
        rows: l.map(function (d) {
          return { id: 'l' + d.lag, k: d.lag, label: (d.lag > 0 ? '+' : '') + d.lag + ' days', value: d.value, ci: d.ci };
        }),
        format: 'corr', xLabel: 'Lag in days — negative means coverage moved first',
        valueName: 'Correlation',
        negLabel: 'Negative correlation', posLabel: 'Positive correlation'
      }
    };
  }

  function esFig(eventId) {
    var e = D.eventStudy(eventId);
    return {
      type: 'timeline',
      title: 'Prediction-market price around each coverage shock',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · percentage points from the pre-shock level',
      caption: 'Day 0 is the shock. Each line is one event, indexed to its own five-day pre-shock average, so all four sit on one common scale.',
      spec: {
        x: e.window, series: e.series, format: 'num1', zeroLine: true,
        events: [{ i: 0, label: 'Shock' }], domain: [-6, 8]
      }
    };
  }

  var lagQ = D.lagCorrelation('qc');
  var peak = lagQ.slice().sort(function (a, b) { return b.value - a.value; })[0];
  var polls = D.polls('qc');
  var volPeak = Math.max.apply(null, polls.volume);
  var volMed = polls.volume.slice().sort(function (a, b) { return a - b; })[Math.floor(polls.volume.length / 2)];

  return {
    id: 'rq5', n: 5, accent: 8, rqId: 'RQ5',
    name: 'Coverage and the Polls',
    standfirst: 'This is the path where it is easiest to say something false. Two lines that move together are the ' +
                'most persuasive picture in journalism and the weakest evidence in statistics. Proceed carefully — we will.',
    rqText: 'How do changes in topics, actor visibility, linguistic bias, and framing relate over time to changes in polling estimates and prediction-market prices?',

    routes: [
      /* ---------------------------------------------------------- 5A */
      {
        id: 'r5a', tag: 'Route 5A', name: 'The race and the coverage',
        blurb: 'Put the polling and the volume of coverage on the same timeline and mark what happened.',
        figKind: 'Two panels · shared time axis',
        opening: '<p>The upper panel is the polling, with its uncertainty drawn rather than hidden. The lower panel ' +
                 'is how much was published each day. They share a time axis and nothing else — deliberately. ' +
                 'Two measures on one y-axis would invent a relationship neither of them has.</p>',
        stat: { value: Math.round(volPeak / volMed * 10) / 10 + '×', caption: 'the busiest news day of the Quebec campaign, relative to a typical one. It was the day of the leaders’ debate.' },
        scrolly: {
          side: 'right',
          figure: pollFig('qc'),
          steps: [
            { title: 'Start with the bands, not the lines',
              html: '<p>Each shaded band is a 95% interval. For most of this campaign the top two lines overlap ' +
                    'inside their own uncertainty.</p>' +
                    '<p>“A narrow lead” and “a statistical tie” are the same picture described two ways.</p>',
              state: {} },
            { title: 'The coverage spikes are events',
              html: '<p>The lower panel has three clear peaks, and all three are marked: the costing row, the debate, ' +
                    'and the final-week surge.</p><p>Coverage volume tracks the campaign calendar almost perfectly. ' +
                    'That part is not interesting — it is what the calendar is for.</p>',
              state: { marker: 23 } },
            { title: 'Now watch the second party',
              html: '<p>Follow the line that gains over the last fortnight. Its rise begins before the final-week ' +
                    'coverage surge, not after it.</p>',
              state: { highlight: 'pld', marker: 34 } },
            { title: 'And the party that faded',
              html: '<p>The third-placed party’s decline starts around day 17 — the costing controversy — and does ' +
                    'not recover.</p><p>The coverage spike and the polling turn are close together. Which came first ' +
                    'is not a question this chart can answer.</p>',
              state: { highlight: 'ms', marker: 17 } },
            { title: 'Turn the bands off and it looks certain',
              html: '<p>Here is the same data with the uncertainty hidden — the version that usually gets published.</p>' +
                    '<p>It tells a crisper story. It is the same numbers.</p>',
              state: { highlight: null, showBand: false, marker: null } }
          ]
        },
        explorer: {
          title: 'Both campaigns, both panels',
          text: 'Click legend entries to hide series. Hover anywhere for every value on that day, including the ' +
                'article count underneath.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] },
            { id: 'band', label: 'Uncertainty', type: 'switch', value: 'on',
              options: [{ value: 'on', label: 'Show intervals' }, { value: 'off', label: 'Hide' }] }
          ],
          figure: pollFig('qc'),
          apply: function (v) { return { spec: pollFig(v.event).spec, state: { showBand: v.band === 'on' } }; }
        },
        takeaway: '<p>Polls are estimates with error, and published polls are a <b>non-random selection</b> of the ' +
                  'polls that were run. The bands here are sampling error only — they do not include house effects, ' +
                  'mode effects, or the late-deciding voters who make Quebec projections historically difficult.</p>' +
                  '<p>Coverage volume counts articles, not readers. A day with 500 wire briefs and a day with ' +
                  '500 long investigations are the same height on this chart.</p>'
      },

      /* ---------------------------------------------------------- 5B */
      {
        id: 'r5b', tag: 'Route 5B', name: 'Lead or lag?',
        blurb: 'If coverage and polling move together, one of them is usually first. Test every lag from −14 to +14 days.',
        figKind: 'Signed bars · confidence intervals',
        opening: '<p>This is the careful version of the question everybody actually wants answered. We correlate ' +
                 'coverage tone on one day with the change in polling <i>k</i> days later, for every <i>k</i> from ' +
                 'minus fourteen to plus fourteen, and plot the whole curve.</p>' +
                 '<p>Bars left of zero mean coverage moved first. Bars right of zero mean polling did.</p>',
        stat: { value: (peak.lag) + ' days', caption: 'the lag with the strongest correlation in the Quebec data — coverage tone leading polling change, not following it.' },
        scrolly: {
          side: 'left',
          figure: lagFig('qc'),
          steps: [
            { title: 'Read the whole curve, not the peak',
              html: '<p>A single correlation is easy to cherry-pick. The shape of the curve is much harder to fake — ' +
                    'and this one has a clear single hump on the negative side.</p>',
              state: {} },
            { title: 'The negative side',
              html: '<p>Everything left of zero is coverage preceding polling movement. That whole region is positive ' +
                    'and its peak sits three days out.</p>',
              state: { band: [-14, -1] } },
            { title: 'The positive side is nearly flat',
              html: '<p>Right of zero — polling preceding coverage — the correlations are small and mostly inside ' +
                    'their own intervals.</p><p>If newsrooms were simply chasing the polls, this side would be the tall one.</p>',
              state: { band: [1, 14] } },
            { title: 'Look at the whiskers',
              html: '<p>Every bar carries a 95% interval. Several of the bars that look meaningful do not clear it.</p>' +
                    '<p>The peak does. Its neighbours mostly do. That is the honest extent of the result.</p>',
              state: { band: null, highlight: 'l' + peak.lag } },
            { title: 'Alberta is shallower',
              html: '<p>The referendum shows the same shape with a lower peak and a wider interval. A two-option ' +
                    'question has less room to move than a five-party race.</p>',
              spec: lagFig('ab').spec, state: { band: null, highlight: null } }
          ]
        },
        explorer: {
          title: 'Both campaigns',
          text: 'Hover any bar for its exact correlation and interval. The table view lists all 29 lags.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: lagFig('qc'),
          apply: function (v) { return { spec: lagFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p>Temporal precedence is <b>not causation</b>, and this design cannot get there. Coverage and ' +
                  'polling can both respond to the same unobserved event — a leader’s performance, an economic ' +
                  'release, a rival’s mistake — with coverage simply reacting faster because publishing is faster ' +
                  'than fielding a poll.</p>' +
                  '<p>Polls are also not measured daily. Interpolating between fieldwork dates smears movement across ' +
                  'days it did not happen on, which biases lag estimates toward zero and makes this curve ' +
                  '<i>conservative</i> rather than generous.</p>'
      },

      /* ---------------------------------------------------------- 5C */
      {
        id: 'r5c', tag: 'Route 5C', name: 'The market’s ear',
        blurb: 'Prediction markets update in seconds, not days. Watch what they did around the four biggest coverage shocks.',
        figKind: 'Event study · four shocks on one scale',
        opening: '<p>A polling average is slow by construction. A prediction market is not — it reprices continuously, ' +
                 'which makes it a useful, imperfect stopwatch.</p>' +
                 '<p>We took the four largest coverage shocks in each campaign and lined them up at day zero.</p>',
        stat: { value: '48 h', caption: 'the window in which roughly two-thirds of each price move happened. After that the lines mostly flatten.' },
        scrolly: {
          side: 'right',
          figure: esFig('qc'),
          steps: [
            { title: 'Everything is indexed to zero',
              html: '<p>Each line starts at its own five-day pre-shock average, so the four events sit on one common ' +
                    'scale and the pre-period is flat by construction.</p><p>What happens to the right of the line is the finding.</p>',
              state: {} },
            { title: 'The costing row moved the most',
              html: '<p>A single accounting release produced the largest repricing of the campaign — larger than the debate.</p>' +
                    '<p>Markets respond to information that changes an estimate, not to information that fills a broadcast.</p>',
              state: { highlight: 'k1' } },
            { title: 'The debate moved less than you would think',
              html: '<p>The debate generated the biggest coverage spike in the campaign and roughly two-thirds of the ' +
                    'price movement of the costing story.</p><p>Volume and consequence are different quantities.</p>',
              state: { highlight: 'k2' } },
            { title: 'The ad blitz barely registered',
              html: '<p>The final-week advertising surge is almost invisible here — which is what you would expect ' +
                    'from information that everyone already had.</p>',
              state: { highlight: 'k4' } },
            { title: 'Alberta’s court opinion',
              html: '<p>In the referendum, the largest move follows the court reference — the one moment in the ' +
                    'campaign that resolved a genuine uncertainty.</p>',
              spec: esFig('ab').spec, state: { highlight: 'k1' } }
          ]
        },
        explorer: {
          title: 'Compare the shocks',
          text: 'Hover anywhere for every event’s value on that day. Use the legend to hide events and isolate one line.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: esFig('qc'),
          apply: function (v) { return { spec: esFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p>Prediction markets on provincial politics are <b>thin</b>. A few large orders move a price as ' +
                  'much as a genuine change in belief does, and thin markets carry well-documented favourite–longshot ' +
                  'bias.</p>' +
                  '<p>An event study also assumes the pre-period is a fair counterfactual. Where two shocks fall ' +
                  'close together — as the debate and the endorsement wave do here — that assumption is doing a ' +
                  'lot of work.</p>'
      }
    ],

    closing: {
      title: 'One more information source to check.',
      text: 'Everything so far has been humans publishing for humans. But a growing share of campaign questions now ' +
            'get answered by a model instead. Path 6 asks five of them the same things, in two languages.'
    },
    next: [
      { rq: 6, why: 'What AI assistants said about the same actors, issues and positions.' },
      { rq: 1, why: 'Back to the beginning: who was visible while all this was moving.' }
    ]
  };
}());
