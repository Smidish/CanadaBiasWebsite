/* ------------------------------------------------------------------ *
 * _entities.js — the cast.
 *
 * Every outlet, party, account and assistant name on this site is a
 * FICTIONAL PLACEHOLDER. They live here, in one object, so that when the
 * real analysis lands you can swap real names in with a single edit and
 * every figure, label, tooltip and table follows.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.entities = (function () {
  'use strict';

  // --- news sources -------------------------------------------------
  // `slot` is the categorical palette slot (1-8, fixed order, never cycled).
  var sources = [
    { id: 'boreal',    name: 'Radio Boréal',      short: 'Boréal',    kind: 'Public broadcaster', lang: 'FR/EN', slot: 1 },
    { id: 'depeche',   name: 'La Dépêche',        short: 'Dépêche',   kind: 'Legacy broadsheet',  lang: 'FR',    slot: 2 },
    { id: 'herald',    name: 'Prairie Herald',    short: 'Herald',    kind: 'Legacy broadsheet',  lang: 'EN',    slot: 3 },
    { id: 'matin',     name: 'Le Matin Express',  short: 'Matin',     kind: 'Tabloid',            lang: 'FR',    slot: 4 },
    { id: 'foothills', name: 'The Foothills Post',short: 'Foothills', kind: 'Tabloid',            lang: 'EN',    slot: 5 },
    { id: 'westwire',  name: 'WestWire',          short: 'WestWire',  kind: 'Digital native',     lang: 'EN',    slot: 6 },
    { id: 'fil',       name: 'Fil Public',        short: 'Fil',       kind: 'Wire service',       lang: 'FR/EN', slot: 7 },
    { id: 'signal',    name: 'Signal',            short: 'Signal',    kind: 'Partisan digital',   lang: 'EN',    slot: 8 }
  ];

  // --- Quebec: parties and leaders ----------------------------------
  var qcActors = [
    { id: 'cn',  name: 'Coalition Nationale',      short: 'CN',  leader: 'Élise Marchand',  lean: 'centre-right', slot: 1 },
    { id: 'pld', name: 'Parti Libéral-Démocrate',  short: 'PLD', leader: 'David Roy',       lean: 'centre',       slot: 2 },
    { id: 'ms',  name: 'Mouvement Solidaire',      short: 'MS',  leader: 'Amina Ouellet',   lean: 'left',         slot: 3 },
    { id: 'av',  name: 'Alliance Verte',           short: 'AV',  leader: 'Félix Nadeau',    lean: 'green',        slot: 4 },
    { id: 'pr',  name: 'Parti de la Relance',      short: 'PR',  leader: 'Jean-Guy Bérubé', lean: 'right',        slot: 5 }
  ];

  // --- Alberta: the two camps and the third-party advocates ---------
  var abActors = [
    { id: 'no',  name: 'One Canada Alberta',    short: 'No camp',  kind: 'Referendum committee', slot: 1 },
    { id: 'yes', name: 'Alberta Forward',       short: 'Yes camp', kind: 'Referendum committee', slot: 2 },
    { id: 'ewu', name: 'Energy Workers United', short: 'EWU',      kind: 'Advocacy',             slot: 4 },
    { id: 'tvc', name: 'Treaty Voices Coalition', short: 'TVC',    kind: 'Advocacy',             slot: 3 },
    { id: 'mt',  name: 'Municipalities Together', short: 'MT',     kind: 'Advocacy',             slot: 6 },
    { id: 'pta', name: 'Prairie Taxpayers Alliance', short: 'PTA', kind: 'Advocacy',             slot: 5 }
  ];

  // --- issues -------------------------------------------------------
  var qcIssues = [
    { id: 'cost',    name: 'Cost of living' },
    { id: 'health',  name: 'Health care' },
    { id: 'imm',     name: 'Immigration & language' },
    { id: 'econ',    name: 'Economy & jobs' },
    { id: 'climate', name: 'Climate & energy' },
    { id: 'ident',   name: 'Secularism & identity' },
    { id: 'housing', name: 'Housing' },
    { id: 'educ',    name: 'Education' }
  ];

  var abIssues = [
    { id: 'sov',     name: 'Sovereignty & constitution' },
    { id: 'energy',  name: 'Energy & pipelines' },
    { id: 'fiscal',  name: 'Equalisation & fiscal transfers' },
    { id: 'health',  name: 'Health care' },
    { id: 'treaty',  name: 'Treaty & Indigenous rights' },
    { id: 'econ',    name: 'Economy & jobs' },
    { id: 'cost',    name: 'Cost of living' },
    { id: 'fed',     name: 'Federal relations' }
  ];

  // --- social groups ------------------------------------------------
  // `pop` is the group's share of the provincial adult population, used as
  // the reference line in the "who's missing" figure.
  var groups = [
    { id: 'young',   name: 'Voters under 35',        pop: 0.238 },
    { id: 'senior',  name: 'Voters 65+',             pop: 0.226 },
    { id: 'newcom',  name: 'Newcomers & immigrants', pop: 0.151 },
    { id: 'indig',   name: 'Indigenous peoples',     pop: 0.062 },
    { id: 'rural',   name: 'Rural residents',        pop: 0.174 },
    { id: 'renters', name: 'Renters',                pop: 0.331 },
    { id: 'workers', name: 'Energy & union workers', pop: 0.118 },
    { id: 'lowinc',  name: 'Low-income households',  pop: 0.204 },
    { id: 'ling',    name: 'Linguistic minorities',  pop: 0.093 }
  ];

  // --- linguistic bias dimensions -----------------------------------
  var biasDims = [
    { id: 'epi',    name: 'Epistemological',  gloss: 'Verbs that cast doubt on or endorse a claim — “admitted”, “claimed”, “revealed”.' },
    { id: 'inten',  name: 'Intensifiers',     gloss: 'Subjective amplifiers attached to one side — “sweeping”, “radical”, “historic”.' },
    { id: 'attrib', name: 'Attribution gap',  gloss: 'Direct quotation vs. paraphrase. Who gets to speak in their own words.' },
    { id: 'agency', name: 'Agency deletion',  gloss: 'Actions without actors — “cuts were made”, “the promise was broken”.' },
    { id: 'dist',   name: 'Distancing',       gloss: 'Demonstratives and scare quotes that hold a term at arm’s length.' },
    { id: 'metaph', name: 'Conflict metaphor',gloss: 'War and sport framing — “attack”, “battleground”, “knockout”.' }
  ];

  // --- visual coding scheme -----------------------------------------
  var visualCodes = [
    { id: 'angle',  name: 'Camera angle',   levels: ['Low (looking up)', 'Eye level', 'High (looking down)'] },
    { id: 'shot',   name: 'Shot size',      levels: ['Close-up', 'Medium', 'Wide'] },
    { id: 'expr',   name: 'Expression',     levels: ['Positive', 'Neutral', 'Negative'] },
    { id: 'set',    name: 'Setting',        levels: ['Podium', 'Crowd', 'Candid', 'Institutional'] },
    { id: 'gaze',   name: 'Gaze',           levels: ['To camera', 'Off-frame', 'Downward'] }
  ];

  // --- AI assistants (anonymised on purpose) ------------------------
  var assistants = [
    { id: 'a', name: 'Assistant A', slot: 1 },
    { id: 'b', name: 'Assistant B', slot: 2 },
    { id: 'c', name: 'Assistant C', slot: 3 },
    { id: 'd', name: 'Assistant D', slot: 4 },
    { id: 'e', name: 'Assistant E', slot: 5 }
  ];

  // --- the two campaigns --------------------------------------------
  var events = {
    qc: {
      id: 'qc',
      name: 'Quebec general election',
      shortName: 'Quebec',
      kind: 'General election',
      dayZero: '2026-08-26',
      days: 41,
      votingDay: 'Election day',
      actors: qcActors,
      issues: qcIssues,
      blurb: 'Five parties, 125 seats, a five-and-a-half week campaign.'
    },
    ab: {
      id: 'ab',
      name: 'Alberta referendum',
      shortName: 'Alberta',
      kind: 'Referendum',
      dayZero: '2026-08-26',
      days: 41,
      votingDay: 'Referendum day',
      actors: abActors,
      issues: abIssues,
      blurb: 'One question, two camps, four advocacy campaigns spending alongside them.'
    }
  };

  function byId(list) {
    var m = {};
    list.forEach(function (d) { m[d.id] = d; });
    return m;
  }

  return {
    sources: sources,
    sourceById: byId(sources),
    qcActors: qcActors,
    abActors: abActors,
    actorById: byId(qcActors.concat(abActors)),
    qcIssues: qcIssues,
    abIssues: abIssues,
    groups: groups,
    biasDims: biasDims,
    visualCodes: visualCodes,
    assistants: assistants,
    events: events,
    // Campaign-day label helper: "Day 12 · 7 Sept"
    dayLabel: function (i) {
      var d = new Date('2026-08-26T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + i);
      return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }
  };
}());
