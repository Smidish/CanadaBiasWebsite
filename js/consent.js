/* ------------------------------------------------------------------ *
 * consent.js — the consent banner (Klaro, self-hosted) and Google
 * Analytics 4 behind it, with Google Consent Mode v2 in *basic* mode:
 *
 *   · every consent type defaults to "denied"
 *   · no Google script is requested at all until the reader accepts
 *   · accepting loads gtag.js with analytics_storage granted; ad_* types
 *     stay denied for good — this site runs no advertising
 *   · declining later switches GA off for the rest of the page view and
 *     Klaro deletes the _ga cookies
 *
 * Must load after env.js and before js/lib/klaro.js, which reads
 * window.klaroConfig when it starts.
 *
 * Analytics only ever fires in production with a real measurement ID
 * (SITE.env.analytics). Locally and on staging the banner still shows so
 * it can be tested, and accepting just logs what would have happened.
 *
 * GA property settings to make in the GA admin (not code):
 *   TODO(analytics): Data retention → 2 months · Google signals → off ·
 *   Granular location and device data → off · accept the Data
 *   Processing Terms (Admin → Account settings).
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

(function () {
  'use strict';
  var env = SITE.env, C = SITE.config;
  var GA = C.gaMeasurementId;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });

  var loaded = false;
  function acceptAnalytics() {
    if (!env.analytics) {
      if (window.console) console.info('[consent] analytics accepted — GA would load here in production (' + env.name + ')');
      return;
    }
    window['ga-disable-' + GA] = false;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    if (loaded) return;
    loaded = true;
    gtag('js', new Date());
    gtag('config', GA, {
      cookie_domain: location.hostname,        // scope the cookies to this subdomain
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.appendChild(s);
  }
  function declineAnalytics() {
    gtag('consent', 'update', { analytics_storage: 'denied' });
    window['ga-disable-' + GA] = true;
  }

  window.klaroConfig = {
    version: 1,
    elementID: 'klaro',
    storageMethod: 'localStorage',
    storageName: 'scds.consent.v1',
    privacyPolicy: 'datenschutz.html',
    lang: (document.documentElement.lang || 'en').slice(0, 2) === 'de' ? 'de' : 'en',
    default: false,
    mustConsent: false,
    acceptAll: true,
    hideDeclineAll: false,
    hideLearnMore: false,
    noticeAsModal: false,
    groupByPurpose: false,
    htmlTexts: false,
    styling: { theme: ['light', 'bottom', 'wide'] },

    translations: {
      zz: { privacyPolicyUrl: 'datenschutz.html' },
      en: {
        consentNotice: {
          description: 'With your permission we use Google Analytics to count visits and see which parts of ' +
            'the site are read. It is off unless you switch it on. {privacyPolicy}.',
          learnMore: 'Choose'
        },
        consentModal: {
          title: 'Privacy settings',
          description: 'Nothing here is needed for the site to work. The site also keeps your colour theme and ' +
            'the paths you have visited in your browser’s own storage; that never leaves your device.'
        },
        purposes: { analytics: { title: 'Audience measurement' } },
        'google-analytics': {
          title: 'Google Analytics 4',
          description: 'Counts page views and scroll depth. Provided by Google Ireland Ltd.; data may be ' +
            'processed in the USA (EU–US Data Privacy Framework). IP addresses are not stored.'
        }
      },
      de: {
        consentNotice: {
          description: 'Mit Ihrer Einwilligung nutzen wir Google Analytics, um Besuche zu zählen und zu sehen, ' +
            'welche Teile der Seite gelesen werden. Ohne Ihre Zustimmung bleibt es aus. {privacyPolicy}.',
          learnMore: 'Auswählen'
        },
        purposes: { analytics: { title: 'Reichweitenmessung' } },
        'google-analytics': {
          title: 'Google Analytics 4',
          description: 'Zählt Seitenaufrufe und Scrolltiefe. Anbieter: Google Ireland Ltd.; Verarbeitung ' +
            'ggf. in den USA (EU-US Data Privacy Framework). IP-Adressen werden nicht gespeichert.'
        }
      }
    },

    services: [{
      name: 'google-analytics',
      purposes: ['analytics'],
      required: false,
      optOut: false,
      default: false,
      cookies: [[/^_ga/, '/', location.hostname], [/^_ga/, '/', '.' + location.hostname], /^_ga/],
      // Functions, not strings: Klaro only needs eval-like code for string
      // callbacks, so this keeps it working under a strict CSP.
      onAccept: acceptAnalytics,
      onDecline: declineAnalytics
    }]
  };

  // Klaro's notice is a role="dialog" without a name; give it one.
  if (window.MutationObserver) {
    new MutationObserver(function () {
      var n = document.getElementById('klaro-cookie-notice');
      if (n && !n.hasAttribute('aria-label')) n.setAttribute('aria-label', 'Privacy settings');
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // "Cookie settings" links in the footer reopen the consent dialog.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-consent-open]');
    if (!b) return;
    e.preventDefault();
    if (window.klaro && window.klaro.show) window.klaro.show(undefined, true);
  });
}());
