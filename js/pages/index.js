/* index.html — the hub. */
(function () {
  'use strict';
  if (!SITE.boot({})) return;
  SITE.buildDoors(document.getElementById('doors'));
  SITE.heroField(document.querySelector('.hero-canvas'));
}());
