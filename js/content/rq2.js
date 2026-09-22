/* ------------------------------------------------------------------ *
 * Path 2 — The Words We Choose   (RQ2)
 * Linguistic bias and textual/visual framing across sources covering
 * the same actors and events.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq2 = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  var sets = D.headlineSets();
  var imgs = D.imageCodes();

  function headlineFig() {
    return {
      type: 'headlines',
      title: 'One event, seven headlines',
      subtitle: 'Hover a headline to isolate it; underlined spans are coded bias markers',
      caption: 'Headlines are written for the prototype, not collected. The coding scheme is real: each span is tagged with the bias dimension it carries.',
      spec: { sets: sets }
    };
  }

  function heatFig(eventId) {
    var h = D.biasHeat(eventId);
    return {
      type: 'heatmap',
      title: 'Linguistic bias by source and dimension',
      subtitle: (eventId === 'qc' ? 'Quebec general election' : 'Alberta referendum') + ' · standardised, 0 = corpus mean',
      caption: 'Each cell is a source’s mean score on one dimension, in standard deviations from the corpus mean. Blue is below the mean, red above.',
      spec: {
        rows: h.rows, cols: h.cols, cells: h.cells,
        scale: 'diverging', format: 'sd', cellFormat: '+.2f',
        lowLabel: '−1.2 SD', highLabel: '+1.2 SD', midLabel: 'grey = corpus mean',
        labelWidth: 150
      }
    };
  }

  function imgFig() {
    return {
      type: 'imagegrid',
      title: 'Coded press photographs',
      subtitle: '72 images, six sources, four actors',
      caption: 'Each tile is an abstract rendering of one coded photograph — angle, shot size, expression and setting are drawn from the codes. No real photograph is reproduced.',
      spec: { images: imgs }
    };
  }

  var cc = D.captionCongruence();
  var bh = D.biasHeat('qc');
  function cell(src, dim) { return bh.cells.filter(function (c) { return c.row === src && c.col === dim; })[0].value; }
  var gapInten = (cell('signal', 'inten') - cell('fil', 'inten')).toFixed(2);

  var lowAngleSignal = Math.round(imgs.filter(function (d) { return d.source === 'signal' && d.actor === 'yes' && d.angle === 'Low (looking up)'; }).length /
                       Math.max(1, imgs.filter(function (d) { return d.source === 'signal' && d.actor === 'yes'; }).length) * 100);

  return {
    id: 'rq2', n: 2, accent: 2, rqId: 'RQ2',
    name: 'The Words We Choose',
    standfirst: 'Nobody writes “this party is bad.” What happens instead is smaller and harder to see: a verb, ' +
                'an adjective, a decision about whose words go in quotation marks. Multiply it by five weeks.',
    rqText: 'How do linguistic bias and textual and visual framing differ across sources covering the same actors or issues, including subtle patterns in mainstream print and online news? How do topic emphasis, wording, and portrayals across headlines, bodies, images, and captions contribute to these differences?',

    routes: [
      /* ---------------------------------------------------------- 2A */
      {
        id: 'r2a', tag: 'Route 2A', name: 'Same event, seven headlines',
        blurb: 'Start where readers start. One event, stripped to its facts, and the seven headlines written about it.',
        figKind: 'Annotated text · close reading',
        opening: '<p>This is the slow way in, and the most convincing one. Below are the facts of a single event, ' +
                 'followed by how seven newsrooms announced it. Every underlined span is coded — hover for the reason it ' +
                 'was flagged.</p><p>Read them once without the codes. Then read them again.</p>',
        stat: { value: '4 of 7', caption: 'headlines about the leaders’ debate framed it with a conflict or sport metaphor. The wire service’s did not.' },
        scrolly: {
          side: 'right',
          figure: headlineFig(),
          steps: [
            { title: 'The facts first',
              html: '<p>A 120-minute debate. Health care, immigration, taxes. No new policy.</p>' +
                    '<p>That is the whole event. Everything below is a choice about how to say it.</p>',
              state: { setId: 'debate', focus: null, dim: null } },
            { title: 'The wire copy is the control',
              html: '<p><b>Fil Public</b> writes for other newsrooms, so its house style strips evaluation out. ' +
                    '“Five leaders debate health care, immigration and taxes.” No coded spans.</p>' +
                    '<p>Everything the other six added, they chose to add.</p>',
              state: { setId: 'debate', focus: 'fil', dim: null } },
            { title: 'Verbs that take a side',
              html: '<p>“Says” is neutral. “Claims” is not — it signals the writer is withholding endorsement. ' +
                    '“Defends” casts one actor as answering; “presses” casts the other as asking.</p>' +
                    '<p>None of these is false. Each nudges.</p>',
              state: { setId: 'debate', focus: null, dim: 'epi' } },
            { title: 'The conflict frame',
              html: '<p>Spar. Clash. Real winner. A policy debate becomes a fight with a scoreboard.</p>' +
                    '<p>Conflict framing is the single most common coded pattern in our corpus, and the least ' +
                    'contested by newsrooms themselves — it is usually described as making the story readable.</p>',
              state: { setId: 'debate', focus: null, dim: 'metaph' } },
            { title: 'A different event, the same signatures',
              html: '<p>Now a court opinion in Alberta. Same sources, same coding scheme.</p>' +
                    '<p>“Finds” becomes “clears”, then “refuses”. The outlet that scored highest on loaded language ' +
                    'in the debate story scores highest here too.</p>',
              state: { setId: 'ruling', focus: null, dim: null } },
            { title: 'And once more, with costings',
              html: '<p>The third event is an accounting release — about as dry as a campaign gets.</p>' +
                    '<p>It still produces “blow past”, “billions more”, and one headline that attributes a motive ' +
                    'to an unnamed group. The pattern is not about the subject matter.</p>',
              state: { setId: 'costing', focus: null, dim: null } }
          ]
        },
        explorer: {
          title: 'Pick an event and a dimension',
          text: 'Isolating one bias dimension dims the headlines that do not carry it. Selecting a source shows ' +
                'every coded span in its headline with the coder’s note.',
          controls: [
            { id: 'set', label: 'Event', type: 'select', value: 'debate',
              options: sets.map(function (s) { return { value: s.id, label: s.label }; }) },
            { id: 'dim', label: 'Bias dimension', type: 'select', value: '',
              options: [{ value: '', label: 'All dimensions' }].concat(
                E.biasDims.map(function (d) { return { value: d.id, label: d.name }; })) },
            { id: 'src', label: 'Source', type: 'select', value: '',
              options: [{ value: '', label: 'All sources' }].concat(
                E.sources.map(function (s) { return { value: s.id, label: s.name }; })) }
          ],
          figure: headlineFig(),
          apply: function (v) {
            return { state: { setId: v.set, dim: v.dim || null, focus: v.src || null } };
          }
        },
        takeaway: '<p>These are <b>measurable differences in wording</b>, not proof of intent. Style guides, section ' +
                  'conventions, deadline pressure and the space a headline has to fit into all produce the same signatures ' +
                  'as a deliberate slant would.</p>' +
                  '<p>Headlines are also frequently written by someone other than the reporter. A headline that leans ' +
                  'one way over a body that leans the other is a real and common pattern — and it is the newsroom’s ' +
                  'structure talking, not necessarily its politics.</p>'
      },

      /* ---------------------------------------------------------- 2B */
      {
        id: 'r2b', tag: 'Route 2B', name: 'The loaded-language meter',
        blurb: 'Zoom out from one event to 14,000 articles. Six dimensions of linguistic bias, eight sources, one grid.',
        figKind: 'Heatmap · diverging scale',
        opening: '<p>Close reading tells you what to look for. Counting tells you whether it holds. Every article in ' +
                 'the corpus is scored on six dimensions and standardised, so zero is the corpus average and the units ' +
                 'are standard deviations.</p>',
        stat: { value: '+' + gapInten + ' SD', caption: 'separates the most and least intensifier-heavy outlets in the Quebec corpus — the widest gap on any dimension we measured.' },
        scrolly: {
          side: 'left',
          figure: heatFig('qc'),
          steps: [
            { title: 'Grey is average',
              html: '<p>Blue cells sit below the corpus mean, red above. A newsroom that is grey all the way across ' +
                    'is not neutral in some absolute sense — it is average for this corpus.</p>',
              state: {} },
            { title: 'The wire anchors the bottom',
              html: '<p><b>Fil Public</b> is blue on every dimension. That is what wire style is for: copy that any ' +
                    'subscriber can run without rewriting it.</p><p>It is the closest thing this study has to a baseline.</p>',
              state: { highlightRow: 'fil' } },
            { title: 'The tabloids share a signature',
              html: '<p>Two tabloids in two provinces, writing in two languages, produce nearly the same row: ' +
                    'high on intensifiers, high on conflict metaphor, high on distancing.</p>' +
                    '<p>Genre travels further than geography.</p>',
              state: { highlightRow: 'matin' } },
            { title: 'One dimension at a time',
              html: '<p>Read down the <b>attribution gap</b> column instead. This is the difference between who gets ' +
                    'quoted in their own words and who gets paraphrased — a quieter signal than adjectives, and a more stable one.</p>',
              state: { highlightRow: null, highlightCol: 'attrib' } },
            { title: 'Now the referendum',
              html: '<p>The same eight sources covering Alberta. The rows keep their shape — but conflict metaphor ' +
                    'rises almost everywhere, including at the broadsheets.</p>' +
                    '<p>A binary question invites a binary frame.</p>',
              spec: heatFig('ab').spec, state: { highlightCol: 'metaph' } }
          ]
        },
        explorer: {
          title: 'Compare the two campaigns',
          text: 'Hover any cell for the dimension’s definition and the number of articles behind the score. ' +
                'The table view gives you the whole grid as numbers.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: heatFig('qc'),
          apply: function (v) { return { spec: heatFig(v.event).spec, state: {} }; }
        },
        takeaway: '<p>Standardisation is relative by construction: a score of 0 means “average for this corpus”, ' +
                  'not “unbiased”. If every source in a market leaned the same way, this grid would show nothing at all.</p>' +
                  '<p>Dimensions are also not independent. Intensifiers and conflict metaphor correlate strongly ' +
                  '(r ≈ 0.7 here), so a source that is red on one tends to be red on the other. Treat the row as a profile, ' +
                  'not six separate findings.</p>'
      },

      /* ---------------------------------------------------------- 2C */
      {
        id: 'r2c', tag: 'Route 2C', name: 'What the photographs say',
        blurb: 'A picture is a set of choices too: how high the camera sat, how close it got, which expression survived the edit.',
        figKind: 'Coded image grid · diverging bars',
        opening: '<p>Every published photograph was coded on five variables. None of them is about the subject — ' +
                 'all of them are about the photographer, the picture editor, and the moment that was chosen out of ' +
                 'the several hundred available.</p><p>The tiles below are drawn from the codes, not reproduced from the page.</p>',
        stat: { value: lowAngleSignal + '%', caption: 'of one partisan outlet’s images of its favoured camp were shot from a low angle — the framing that makes a subject look taller than the viewer.' },
        scrolly: {
          side: 'right',
          figure: imgFig(),
          steps: [
            { title: 'Read the grid',
              html: '<p>Each tile encodes one photograph. The horizon line shows the camera height, the circle size ' +
                    'shows how close the shot is, and the face shows the coded expression.</p>' +
                    '<p>The label under each tile is the value of whichever code you are currently looking at.</p>',
              state: { code: 'angle' } },
            { title: 'Camera angle is not neutral',
              html: '<p>A low angle puts the viewer below the subject. A high angle puts them above. It is the oldest ' +
                    'trick in the visual-framing literature, and it is still everywhere.</p>' +
                    '<p>Here is one partisan outlet’s output, on its own.</p>',
              state: { code: 'angle', source: 'signal' } },
            { title: 'The same outlet, the other camp',
              html: '<p>Filtered to the camp this outlet opposes, the angles invert.</p>' +
                    '<p>The asymmetry — not the absolute rate — is the measurement. Every outlet shoots some ' +
                    'low-angle pictures. The question is of whom.</p>',
              state: { code: 'angle', source: 'signal', actor: 'no' } },
            { title: 'Now expressions',
              html: '<p>Switch the code. Expression is coded from the face alone, blind to the caption and the story.</p>' +
                    '<p>At the public broadcaster the split is close to even. At the tabloids it is not.</p>',
              state: { code: 'expr', source: 'boreal', actor: null } },
            { title: 'And the setting',
              html: '<p>Podium, crowd, candid, institutional. A candid shot of a politician is a different claim about ' +
                    'them than a podium shot — informal, unguarded, sometimes unflattering.</p>',
              state: { code: 'set', source: null, actor: null } }
          ]
        },
        explorer: {
          title: 'The caption does its own work',
          text: 'An image and its caption can agree, or pull against each other. We coded the relationship for every ' +
                'image: does the caption reinforce what the picture suggests, contradict it, or stay out of the way?',
          controls: [],
          figure: {
            type: 'diverging',
            title: 'Image–caption relationship, by source',
            subtitle: 'Bars centred on the neutral category',
            caption: 'Coded on a sample of images per source. “Reinforces” means the caption strengthens the image’s implied evaluation of its subject.',
            spec: {
              categories: cc.categories, rows: cc.rows, centreIndex: cc.centreIndex,
              format: 'pct0', labelWidth: 170, rowHeight: 44
            }
          }
        },
        takeaway: '<p>Visual coding is the least reliable measurement in this study. Human coders agreed on camera ' +
                  'angle about nine times in ten, and on expression closer to seven — faces are ambiguous, and the ' +
                  'coder’s own expectations leak in.</p>' +
                  '<p>Photographers also do not choose the conditions. A candid shot may be the only frame available ' +
                  'from a scrum; a low angle may be where the photo pit was. <b>Treat the asymmetry between an outlet’s ' +
                  'own subjects as the finding, and the absolute rates as noise.</b></p>'
      }
    ],

    closing: {
      title: 'Wording is downstream of something.',
      text: 'Newsrooms do not invent their material. Parties, candidates and advocacy organisations push messages at ' +
            'them all day, and only some of those messages survive the trip. The next path follows one of them end to end.'
    },
    next: [
      { rq: 3, why: 'Where the words come from before a newsroom rewrites them.' },
      { rq: 4, why: 'What happens to a headline once a reader, not an editor, passes it along.' }
    ]
  };
}());
