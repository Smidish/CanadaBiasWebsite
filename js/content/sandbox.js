/* ------------------------------------------------------------------ *
 * sandbox.js — a scratch path for trying snippets out (sandbox.html).
 *
 * Paste routes, steps and figures from template.html in here, open
 * sandbox.html, and scroll through them exactly as they will appear on
 * a real path. When one looks right, move it into js/content/rqN.js.
 * Development only: not linked from the site and not deployed.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};
SITE.CONTENT = SITE.CONTENT || {};

SITE.CONTENT.sandbox = (function () {
  'use strict';

  return {
    id: 'sandbox', n: 0, accent: 6, rqId: 'Sandbox',
    name: 'Sandbox',
    standfirst: 'A scratch path. Paste snippets from template.html into js/content/sandbox.js and reload.',
    rqText: 'Nothing on this page is published.',

    routes: [
      /* ══ CONTENT · Route 1D ═══════════════════════════════════════
         Paste inside the routes: [ … ] array of js/content/rqN.js,
         after the closing }, of the previous route. ═════════════════ */
      {
        id: 'r1d',                        // unique on the page; also the #anchor
        tag: 'Route 1D',
        name: 'The route’s name',
        blurb: 'One sentence for the route card at the top of the path.',
        figKind: 'Bars · switch the campaign',   // small label on the route card
        opening: '<p>The paragraph on the title card. Say what the reader is about to see.</p>',
        stat: { value: '42%', caption: 'what the headline number means, in one sentence.' },

        scrolly: {
          side: 'right',                  // where the figure sits on wide screens: 'right' | 'left'
          figure: {                       // ← replace with any figure snippet below
            type: 'bars',
            title: 'Figure title',
            subtitle: 'What, where, which sources',
            caption: 'How to read it, in one or two sentences.',
            spec: {
              format: 'pctv', valueName: 'Share',
              rows: [
                { id: 'a', label: 'First row', value: 42, slot: 1 },
                { id: 'b', label: 'Second row', value: 31, slot: 2 },
                { id: 'c', label: 'Third row', value: 27, slot: 3 }
              ]
            }
          },
          steps: [
            { title: 'Start with the whole picture',
              html: '<p>First comment. One idea per step.</p>',
              state: {} },
            { title: 'Then point at one thing',
              html: '<p>Numbers read best as <b class="num">42%</b>.</p>',
              state: { highlight: 'a' } },
            { title: 'Change the data mid-walk',
              html: '<p>A step can swap the data behind the figure as well as its state.</p>',
              spec: { format: 'pctv', valueName: 'Share', rows: [
                { id: 'a', label: 'First row', value: 35, slot: 1 },
                { id: 'b', label: 'Second row', value: 38, slot: 2 },
                { id: 'c', label: 'Third row', value: 27, slot: 3 }
              ] },
              state: { highlight: null } }
          ]
        },

        // Optional: the same figure with controls. Delete the whole block to leave it out.
        explorer: {
          title: 'Run it yourself',
          text: 'Pick a campaign. Hover any bar for its value, or open the table.',
          controls: [
            { id: 'event', label: 'Campaign', type: 'switch', value: 'qc',
              options: [{ value: 'qc', label: 'Quebec election' }, { value: 'ab', label: 'Alberta referendum' }] }
          ],
          figure: { type: 'bars', title: 'Figure title', caption: 'How to read it.',
            spec: { format: 'pctv', rows: [{ id: 'a', label: 'First row', value: 42, slot: 1 }, { id: 'b', label: 'Second row', value: 31, slot: 2 }] } },
          // runs on every control change with the current values, e.g. { event: 'ab' }
          apply: function (v) {
            var rows = v.event === 'qc'
              ? [{ id: 'a', label: 'First row', value: 42, slot: 1 }, { id: 'b', label: 'Second row', value: 31, slot: 2 }]
              : [{ id: 'a', label: 'First row', value: 18, slot: 1 }, { id: 'b', label: 'Second row', value: 55, slot: 2 }];
            return { spec: { format: 'pctv', rows: rows } };
          }
        },

        takeaway: '<p>What this measurement shows — and, just as plainly, what it cannot.</p>'
      }
    ],

    closing: {
      title: 'End of the sandbox.',
      text: 'Move whatever works into the real path file.'
    },
    next: [
      { rq: 1, why: 'Back to a real path.' }
    ]
  };
}());
