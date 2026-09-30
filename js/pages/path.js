/* path.html?rq=1…7 — one template, driven by the content objects. */
(function () {
  'use strict';
  var raw = new URLSearchParams(location.search).get('rq');
  var n = raw == null ? 1 : parseInt(raw, 10);
  var path = n >= 1 && n <= 7 ? SITE.CONTENT['rq' + n] : null;

  if (!SITE.boot({ activeN: path ? n : null })) return;

  if (!path) {
    document.title = 'Path not found · Same Campaign, Different Story';
    var m = document.createElement('meta');
    m.name = 'robots'; m.content = 'noindex';
    document.head.appendChild(m);
    document.getElementById('path').innerHTML =
      '<div class="wrap" style="padding:4rem 0 6rem"><p class="kicker"><span class="dot"></span>Not found</p>' +
      '<h1>That path isn’t here.</h1>' +
      '<p class="dek" style="margin-top:1rem">There are seven paths, numbered 1 to 7. Try ' +
      '<a href="index.html#paths">the seven doors</a> or <a href="tour.html">the guided tour</a> instead.</p></div>';
    return;
  }

  SITE.renderPath(document.getElementById('path'), path);
  SITE.setPageMeta({
    title: path.name + ' · Same Campaign, Different Story',
    description: path.standfirst.replace(/<[^>]+>/g, ''),
    path: 'path.html?rq=' + n
  });
  SITE.landOnHash();
}());
