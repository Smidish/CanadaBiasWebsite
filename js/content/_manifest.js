/* ------------------------------------------------------------------ *
 * _manifest.js — the seven paths, as the hub and the rail see them.
 * Loaded on every page; the full content of a path is loaded only on
 * the path page itself.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.manifest = {
  title: 'Same Campaign, Different Story',
  standfirst: 'Two provinces voted in the same five weeks. One chose a government, the other answered a question. ' +
              'We measured how the coverage was built — who appeared, in whose words, and what travelled.',
  paths: [
    {
      n: 1, id: 'rq1', rqId: 'RQ1', accent: 1,
      name: 'Who Gets the Mic',
      question: 'Attention is the scarcest thing in a campaign. Who received it, who was left out — and did every newsroom make the same call?',
      minutes: 6
    },
    {
      n: 2, id: 'rq2', rqId: 'RQ2', accent: 2,
      name: 'The Words We Choose',
      question: 'Two newsrooms, one event, one afternoon. What changes between them when the facts do not?',
      minutes: 8
    },
    {
      n: 3, id: 'rq3', rqId: 'RQ3', accent: 3,
      name: 'From Press Release to Print',
      question: 'Campaigns push messages. Newsrooms pick some up and drop the rest. Follow one message through the pipe.',
      minutes: 6
    },
    {
      n: 4, id: 'rq4', rqId: 'RQ4', accent: 7,
      name: 'The Amplifiers',
      question: 'A story leaves the newsroom and enters the feed. What happens to it there — and who is doing the passing on?',
      minutes: 7
    },
    {
      n: 5, id: 'rq5', rqId: 'RQ5', accent: 8,
      name: 'Coverage and the Polls',
      question: 'Coverage and standing move together through a campaign. The interesting question is which one moves first.',
      minutes: 7
    },
    {
      n: 6, id: 'rq6', rqId: 'RQ6', accent: 6,
      name: 'Ask the Machine',
      question: 'A voter asks an AI assistant who to believe. Five assistants answer. Do they answer the same way — in both languages?',
      minutes: 7
    },
    {
      n: 7, id: 'rq7', rqId: 'RQ7', accent: 5,
      name: 'Two Campaigns, One Pattern',
      question: 'Strip away the subject matter. Is an election covered the same way as a referendum — and what does not transfer?',
      minutes: 6
    }
  ]
};
