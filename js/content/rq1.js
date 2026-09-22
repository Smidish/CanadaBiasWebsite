/* ------------------------------------------------------------------ *
 * Path 1 — Who Gets the Mic   (RQ1)
 * Visibility and polarisation of actors, groups, issues and positions.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq1 = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  var SRC_OPTIONS = [{ value: 'all', label: 'All sources combined' }].concat(
    E.sources.map(function (s) { return { value: s.id, label: s.name + ' · ' + s.kind }; }));

  function visFig(eventId, sourceId) {
    var v = D.visibility(eventId, sourceId);
    var who = sourceId === 'all' ? 'all eight sources combined' : E.sourceById[sourceId].name;
    return {
      type: 'stream',
      title: 'Share of campaign mentions, by day',
      subtitle: eventId === 'qc' ? 'Quebec general election · ' + who : 'Alberta referendum · ' + who,
      caption: 'Each band is one actor’s share of all actor mentions that day. Bands are smoothed over a three-day window.',
      spec: { days: v.days, series: v.series, format: 'pct0' }
    };
  }

  // Headline numbers are computed from the same generator the figures use,
  // so the prose can never drift away from the chart.
  var fwAll = D.finalWeek('qc', 'all');
  var top2 = Math.round(fwAll[0].value + fwAll[1].value);
  var fwMatin = D.finalWeek('qc', 'matin');
  var fwBoreal = D.finalWeek('qc', 'boreal');
  var msMatin = fwMatin.filter(function (d) { return d.id === 'ms'; })[0].value;
  var msBoreal = fwBoreal.filter(function (d) { return d.id === 'ms'; })[0].value;
  var msRatio = (msBoreal / msMatin).toFixed(1);

  var gg = D.groupGap('qc');
  var young = gg.filter(function (d) { return d.id === 'young'; })[0];
  var youngRatio = (young.population / young.coverage).toFixed(1);

  return {
    id: 'rq1', n: 1, accent: 1, rqId: 'RQ1',
    name: 'Who Gets the Mic',
    standfirst: 'Every campaign runs on a fixed budget of attention. Somebody spends it — and the spending ' +
                'decisions are made a hundred times a day, in eight newsrooms, without anyone calling it a decision.',
    rqText: 'How does the visibility and polarisation of political actors, social groups, issues, and positions differ across sources throughout each campaign?',

    routes: [
      /* ---------------------------------------------------------- 1A */
      {
        id: 'r1a', tag: 'Route 1A', name: 'The attention market',
        blurb: 'Watch the share of coverage move, day by day — then switch newsrooms and watch it move somewhere else.',
        figKind: 'Stacked area · switch the source',
        opening: '<p>Here is the whole Quebec campaign as a single picture: forty-one days across the bottom, ' +
                 'and every actor’s share of the mentions stacked up the side. Nothing here says whether the coverage was ' +
                 '<em>good</em> for anyone. It only says who was in the room.</p>',
        stat: { value: top2 + '%', caption: 'of all actor mentions in the final week went to just two of the five parties — across every source we measured.' },
        scrolly: {
          side: 'right',
          figure: visFig('qc', 'all'),
          steps: [
            { title: 'Start with everyone',
              html: '<p>All eight newsrooms, pooled. Two parties hold roughly half the attention from the first day, ' +
                    'and the smaller three share what is left.</p><p>That split is remarkably stable — until it isn’t.</p>',
              spec: visFig('qc', 'all').spec, state: {} },

            { title: 'Then something happens',
              html: '<p>Day 17: a dispute over platform costings. Day 23: the televised leaders’ debate.</p>' +
                    '<p>Both events move the bands, but not evenly — a debate lifts the leaders who are already ' +
                    'leading, because the coverage is about the contest, not the content.</p>',
              state: { annotate: [{ i: 17, label: 'Costing row' }, { i: 23, label: 'Debate' }] } },

            { title: 'Now pick a newsroom',
              html: '<p>This is the same campaign as seen by <b>Le Matin Express</b>, a tabloid.</p>' +
                    '<p>The left-of-centre party’s band gets noticeably thinner. Nothing was suppressed; ' +
                    'the newsroom simply covered a different mix of stories, day after day, for five weeks.</p>',
              spec: visFig('qc', 'matin').spec, state: { highlight: 'ms', annotate: [] } },

            { title: 'And another',
              html: '<p><b>Radio Boréal</b>, the public broadcaster, covering the same five weeks.</p>' +
                    '<p>In the final week the same party holds <b class="num">' + msBoreal + '%</b> of mentions here, ' +
                    'against <b class="num">' + msMatin + '%</b> at the tabloid — about <b>' + msRatio + '×</b> the airtime.</p>',
              spec: visFig('qc', 'boreal').spec, state: { highlight: 'ms' } },

            { title: 'The last seven days',
              html: '<p>Back to all sources. Whatever the differences earlier in the campaign, the ending is the same ' +
                    'everywhere: the field collapses onto the two parties who could plausibly win.</p>' +
                    '<p>If you were a voter deciding late, this is the menu you were handed.</p>',
              spec: visFig('qc', 'all').spec, state: { highlight: null, annotate: [{ i: 34, label: 'Final week' }] } }
          ]
        },
        explorer: {
          title: 'Run it yourself',
          text: 'Pick a campaign and a newsroom. Hover anywhere on the chart to read every actor’s share for that day, ' +
                'or open the table view for the numbers behind it.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] },
            { id: 'source', label: 'Newsroom', type: 'select', value: 'all', options: SRC_OPTIONS }
          ],
          figure: visFig('qc', 'all'),
          apply: function (v) { return { spec: visFig(v.event, v.source).spec }; }
        },
        takeaway: '<p>Mention counts measure <b>presence, not approval</b>. An actor can dominate coverage that is ' +
                  'uniformly hostile to them, and a party can be almost absent from coverage that is warm whenever it appears. ' +
                  'Nothing on this screen distinguishes the two.</p>' +
                  '<p>Differences between newsrooms also have ordinary explanations — a regional beat, a section ' +
                  'structure, the reporter who happened to be free. Difference is measurable; intent is not.</p>'
      },

      /* ---------------------------------------------------------- 1B */
      {
        id: 'r1b', tag: 'Route 1B', name: 'The polarisation map',
        blurb: 'Two things can be true of a topic: everyone talks about it, and nobody agrees how. Plot both at once.',
        figKind: 'Scatter · quadrants · filter by type',
        opening: '<p>Visibility is one axis. The second is <b>dispersion</b>: how far apart the eight newsrooms sat ' +
                 'in the stance they took on the same actor, issue or position. Low dispersion means the sources ' +
                 'agreed with each other. It does not mean they were right.</p>',
        stat: { value: '0.66', caption: 'cross-source stance dispersion on secularism and identity — the highest in the Quebec corpus, and more than four times the dispersion on health care.' },
        scrolly: {
          side: 'left',
          figure: {
            type: 'quadrant',
            title: 'Visibility against cross-source disagreement',
            subtitle: 'Quebec general election · actors, issues and specific positions',
            caption: 'Horizontal: share of all mentions. Vertical: standard deviation of source-level stance, where stance runs −1 to +1. Circle area is the number of articles.',
            spec: {
              points: D.polarisationMap('qc'),
              kinds: [{ id: 'Actor', label: 'Political actors', slot: 1 },
                      { id: 'Issue', label: 'Issues', slot: 2 },
                      { id: 'Position', label: 'Specific positions', slot: 3 }],
              xLabel: 'Share of mentions', yLabel: 'Disagreement between sources',
              xFormat: 'pctv', yFormat: 'num2', xMid: 8, yMid: 0.38,
              quadrantLabels: [
                { label: 'Loud and contested', top: true, right: true },
                { label: 'Loud and settled', top: false, right: true },
                { label: 'Quiet and contested', top: true, right: false },
                { label: 'Quiet and settled', top: false, right: false }
              ]
            }
          },
          steps: [
            { title: 'Four quadrants, four kinds of story',
              html: '<p>Top right is the fight the campaign was actually about. Bottom right is the consensus material — ' +
                    'covered constantly, framed almost identically everywhere. Top left is where the arguments happen ' +
                    'without much of an audience.</p>',
              state: {} },
            { title: 'The issues alone',
              html: '<p>Cost of living and health care sit low and right: universally covered, uniformly framed. ' +
                    'They were the campaign’s common ground.</p>',
              state: { kinds: ['Issue'], label: ['cost', 'health'] } },
            { title: 'And then the two that split the room',
              html: '<p>Immigration and language, and secularism and identity, sit at the top of the chart. ' +
                    'They were not the most-covered issues — but they were the ones on which sources diverged most sharply.</p>' +
                    '<p>Dispersion this high means a reader’s sense of “what the debate is” depended heavily on where they read.</p>',
              state: { kinds: ['Issue'], highlight: 'ident', label: ['imm', 'ident'] } },
            { title: 'Zoom in on the positions',
              html: '<p>Individual policy positions behave differently again. “Hire 4,000 nurses” was covered ' +
                    'with near-identical framing everywhere. “Cap newcomer intake” was not.</p>' +
                    '<p>Same campaign. Same week. Two very different information environments.</p>',
              state: { kinds: ['Position'], highlight: null, label: ['p_quota', 'p_nurse'] } },
            { title: 'Put it back together',
              html: '<p>Actors cluster in the middle: reliably visible, moderately contested. The interesting ' +
                    'variation is not in who the politicians are — it is in which ideas the coverage treats as open questions.</p>',
              state: { kinds: ['Actor', 'Issue', 'Position'], highlight: null, label: [] } }
          ]
        },
        explorer: {
          title: 'Switch the campaign',
          text: 'The Alberta referendum has only two camps, so its map is built differently — fewer actors, ' +
                'a much heavier concentration on one issue. Toggle between them and watch the shape of the map change.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: {
            type: 'quadrant',
            title: 'Visibility against cross-source disagreement',
            subtitle: 'Filter by type using the legend',
            caption: 'Click a legend entry to add or remove a category. Hover any circle for its underlying article count.',
            spec: {
              points: D.polarisationMap('qc'),
              kinds: [{ id: 'Actor', label: 'Political actors', slot: 1 },
                      { id: 'Issue', label: 'Issues', slot: 2 },
                      { id: 'Position', label: 'Specific positions', slot: 3 }],
              xLabel: 'Share of mentions', yLabel: 'Disagreement between sources',
              xFormat: 'pctv', yFormat: 'num2', xMid: 8, yMid: 0.38,
              quadrantLabels: [
                { label: 'Loud and contested', top: true, right: true },
                { label: 'Loud and settled', top: false, right: true },
                { label: 'Quiet and contested', top: true, right: false },
                { label: 'Quiet and settled', top: false, right: false }
              ]
            }
          },
          apply: function (v) {
            return { spec: Object.assign({}, this.figure.spec, { points: D.polarisationMap(v.event) }) };
          }
        },
        takeaway: '<p>Dispersion is a measure of <b>variation between sources</b>, not of accuracy. Eight newsrooms ' +
                  'can agree completely and all be wrong; they can disagree sharply about a question that has no ' +
                  'single correct framing at all.</p>' +
                  '<p>Stance here is coded at the article level by a model checked against a hand-coded sample. ' +
                  'Agreement between human coders on the identity items was the lowest in the study — so the top of ' +
                  'this chart is also the part with the widest error bars.</p>'
      },

      /* ---------------------------------------------------------- 1C */
      {
        id: 'r1c', tag: 'Route 1C', name: 'Who is missing',
        blurb: 'Coverage of a campaign is also coverage of a public. Compare who appeared with who lives there.',
        figKind: 'Dumbbell · sortable',
        opening: '<p>Move from actors to the people the campaign was about. For each social group we counted the ' +
                 'share of campaign articles mentioning them, and set it beside their share of the adult population. ' +
                 'The gap between the two dots is the whole story.</p>',
        stat: { value: youngRatio + '×', caption: 'Voters under 35 are that many times more common in the population than in the coverage — the largest deficit of any group we measured in Quebec.' },
        scrolly: {
          side: 'right',
          figure: {
            type: 'lollipop',
            title: 'Share of coverage against share of the adult population',
            subtitle: 'Quebec general election · nine social groups',
            caption: 'Blue dot: share of adults. Orange dot: share of campaign articles mentioning the group. Sorted by the size of the gap.',
            spec: {
              rows: D.groupGap('qc').map(function (d) {
                return { id: d.id, label: d.name, a: d.population, b: d.coverage };
              }),
              aLabel: 'Share of adults', bLabel: 'Share of coverage',
              slotA: 1, slotB: 2, format: 'pct1', sortBy: 'gap', labelWidth: 190
            }
          },
          steps: [
            { title: 'Read the gaps, not the dots',
              html: '<p>A group sitting at the top has more coverage than population. A group at the bottom has less. ' +
                    'The number on the right is the difference in percentage points.</p>',
              state: {} },
            { title: 'Over-represented: the reliable voters',
              html: '<p>Voters over 65 and rural residents both appear in coverage well above their population share. ' +
                    'Both also vote at higher rates than average — coverage follows the electorate that turns out.</p>',
              state: { highlight: 'senior' } },
            { title: 'Under-represented: renters and the young',
              html: '<p>At the other end, renters and voters under 35 are the two largest deficits.</p>' +
                    '<p>Housing was the fourth-most-covered issue of the campaign. The people who rent were the ' +
                    'third-least-mentioned group in it.</p>',
              state: { highlight: 'renters' } },
            { title: 'Now Alberta',
              html: '<p>The same nine groups, the referendum campaign. Energy and union workers jump from roughly ' +
                    'proportional to sharply over-represented — the referendum was covered, in large part, as a story about their jobs.</p>',
              spec: {
                rows: D.groupGap('ab').map(function (d) { return { id: d.id, label: d.name, a: d.population, b: d.coverage }; }),
                aLabel: 'Share of adults', bLabel: 'Share of coverage',
                slotA: 1, slotB: 2, format: 'pct1', sortBy: 'gap', labelWidth: 190
              },
              state: { highlight: 'workers' } },
            { title: 'One thing both campaigns share',
              html: '<p>Whichever province, whichever question on the ballot: the under-35 gap is there, and it is large.</p>' +
                    '<p>That is the sort of pattern Path 7 is built to test — is it about these campaigns, or about campaign coverage?</p>',
              state: { highlight: 'young' } }
          ]
        },
        explorer: {
          title: 'Sort it your way',
          text: 'Sorting by coverage share alone tells you who was talked about. Sorting by gap tells you who was ' +
                'talked about relative to how many of them there are. The two rankings are not the same.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] },
            { id: 'sort', label: 'Sort by', type: 'switch', value: 'gap',
              options: [{ value: 'gap', label: 'Gap' }, { value: 'b', label: 'Coverage' }, { value: 'a', label: 'Population' }] }
          ],
          figure: {
            type: 'lollipop',
            title: 'Share of coverage against share of the adult population',
            subtitle: 'Hover a row for the underlying rates',
            caption: 'Population shares are placeholders standing in for census estimates; coverage shares are from the simulated corpus.',
            spec: {
              rows: D.groupGap('qc').map(function (d) { return { id: d.id, label: d.name, a: d.population, b: d.coverage }; }),
              aLabel: 'Share of adults', bLabel: 'Share of coverage',
              slotA: 1, slotB: 2, format: 'pct1', sortBy: 'gap', labelWidth: 190
            }
          },
          apply: function (v) {
            return {
              spec: {
                rows: D.groupGap(v.event).map(function (d) { return { id: d.id, label: d.name, a: d.population, b: d.coverage }; }),
                aLabel: 'Share of adults', bLabel: 'Share of coverage',
                slotA: 1, slotB: 2, format: 'pct1', sortBy: v.sort, labelWidth: 190
              },
              state: { sortBy: v.sort }
            };
          }
        },
        takeaway: '<p>A mention is a low bar. Being named in an article is not the same as being quoted, and being ' +
                  'quoted is not the same as setting the agenda. The narrower measure — who speaks in their own ' +
                  'words — produces steeper gaps than the one shown here.</p>' +
                  '<p>Population shares are also a crude benchmark. There is no rule that coverage <i>should</i> ' +
                  'mirror demography, and for some groups it plainly should not. The gap is a fact to explain, not a verdict.</p>'
      }
    ],

    closing: {
      title: 'You now know who was in the room.',
      text: 'What you don’t know yet is how they were described once they got there. Two newsrooms can give a party ' +
            'exactly the same number of words and still hand a reader two different impressions — which is the ' +
            'question the next path takes apart, one verb at a time.'
    },
    next: [
      { rq: 2, why: 'Same actor, same event, seven headlines. Where the wording does the work.' },
      { rq: 7, why: 'The under-35 gap showed up in both campaigns. Which other patterns transfer?' }
    ]
  };
}());
