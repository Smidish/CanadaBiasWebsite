/* ------------------------------------------------------------------ *
 * env.js — where is this copy of the site running?
 *
 * Loaded first, in <head>, on every page. It decides once, from the
 * hostname, which of three places this is and switches behaviour to
 * match. Everything else reads SITE.env instead of sniffing the URL.
 *
 *   local       file://, localhost, 127.0.0.1, LAN addresses
 *   staging     the GitHub Pages copy (*.github.io) — and any host we do
 *               not recognise, so a stray copy is never indexed or tracked
 *   production  the real domain on all-inkl
 *
 *                     local   staging   production
 *   search indexing     –        –          ✓
 *   Google Analytics    –        –          ✓ (after consent only)
 *   consent banner      ✓        ✓          ✓   (so it can be tested)
 *   ?slots overlay      ✓        ✓          –
 *   corner badge      "Local" "Staging"     –
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.config = {
  productionHosts: ['canada.media-bias-research.org', 'www.canada.media-bias-research.org'],
  productionOrigin: 'https://canada.media-bias-research.org',
  // TODO(analytics): paste the GA4 measurement ID (Admin → Data streams → Web).
  // While it is the placeholder, analytics stays off even in production.
  gaMeasurementId: 'G-XXXXXXXXXX'
};

SITE.env = (function () {
  'use strict';
  var C = SITE.config;
  var host = (location.hostname || '').toLowerCase();
  var name;

  if (location.protocol === 'file:' || host === '' || host === 'localhost' || host === '127.0.0.1' ||
      host === '[::1]' || /\.local$/.test(host) || /^(10|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(host)) {
    name = 'local';
  } else if (C.productionHosts.indexOf(host) >= 0) {
    name = 'production';
  } else {
    name = 'staging';
  }

  var gaReady = /^G-[A-Z0-9]{6,}$/.test(C.gaMeasurementId) && C.gaMeasurementId !== 'G-XXXXXXXXXX';
  var params = new URLSearchParams(location.search);

  var env = {
    name: name,
    isLocal: name === 'local',
    isStaging: name === 'staging',
    isProduction: name === 'production',
    indexable: name === 'production',
    analytics: name === 'production' && gaReady,
    consentBanner: true,
    slots: name !== 'production' && params.has('slots')
  };

  var root = document.documentElement;
  root.dataset.env = name;

  // Not production: keep it out of search results. Injected during head
  // parsing, before any crawler-visible content.
  if (!env.indexable) {
    var m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow';
    document.head.appendChild(m);
  }

  if (env.slots) root.classList.add('show-slots');

  // A small corner badge, so a screenshot always says which copy it came from.
  if (name !== 'production') {
    document.addEventListener('DOMContentLoaded', function () {
      var b = document.createElement('div');
      b.className = 'env-badge';
      b.textContent = name === 'local' ? 'Local' : 'Staging';
      b.title = 'This is the ' + name + ' copy of the site. It is not indexed and runs no analytics.' +
                (env.slots ? '' : ' Add ?slots to the URL to outline every editable content slot.');
      document.body.appendChild(b);
    });
  }

  return env;
}());
