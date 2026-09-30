/* ------------------------------------------------------------------ *
 * Path 3 — From Press Release to Print   (RQ3)
 * Which messages get covered, and how they change on the way.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq3 = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  function flowFig(eventId) {
    var f = D.messageFlow(eventId);
    return {
      type: 'flow',
      title: 'Every message a campaign issued, and where it ended up',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · ribbons coloured by theme',
      caption: 'A message is one distinct claim in an actor’s own channels. Ribbons keep their theme colour across both hops, so you can follow a theme from left to right.',
      spec: {
        stages: f.stages, nodes: f.nodes, links: f.links, legend: f.legend,
        legendNote: 'Click nothing — hover a ribbon for its volume'
      }
    };
  }

  function uptakeFig(eventId) {
    return {
      type: 'bars',
      title: 'Uptake rate by message, against share of ad spend',
      subtitle: eventId === 'qc' ? 'Quebec general election · nine campaign messages' : 'Alberta referendum · eight campaign messages',
      caption: 'Bar: share of the message’s appearances in the actor’s own channels that were echoed in news coverage within 72 hours. Black tick: that message’s share of the campaign’s advertising spend.',
      spec: {
        rows: D.uptake(eventId).map(function (d) {
          return { id: d.id, label: d.label, full: d.label + ' — ' + d.actorLabel, value: d.value,
                   spend: d.spend, slot: d.slot, actorLabel: d.actorLabel, note: 'Pushed by ' + d.actorLabel };
        }),
        format: 'pct0', reference: 'spend', referenceName: 'Share of ad spend',
        valueName: 'Uptake rate', labelWidth: 210, rowHeight: 34, legendBy: 'slot'
      }
    };
  }

  function shiftFig(eventId) {
    return {
      type: 'slope',
      title: 'How a claim is framed, before and after the newsroom',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · five claims',
      caption: 'Position on the scale is the mean framing valence of the claim: +1 is entirely the claimant’s own frame, −1 is entirely the counter-frame. Hover a line for the two frames in words.',
      spec: {
        rows: D.framingShift(eventId).map(function (d) {
          return Object.assign({}, d, { label: d.claim });
        }),
        fromLabel: 'In the actor’s own words', toLabel: 'As reported in news',
        fromShort: 'Own words', toShort: 'In the news',
        domain: [-0.4, 0.8], format: 'num2', leftWidth: 190, rightWidth: 80
      }
    };
  }

  var up = D.uptake('qc');
  var best = up.slice().sort(function (a, b) { return b.value - a.value; })[0];
  var worst = up.slice().sort(function (a, b) { return (a.value / a.spend) - (b.value / b.spend); })[0];
  var f = D.messageFlow('qc');
  var reportedShare = Math.round(f.totals.reported / (f.totals.reported + f.totals.unreported) * 100);

  /* ══ CONTENT · Path header ══════════════════════════════════════════
     Edit: name · standfirst · rqText. The hub’s door text for this path
     lives in _manifest.js. id / n / accent / rqId are wiring — leave them.
     Everything above this line is data plumbing (figure builders and the
     headline numbers computed from _data.js), not copy. ══ */
  return {
    id: 'rq3', n: 3, accent: 3, rqId: 'RQ3',
    name: 'From Press Release to Print',
    standfirst: 'A campaign is, mechanically, a machine for issuing sentences. Most of them die where they are born. ' +
                'The ones that live are not always the ones that were paid for.',
    rqText: 'Which messages from parties, candidates, and advocacy organisations receive news coverage, and how does the representation of their messages differ between actors’ own communication, political advertisements, and news reporting?',

    routes: [
      /* ══ CONTENT · Route 3A ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r3a', tag: 'Route 3A', name: 'The message funnel',
        blurb: 'Three thousand messages go in. Follow the ribbons and see how many come out the other side.',
        figKind: 'Flow diagram · hover a ribbon',
        opening: '<p>Left: every distinct claim a campaign made in its own channels, grouped by theme. ' +
                 'Middle: whether the campaign also put money behind it. Right: whether any newsroom reported it.</p>' +
                 '<p>Ribbon width is volume. Ribbon colour is the theme it started as.</p>',
        stat: { value: reportedShare + '%', caption: 'of all campaign messages were reported anywhere in the news within 72 hours. The rest were issued into silence.' },
        scrolly: {
          side: 'right',
          figure: flowFig('qc'),
          steps: [
            { title: 'Start on the left',
              html: '<p>Six themes, sized by how many distinct messages the campaigns issued under each. ' +
                    'Cost of living is the biggest block, as it was in almost every measurement in this study.</p>',
              state: {} },
            { title: 'Money is the first fork',
              html: '<p>Only about a third of messages were also bought as advertising. That third is not chosen ' +
                    'at random — it is the themes the campaigns most wanted to own.</p>',
              state: { highlight: null } },
            { title: 'Follow identity',
              html: '<p>Identity and secularism was the <i>smallest</i> theme by message volume — and the most heavily ' +
                    'advertised relative to its size, and the most likely to be reported.</p>' +
                    '<p>A small number of sentences, pushed hard, travelled furthest.</p>',
              state: { highlight: 4 } },
            { title: 'Now follow climate',
              html: '<p>Climate and energy produced more messages than identity did, attracted less than a third ' +
                    'of the advertising, and was reported at roughly a quarter of the rate.</p>' +
                    '<p>Neither theme was suppressed. One was pushed and one was not.</p>',
              state: { highlight: 5 } },
            { title: 'The wide grey band',
              html: '<p>The bottom-right node is the part of a campaign nobody sees: thousands of messages that were ' +
                    'issued, published on a website, sent to a list — and never reported.</p>' +
                    '<p>It is the largest single flow on this chart.</p>',
              state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Switch campaigns',
          text: 'The referendum funnel is narrower and steeper: two camps, fewer themes, a much higher uptake rate ' +
                'on the headline question and much lower on everything else.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: flowFig('qc'),
          apply: function (v) { return { spec: flowFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p><b>Uptake is not endorsement.</b> A message can be reported precisely because a newsroom thinks ' +
                  'it is wrong, or because the other side attacked it. This diagram counts appearances, not approval.</p>' +
                  '<p>“Distinct message” is also a judgement call. We de-duplicate near-identical phrasings, which ' +
                  'means a campaign that repeats one line relentlessly is counted once — and a campaign that rephrases ' +
                  'constantly looks more prolific than it is.</p>'
      },

      /* ══ CONTENT · Route 3B ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r3b', tag: 'Route 3B', name: 'The uptake leaderboard',
        blurb: 'Which individual messages actually made it — and whether the money predicted it.',
        figKind: 'Ranked bars · spend reference marks',
        opening: '<p>The funnel shows themes. This shows the sentences themselves. Each bar is one campaign message ' +
                 'and how often it was echoed in news coverage. The black tick on each row is that message’s share of ' +
                 'the campaign’s advertising budget.</p><p>Where the tick sits far to the right of the bar, money did not buy coverage.</p>',
        stat: { value: Math.round(best.value * 100) + '%', caption: '— the uptake rate for “' + best.label.replace(/[“”]/g, '') + '”, the most-reported single message of the Quebec campaign.' },
        scrolly: {
          side: 'left',
          figure: uptakeFig('qc'),
          steps: [
            { title: 'Sorted by what got through',
              html: '<p>Bar length is uptake. Colour is the actor who pushed the message. The top of this list is ' +
                    'not the most expensive advertising — it is the most reportable claim.</p>',
              state: {} },
            { title: 'The cheapest winner',
              html: '<p>The top message carried a modest share of its campaign’s spending and still led the board. ' +
                    'It was specific, it was contestable, and it gave the other parties something to respond to.</p>',
              state: { highlight: up.slice().sort(function (a, b) { return b.value - a.value; })[0].id } },
            { title: 'The expensive loser',
              html: '<p>Now look at “' + worst.label.replace(/[“”]/g, '') + '”. It carried ' +
                    '<b class="num">' + Math.round(worst.spend * 100) + '%</b> of its campaign’s advertising ' +
                    'and reached an uptake rate of <b class="num">' + Math.round(worst.value * 100) + '%</b>.</p>' +
                    '<p>Spending buys reach. It does not buy news coverage.</p>',
              state: { highlight: worst.id } },
            { title: 'Advocacy organisations sit at the bottom',
              html: '<p>In Quebec, messages from outside the party system barely register. In Alberta they do ' +
                    'considerably better — a referendum has room for third parties that an election does not.</p>',
              spec: uptakeFig('ab').spec, state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Look for the mismatches',
          text: 'Hover any row for the actor behind it. The rows where bar and tick disagree most are the ones worth ' +
                'arguing about — in both directions.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: uptakeFig('qc'),
          apply: function (v) { return { spec: uptakeFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p>Uptake here is measured over a 72-hour window, which favours messages designed for the news ' +
                  'cycle and penalises slow-burning ones. A policy that gets picked up three weeks later, in an ' +
                  'analysis piece, scores zero.</p>' +
                  '<p>Advertising share is also a poor proxy for effort. Field organising, leader tours and ' +
                  'earned-media stunts cost money that never appears in an ad register.</p>'
      },

      /* ══ CONTENT · Route 3C ══════════════════════════════════════════
         Edit: name · blurb · figKind · opening · stat · scrolly.figure · scrolly.steps[].title/html/state · explorer · takeaway.
         Snippets for every field: template.html · try changes in sandbox.html */
      {
        id: 'r3c', tag: 'Route 3C', name: 'Lost in translation',
        blurb: 'The message that gets reported is rarely the message that was sent. Measure the distance.',
        figKind: 'Slope chart · hover for the frames',
        opening: '<p>Getting covered is only half of it. A claim arrives in a newsroom wrapped in one frame and ' +
                 'leaves wrapped in another. We scored both ends of that trip on the same scale: +1 is entirely the ' +
                 'claimant’s framing, −1 is entirely the counter-frame.</p>',
        stat: { value: '−0.44', caption: 'the average movement away from the claimant’s own framing across the five most-covered Quebec claims. Every line on this chart slopes down.' },
        scrolly: {
          side: 'right',
          figure: shiftFig('qc'),
          steps: [
            { title: 'Every line slopes the same way',
              html: '<p>That is not a finding about bias. It is close to a definition of reporting: a newsroom that ' +
                    'reproduced a claim’s framing intact would be running a press release.</p>' +
                    '<p>The interesting variation is <b>how far</b> each claim moves.</p>',
              state: {} },
            { title: 'The steepest drop',
              html: '<p>“Freeze rents” enters as an affordability argument and is reported, on average, as a story ' +
                    'about costs to landlords. It is the largest reframing in the Quebec set.</p>' +
                    '<p>Hover the line to read both frames in words.</p>',
              state: { highlight: 's2' } },
            { title: 'The shallowest',
              html: '<p>“Cut the payroll tax” barely moves. A claim that is already framed in the terms the business ' +
                    'press uses does not need translating.</p>',
              state: { highlight: 's3' } },
            { title: 'Alberta’s outlier',
              html: '<p>In the referendum set, one claim holds its frame almost perfectly: “Energy jobs at stake”. ' +
                    'It entered as an employment argument and was reported as an employment argument, by everyone.</p>' +
                    '<p>A frame that every side already accepts does not get contested.</p>',
              spec: shiftFig('ab').spec, state: { highlight: 't4' } }
          ]
        },
        explorer: {
          title: 'Read the frames',
          text: 'Hover any line for the framing at each end and the size of the shift. Click a legend entry to isolate one claim.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: shiftFig('qc'),
          apply: function (v) { return { spec: shiftFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p>This measures <b>direction, not fairness</b>. A claim reframed away from its author may have ' +
                  'been reframed toward the evidence. Nothing here can tell you which.</p>' +
                  '<p>The two ends are also not symmetric measurements: an actor’s own framing is taken from a small ' +
                  'set of controlled documents, while the news framing is averaged over hundreds of articles with ' +
                  'wide variation. The line hides that spread.</p>'
      }
    ],

    /* ══ CONTENT · Path ending ══ Edit: closing.title · closing.text · next[].why ══ */
    closing: {
      title: 'The newsroom is no longer the last stop.',
      text: 'A story that makes it into print immediately enters a second distribution system, one with different ' +
            'incentives and no editors. Path 4 follows it there.'
    },
    next: [
      { rq: 4, why: 'What the feed does to a story after the newsroom is finished with it.' },
      { rq: 5, why: 'Whether any of this uptake shows up in the polls.' }
    ]
  };
}());
