/* ------------------------------------------------------------------ *
 * Path 4 — The Amplifiers   (RQ4)
 * Who shares what, how they reframe it, and what comes back.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq4 = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  var net = D.ampNetwork();
  var be = D.biasEngagement();
  var rs = D.replyStance();

  function netFig() {
    return {
      type: 'network',
      title: 'Who passes the news along',
      subtitle: 'Accounts and outlets, linked by sharing · three detected clusters',
      caption: 'Node size is volume of news sharing. Links are shares of an outlet’s articles. Layout is force-directed and deterministic — position carries no meaning beyond proximity.',
      spec: { nodes: net.nodes, links: net.links, communities: net.communities }
    };
  }

  function scatterFig() {
    return {
      type: 'scatter',
      title: 'Linguistic bias of a post against the engagement it received',
      subtitle: '260 posts sharing campaign coverage · engagement on a log scale',
      caption: 'Each dot is one post. Horizontal: the post’s own linguistic-bias score in standard deviations. Vertical: reshares per thousand followers. The line is an ordinary least-squares fit on the visible points.',
      spec: {
        points: be.map(function (d) { return { id: d.id, x: d.bias, y: d.engagement, group: d.comm }; }),
        groups: net.communities.map(function (c) { return { id: c.id, label: c.label, slot: c.slot }; }),
        xLabel: 'Linguistic bias of the post', yLabel: 'Reshares per 1,000 followers',
        xFormat: 'num1', yFormat: 'num0', logY: true, pointName: 'Post',
        trendLabel: 'Fitted trend',
        legendNote: 'Association only — not an effect'
      }
    };
  }

  function replyFig() {
    return {
      type: 'diverging',
      title: 'What the replies said, by how the post framed the story',
      subtitle: 'Five post archetypes · replies coded for stance',
      caption: 'Bars are centred on the neutral category. Opposing and challenging replies sit to the left, agreeing and amplifying replies to the right.',
      spec: {
        categories: rs.categories, rows: rs.rows, centreIndex: rs.centreIndex, n: rs.n,
        format: 'pct0', labelWidth: 200, rowHeight: 44
      }
    };
  }

  // Correlation between bias and log engagement, computed from the same points.
  var xs = be.map(function (d) { return d.bias; }), ys = be.map(function (d) { return Math.log(d.engagement); });
  var mx = SITE.gen.mean(xs), my = SITE.gen.mean(ys);
  var num = 0, dx = 0, dy = 0;
  xs.forEach(function (x, i) { num += (x - mx) * (ys[i] - my); dx += (x - mx) * (x - mx); dy += (ys[i] - my) * (ys[i] - my); });
  var r = (num / Math.sqrt(dx * dy)).toFixed(2);
  var oppLoaded = Math.round(rs.rows[3].values[0] * 100);
  var oppPlain = Math.round(rs.rows[0].values[0] * 100);

  return {
    id: 'rq4', n: 4, accent: 7, rqId: 'RQ4',
    name: 'The Amplifiers',
    standfirst: 'Between the newsroom and the reader there is now a second newsroom, staffed by everybody, ' +
                'with no style guide and a scoreboard visible in real time.',
    rqText: 'Which social media accounts amplify particular positions, and how do they share, comment on, or reframe news coverage? How are linguistic bias and framing associated with engagement and the stance and sentiment expressed in replies?',

    routes: [
      /* ---------------------------------------------------------- 4A */
      {
        id: 'r4a', tag: 'Route 4A', name: 'The amplifier network',
        blurb: 'Two dozen accounts, eight outlets, and the sharing that connects them. Watch the clusters separate.',
        figKind: 'Force network · hover any node',
        opening: '<p>Every link here is an account sharing an outlet’s article. Nothing about the accounts’ ' +
                 'politics was used to build the picture — the clusters come out of who shares whom.</p>',
        stat: { value: '3', caption: 'clusters emerge from the sharing behaviour alone. Two of them barely touch each other; the third sits between them and shares from everyone.' },
        scrolly: {
          side: 'right',
          figure: netFig(),
          steps: [
            { title: 'Outlets are the plain circles',
              html: '<p>The eight labelled, uncoloured nodes are news outlets. Everything else is an account, ' +
                    'sized by how much campaign news it passed on.</p>' +
                    '<p>Colour is the cluster the sharing pattern put it in — nothing else.</p>',
              state: {} },
            { title: 'The first cluster',
              html: '<p>Accounts that shared overwhelmingly from the tabloids and the partisan digital outlet, and ' +
                    'almost never from the public broadcaster or the wire.</p>' +
                    '<p>Its members were not connected to each other. They were connected by what they chose to pass on.</p>',
              state: { highlight: 'c1' } },
            { title: 'The second',
              html: '<p>The mirror image, sourcing mostly from the broadsheets and the broadcaster.</p>' +
                    '<p>Both clusters contain a handful of very large accounts and a long tail of small ones. ' +
                    'The large ones do most of the moving.</p>',
              state: { highlight: 'c2' } },
            { title: 'And the bridge',
              html: '<p>The third cluster shares from everywhere. Municipal accounts, civic organisations, ' +
                    'fact-checkers, a few reporters.</p>' +
                    '<p>Its accounts are smaller on average — and they are the only ones linking the other two.</p>',
              state: { highlight: 'c3' } },
            { title: 'Put it back together',
              html: '<p>What you are looking at is not an echo chamber in the strong sense — plenty of accounts ' +
                    'share across the divide. But the <i>volume</i> is lopsided, and that is what shapes a feed.</p>',
              state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Follow one account',
          text: 'Hover any node for its cluster, its audience size and how much campaign news it shared. ' +
                'Use the legend to isolate a cluster.',
          controls: [],
          figure: netFig()
        },
        takeaway: '<p>Clusters are produced by an algorithm on a sample of accounts — they are a <b>description of ' +
                  'this sample</b>, not a map of a public. A different sampling window produces different clusters.</p>' +
                  '<p>We also cannot see what did not get shared, or who saw a share and ignored it. Sharing is a ' +
                  'loud minority behaviour; most accounts that read campaign news never touched a share button.</p>'
      },

      /* ---------------------------------------------------------- 4B */
      {
        id: 'r4b', tag: 'Route 4B', name: 'Does bias travel further?',
        blurb: 'The question everyone asks. The honest answer has a confidence interval attached.',
        figKind: 'Scatter · fitted trend · log scale',
        opening: '<p>Each dot is a post sharing campaign coverage. We scored the post’s own wording on the same six ' +
                 'bias dimensions used in Path 2, then plotted it against the engagement it received.</p>' +
                 '<p>The vertical axis is logarithmic, because engagement is not remotely normal.</p>',
        stat: { value: 'r = ' + r, caption: 'the correlation between a post’s linguistic-bias score and its engagement. Real, positive, and much smaller than the arrow of the trend line suggests.' },
        scrolly: {
          side: 'left',
          figure: scatterFig(),
          steps: [
            { title: 'The cloud first',
              html: '<p>Before the line: look at the spread. At every level of bias there are posts that went nowhere ' +
                    'and posts that went everywhere.</p><p>Whatever the trend is, it is not destiny.</p>',
              state: { trend: false } },
            { title: 'Now the line',
              html: '<p>It slopes up. More loaded wording is associated with more engagement, across the whole sample.</p>' +
                    '<p>The slope is modest and the scatter around it is enormous. Both facts are the finding.</p>',
              state: { trend: true } },
            { title: 'Split by cluster',
              html: '<p>The relationship is strongest inside the partisan clusters and weakest in the civic one — ' +
                    'where high-bias posts do not reliably outperform careful ones.</p>',
              state: { trend: true, highlight: 'c1' } },
            { title: 'The civic cluster',
              html: '<p>Same axes, different population. Flatter line, tighter cloud, lower ceiling.</p>' +
                    '<p>Audience composition matters at least as much as wording.</p>',
              state: { trend: true, highlight: 'c3' } },
            { title: 'What the line cannot tell you',
              html: '<p>Engagement is produced by a ranking system we cannot observe, on posts we did not randomise. ' +
                    'Loaded posts may travel because they are loaded — or because the accounts that write them ' +
                    'already had the audience.</p>',
              state: { trend: true, highlight: null } }
          ]
        },
        explorer: {
          title: 'Isolate a cluster',
          text: 'The fit is recomputed on whatever is visible, so you can see how much of the overall slope comes ' +
                'from which part of the network.',
          controls: [
            { id: 'grp', label: 'Cluster', type: 'chips', multi: true,
              value: net.communities.map(function (c) { return c.id; }),
              options: net.communities.map(function (c) { return { value: c.id, label: c.label, color: 'var(--series-' + c.slot + ')' }; }) },
            { id: 'trend', label: 'Trend line', type: 'switch', value: 'on',
              options: [{ value: 'on', label: 'Show' }, { value: 'off', label: 'Hide' }] }
          ],
          figure: scatterFig(),
          apply: function (v) { return { state: { groups: v.grp, trend: v.trend === 'on', highlight: null } }; }
        },
        takeaway: '<p>This is an <b>association measured on observational data</b>. It supports the sentence “more ' +
                  'loaded posts tended to get more engagement in this sample” and no stronger sentence than that.</p>' +
                  '<p>Engagement is also endogenous to the platform: the same post published at a different hour, or ' +
                  'by an account with a different history, gets a different number. We have no way to hold that constant.</p>'
      },

      /* ---------------------------------------------------------- 4C */
      {
        id: 'r4c', tag: 'Route 4C', name: 'The reply room',
        blurb: 'Engagement is a number. Replies are sentences. They do not say the same thing.',
        figKind: 'Diverging bars · coded replies',
        opening: '<p>We sorted posts into five archetypes by what the poster did to the story, then coded the replies ' +
                 'each archetype attracted. The bars are centred on “neutral”, so the shape of a row tells you what ' +
                 'kind of conversation followed.</p>',
        stat: { value: oppLoaded + '%', caption: 'of replies to posts that reframed a headline with loaded wording were opposing — against ' + oppPlain + '% for a plain link with no comment.' },
        scrolly: {
          side: 'right',
          figure: replyFig(),
          steps: [
            { title: 'A plain link is quiet',
              html: '<p>Top row: someone posts the article and says nothing. The replies are mostly neutral — ' +
                    'people discussing the story rather than the poster.</p>',
              state: { highlight: 'plain' } },
            { title: 'Quoting the headline changes little',
              html: '<p>Adding the headline verbatim shifts the distribution slightly in both directions. ' +
                    'More engagement, roughly the same balance.</p>',
              state: { highlight: 'quote' } },
            { title: 'Reframing splits the room',
              html: '<p>Once the poster supplies their own frame, neutral replies collapse and both poles grow. ' +
                    'The neutral share drops by more than half.</p>',
              state: { highlight: 'reframe' } },
            { title: 'Loaded wording splits it further',
              html: '<p>Same story, same headline, stronger words. Opposition rises sharply — but so does ' +
                    'amplification. Loaded posts do not just attract critics; they attract a louder version of both sides.</p>',
              state: { highlight: 'loaded' } },
            { title: 'And naming a person',
              html: '<p>The most polarised row in the study. When a post is directed at a named actor rather than ' +
                    'at a story, neutral replies nearly vanish.</p>' +
                    '<p>Note what this does <i>not</i> show: whether anyone changed their mind.</p>',
              state: { highlight: 'attack' } }
          ]
        },
        explorer: {
          title: 'Compare the rows',
          text: 'Hover any row for the full distribution and the number of replies behind it. ' +
                'Click a legend entry to trace one stance category down the chart.',
          controls: [],
          figure: replyFig()
        },
        takeaway: '<p>Reply stance is coded automatically with a model validated against a hand-coded sample. ' +
                  'Agreement is good on opposition and amplification and <b>weakest in the middle</b> — sarcasm, ' +
                  'in particular, is routinely miscoded, and sarcasm is common here.</p>' +
                  '<p>Replies are also not opinion. People who reply are a small, unrepresentative and unusually ' +
                  'motivated slice of the people who saw a post.</p>'
      }
    ],

    closing: {
      title: 'None of this has touched the polls yet.',
      text: 'Coverage, framing, amplification — all of it measured, none of it connected to whether anybody moved. ' +
            'Path 5 lines the coverage up against the polling and the prediction markets, and asks which one moved first.'
    },
    next: [
      { rq: 5, why: 'Coverage, polling and market prices, day by day.' },
      { rq: 2, why: 'Where the loaded wording being amplified here comes from.' }
    ]
  };
}());
