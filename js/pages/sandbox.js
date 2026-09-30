/* sandbox.html — renders js/content/sandbox.js as if it were a path. */
(function () {
  'use strict';
  if (!SITE.boot({})) return;
  SITE.renderPath(document.getElementById('path'), SITE.CONTENT.sandbox);
  SITE.landOnHash();
}());
