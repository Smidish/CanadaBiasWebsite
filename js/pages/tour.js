/* tour.html — the default path. */
(function () {
  'use strict';
  if (!SITE.boot({})) return;
  SITE.renderTour(document.getElementById('tour'), SITE.TOUR);
  SITE.buildDoors(document.getElementById('doors'));
  SITE.landOnHash();
}());
