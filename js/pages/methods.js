/* methods.html — the placeholder cast is drawn from the entities file. */
(function () {
  'use strict';
  if (!SITE.boot({})) return;
  document.getElementById('cast').innerHTML = SITE.entities.sources.map(function (s) {
    return '<div><b><i style="background:var(--series-' + s.slot + ')"></i>' + s.name + '</b>' +
           '<span>' + s.kind + ' · ' + s.lang + ' · fictional placeholder</span></div>';
  }).join('');
}());
