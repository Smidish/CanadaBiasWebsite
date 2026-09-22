/* ------------------------------------------------------------------ *
 * Path 6 — Ask the Machine   (RQ6)
 * How AI assistants represent competing actors, issues and positions.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.rq6 = (function () {
  'use strict';
  var D = SITE.data, E = SITE.entities;

  var qs = D.modelAnswers();
  var cites = D.citations();

  function modelFig() {
    return {
      type: 'models',
      title: 'Five assistants, one campaign question',
      subtitle: 'Answers shortened for display · stance and hedging coded per answer',
      caption: 'Each answer is the modal response over 40 repeated prompts at a fixed date. Shading marks coded spans: hedging and leaning.',
      spec: { questions: qs }
    };
  }

  function langFig(qid) {
    return {
      type: 'slope',
      title: 'Mean stance in English and in French',
      subtitle: 'Same question, same day, same 40 repetitions per language',
      caption: 'Stance runs −1 to +1 relative to the question’s two framings. A flat line means the assistant answered the same way in both languages.',
      spec: {
        rows: D.modelLanguage(qid),
        fromLabel: 'English', toLabel: 'French',
        domain: [-0.45, 0.45], format: 'num2', leftWidth: 130, rightWidth: 90
      }
    };
  }

  function citeFig(modelId) {
    var m = E.assistants.filter(function (a) { return a.id === modelId; })[0];
    return {
      type: 'bars',
      title: 'Which outlets ' + m.name + ' cited, against their share of the corpus',
      subtitle: 'Citation share across all campaign questions',
      caption: 'Bar: share of this assistant’s citations pointing at each outlet. Black tick: that outlet’s share of all published campaign articles. Bars far right of their tick are over-cited relative to what was published.',
      spec: {
        rows: cites.map(function (c) {
          return { id: c.id, label: c.label, full: c.label + ' · ' + c.kind,
                   value: c.models[modelId], corpus: c.corpus, slot: E.sourceById[c.id].slot };
        }),
        format: 'pct0', reference: 'corpus', referenceName: 'Share of published corpus',
        valueName: 'Citation share', labelWidth: 160, rowHeight: 32
      }
    };
  }

  // Largest EN→FR stance movement across the three questions.
  var maxShift = 0, maxWho = '', maxQ = '';
  ['q1', 'q2', 'q3'].forEach(function (q) {
    D.modelLanguage(q).forEach(function (r) {
      if (Math.abs(r.to - r.from) > maxShift) { maxShift = Math.abs(r.to - r.from); maxWho = r.label; maxQ = q; }
    });
  });
  var spread = (function () {
    var s = qs[2].answers.map(function (a) { return a.stance; });
    return (Math.max.apply(null, s) - Math.min.apply(null, s)).toFixed(2);
  }());

  return {
    id: 'rq6', n: 6, accent: 6, rqId: 'RQ6',
    name: 'Ask the Machine',
    standfirst: 'A growing share of “what is going on in this election” now gets answered by a model rather than ' +
                'a masthead. So we asked five of them, forty times each, in two languages, and coded every answer ' +
                'the same way we coded the newspapers.',
    rqText: 'How do AI assistants represent competing actors, issues, and positions in responses to campaign-related questions, and how do their framing, stance, and cited sources vary across models, languages, and time?',

    routes: [
      /* ---------------------------------------------------------- 6A */
      {
        id: 'r6a', tag: 'Route 6A', name: 'Five models, one question',
        blurb: 'Read the answers side by side. The differences are not where you expect them.',
        figKind: 'Answer cards · inline coding',
        opening: '<p>Five assistants, anonymised as A to E, each asked the same campaign question forty times on the ' +
                 'same day. Below is the modal answer from each, with two things marked: <b>hedging</b> (language that ' +
                 'holds a claim loosely) and <b>leaning</b> (language that settles a contested question).</p>',
        stat: { value: spread, caption: 'the spread in mean stance across five assistants on a single question — “who is winning?” — asked on the same day.' },
        scrolly: {
          side: 'right',
          figure: modelFig(),
          steps: [
            { title: 'A legal question first',
              html: '<p>“Is the Alberta referendum question legally binding?” has a defensible factual answer and a ' +
                    'genuinely contested implication.</p><p>Watch which assistants separate the two.</p>',
              state: { qId: 'q1', focus: null } },
            { title: 'The careful answer',
              html: '<p>Assistant A states the legal position, names the disagreement, and stops. Its hedging score ' +
                    'is the highest in the set and its stance is near zero.</p>' +
                    '<p>That is not neutrality by luck. It is a particular answer shape.</p>',
              state: { qId: 'q1', focus: 'a' } },
            { title: 'The confident answer',
              html: '<p>Assistant E answers the political question the reader probably meant, and answers it in one ' +
                    'direction. Lowest hedging, highest stance.</p><p>Neither answer is false. They are different products.</p>',
              state: { qId: 'q1', focus: 'e' } },
            { title: 'Now an evaluative question',
              html: '<p>“Which party has the most credible costing?” has no neutral answer — “credible” is the ' +
                    'contested word.</p><p>Two assistants decline to rank. Three rank.</p>',
              state: { qId: 'q2', focus: null } },
            { title: 'And the horse race',
              html: '<p>“Who is winning?” produces the widest spread of the three. One assistant refuses the premise ' +
                    'outright and gives the polling error instead.</p>' +
                    '<p>If you asked one assistant, you got one campaign.</p>',
              state: { qId: 'q3', focus: null } },
            { title: 'Turn the coding off',
              html: '<p>Here are the same five answers without the shading — the way a voter would actually meet them.</p>' +
                    '<p>The differences are still there. They are just much harder to see.</p>',
              state: { qId: 'q3', coding: false } }
          ]
        },
        explorer: {
          title: 'Read them yourself',
          text: 'Pick a question and an assistant. Stance and hedging are shown as meters under each answer, ' +
                'with the outlets that answer cited.',
          controls: [
            { id: 'q', label: 'Question', type: 'select', value: 'q1',
              options: qs.map(function (q) { return { value: q.id, label: q.question }; }) },
            { id: 'm', label: 'Assistant', type: 'select', value: '',
              options: [{ value: '', label: 'All five' }].concat(
                E.assistants.map(function (a) { return { value: a.id, label: a.name }; })) },
            { id: 'coding', label: 'Inline coding', type: 'switch', value: 'on',
              options: [{ value: 'on', label: 'Show' }, { value: 'off', label: 'Hide' }] }
          ],
          figure: modelFig(),
          apply: function (v) { return { state: { qId: v.q, focus: v.m || null, coding: v.coding === 'on' } }; }
        },
        takeaway: '<p>Assistants are <b>non-deterministic and undated</b>. Every point here is a distribution over ' +
                  'repeated prompts at a stated moment; the same prompt next month may return something else, and ' +
                  'nothing announces the change.</p>' +
                  '<p>Prompt wording also moves these results more than model choice does. We hold the prompt fixed, ' +
                  'which makes the comparison clean and makes it a comparison of <i>one</i> phrasing.</p>'
      },

      /* ---------------------------------------------------------- 6B */
      {
        id: 'r6b', tag: 'Route 6B', name: 'Does the language change the answer?',
        blurb: 'Ask in English. Ask in French. Same model, same day, same question.',
        figKind: 'Slope chart · one line per model',
        opening: '<p>Both campaigns ran in a bilingual country and one of them ran mostly in French. If an assistant’s ' +
                 'answer depends on the language it was asked in, that is a property of its training data showing ' +
                 'through — and a very practical problem for the voter using it.</p>',
        stat: { value: (maxShift > 0 ? '+' : '') + maxShift.toFixed(2), caption: 'the largest English-to-French stance shift we measured for a single assistant on a single question. Two assistants barely moved at all.' },
        scrolly: {
          side: 'left',
          figure: langFig('q1'),
          steps: [
            { title: 'Flat lines are the good news',
              html: '<p>Two of the five assistants answer the legal question almost identically in both languages. ' +
                    'Their lines are nearly horizontal.</p>',
              state: {} },
            { title: 'The steep ones',
              html: '<p>The assistants that lean hardest in English lean less in French — and they are the same ' +
                    'assistants that hedge least.</p>' +
                    '<p>Confidence and language-sensitivity travel together here.</p>',
              state: { highlight: 'e' } },
            { title: 'The costing question',
              html: '<p>Switch questions. On the evaluative question the pattern reverses for one assistant: it is ' +
                    'more definite in French than in English.</p>',
              spec: langFig('q2').spec, state: { highlight: 'c' } },
            { title: 'And the horse race',
              html: '<p>On “who is winning?”, three of five assistants become <i>more</i> confident in French — the ' +
                    'language in which most of the Quebec coverage was published.</p>' +
                    '<p>More source material, more confidence. That is a plausible mechanism, not a demonstrated one.</p>',
              spec: langFig('q3').spec, state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Switch the question',
          text: 'Hover a line for both values and the size of the shift. Click a legend entry to isolate one assistant.',
          controls: [
            { id: 'q', label: 'Question', type: 'select', value: 'q1',
              options: qs.map(function (q) { return { value: q.id, label: q.question }; }) }
          ],
          figure: langFig('q1'),
          apply: function (v) { return { spec: langFig(v.q).spec, state: {} }; }
        },
        takeaway: '<p>A language difference is <b>not necessarily a bias</b>. The French-language corpus about Quebec ' +
                  'is genuinely larger and more detailed than the English one, so a more definite French answer may ' +
                  'simply be a better-informed one.</p>' +
                  '<p>Translation is also not free. Our two prompts are professional translations of each other, ' +
                  'but “credible”, “winning” and “binding” do not carry identical weight across the two languages, ' +
                  'and some of the gap is that.</p>'
      },

      /* ---------------------------------------------------------- 6C */
      {
        id: 'r6c', tag: 'Route 6C', name: 'Who do they cite?',
        blurb: 'An assistant’s citations are an editorial decision made at scale. Compare them with what was published.',
        figKind: 'Ranked bars · corpus reference marks',
        opening: '<p>When an assistant names its sources, it is making the same call an editor makes: whose account ' +
                 'of this is worth passing on. We counted every citation and set it against how much each outlet ' +
                 'actually published.</p><p>The black tick is the outlet’s share of the corpus. The bar is its share of the citations.</p>',
        stat: { value: '5.4×', caption: 'the factor by which the wire service was over-cited relative to its share of published articles by the most source-conservative assistant.' },
        scrolly: {
          side: 'right',
          figure: citeFig('a'),
          steps: [
            { title: 'Assistant A leans on institutions',
              html: '<p>The wire service and the public broadcaster take more than half of this assistant’s citations, ' +
                    'well above their share of what was published.</p>' +
                    '<p>The partisan digital outlet is almost absent.</p>',
              state: {} },
            { title: 'Assistant C does the opposite',
              html: '<p>Tabloid and partisan sources rise sharply; the wire falls below its corpus share.</p>' +
                    '<p>Same campaign, same available material, a very different bibliography.</p>',
              spec: citeFig('c').spec, state: {} },
            { title: 'Assistant E is the furthest out',
              html: '<p>Its most-cited outlet is the one with the highest linguistic-bias scores in Path 2, ' +
                    'at roughly four times that outlet’s share of published articles.</p>',
              spec: citeFig('e').spec, state: { highlight: 'signal' } },
            { title: 'Assistant D is closest to the corpus',
              html: '<p>Bars and ticks nearly line up. Whether that is the right target is a genuine question — ' +
                    '“cite in proportion to what was published” is a defensible rule and not an obviously correct one.</p>',
              spec: citeFig('d').spec, state: { highlight: null } }
          ]
        },
        explorer: {
          title: 'Any assistant',
          text: 'Switch between the five and watch the gaps move. Hover any row for both numbers.',
          controls: [
            { id: 'm', label: 'Assistant', type: 'switch', value: 'a',
              options: E.assistants.map(function (a) { return { value: a.id, label: a.name.replace('Assistant ', '') }; }) }
          ],
          figure: citeFig('a'),
          apply: function (v) { return { spec: citeFig(v.m).spec, state: {} }; }
        },
        takeaway: '<p>Citations are not the same as influence. An assistant can be shaped by material it never names, ' +
                  'and can name a source it barely used. <b>This measures what was shown to the user</b>, which is ' +
                  'the part that matters for a reader but is not the whole mechanism.</p>' +
                  '<p>Corpus share is also only one benchmark among several. Weighting by audience, by originality, ' +
                  'or by whether the outlet broke the story would each produce a different — and equally arguable — target.</p>'
      }
    ],

    closing: {
      title: 'Seven measurements, two campaigns.',
      text: 'You have now seen visibility, wording, images, message uptake, amplification, timing and machine answers. ' +
            'The last path asks the question that makes all of it worth doing: which of these patterns belong to ' +
            'these two campaigns, and which belong to campaign coverage in general?'
    },
    next: [
      { rq: 7, why: 'What holds across both campaigns — and what does not transfer at all.' },
      { rq: 2, why: 'The human coding scheme the assistant answers were scored against.' }
    ]
  };
}());
