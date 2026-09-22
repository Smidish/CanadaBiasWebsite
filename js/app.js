/* ------------------------------------------------------------------ *
 * app.js — chrome shared by every page.
 * Rail, theme, reading progress, "paths you've been down", the hub
 * doors, and the ambient hero field.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

(function () {
  'use strict';
  var KEY = 'scds.seen.v1';
  var THEME = 'scds.theme.v1';

  /* ---- progress memory ------------------------------------------- */
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }

  SITE.seen = read;
  SITE.markSeen = function (n) {
    var a = read();
    if (a.indexOf(n) < 0) { a.push(n); write(a); }
    paintPips();
  };

  /* ---- theme ------------------------------------------------------ */
  function currentTheme() {
    try { return localStorage.getItem(THEME) || 'system'; } catch (e) { return 'system'; }
  }
  function applyTheme(t) {
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME, t); } catch (e) {}
    window.dispatchEvent(new CustomEvent('themechange'));
  }
  function resolved() {
    var t = currentTheme();
    if (t !== 'system') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  // apply before first paint where possible
  applyThemeQuiet();
  function applyThemeQuiet() {
    var t = currentTheme();
    if (t !== 'system') document.documentElement.setAttribute('data-theme', t);
  }

  /* ---- the rail --------------------------------------------------- */
  var SUN = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="3.2" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2 3.1 3.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var MOON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.5 9.6A6 6 0 0 1 6.4 2.5a6 6 0 1 0 7.1 7.1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  SITE.buildRail = function (activeN) {
    var rail = document.querySelector('.rail');
    if (!rail) return;
    var M = SITE.manifest;
    var pips = M.paths.map(function (p) {
      return '<button class="pip" type="button" data-n="' + p.n + '" ' +
        (activeN === p.n ? 'aria-current="page" ' : '') +
        'title="Path ' + p.n + ' — ' + p.name + '" aria-label="Path ' + p.n + ': ' + p.name + '"></button>';
    }).join('');
    rail.innerHTML =
      '<div class="rail-inner">' +
        '<a class="rail-logo" href="index.html">Same Campaign, <span>Different Story</span></a>' +
        '<div class="rail-spacer"></div>' +
        '<div class="pips" role="navigation" aria-label="The seven paths">' + pips + '</div>' +
        '<span class="sim-badge" title="Every number on this site is a placeholder generated for the prototype.">Simulated<span class="long"> data</span></span>' +
        '<a class="rail-link" href="methods.html">Methods</a>' +
        '<button class="icon-btn" type="button" id="themeBtn" aria-label="Switch colour theme"></button>' +
      '</div>';

    rail.querySelectorAll('.pip').forEach(function (b) {
      b.addEventListener('click', function () { location.href = 'path.html?rq=' + b.dataset.n; });
    });

    var btn = rail.querySelector('#themeBtn');
    function paintBtn() { btn.innerHTML = resolved() === 'dark' ? SUN : MOON; }
    paintBtn();
    btn.addEventListener('click', function () {
      applyTheme(resolved() === 'dark' ? 'light' : 'dark');
      paintBtn();
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (currentTheme() === 'system') { paintBtn(); window.dispatchEvent(new CustomEvent('themechange')); }
    });

    paintPips();
  };

  function paintPips() {
    var s = read();
    document.querySelectorAll('.pip').forEach(function (p) {
      p.dataset.seen = s.indexOf(+p.dataset.n) >= 0 ? '1' : '0';
    });
    document.querySelectorAll('.door').forEach(function (d) {
      d.dataset.seen = s.indexOf(+d.dataset.n) >= 0 ? '1' : '0';
    });
  }

  /* ---- reading progress bar --------------------------------------- */
  SITE.progressBar = function () {
    var bar = document.createElement('div');
    bar.className = 'progress';
    document.body.appendChild(bar);
    var ticking = false;
    function upd() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
    }
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true; requestAnimationFrame(upd);
    }, { passive: true });
    upd();
  };

  /* ---- the seven doors -------------------------------------------- */
  var ARROW = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var TOUR_DOOR =
    '<a class="door door-tour" href="tour.html" style="--door-accent:var(--ink);--door-accent-ink:var(--ink)">' +
    '<span class="door-n num">↗</span>' +
    '<h3>Not sure where to start?</h3>' +
    '<p>The guided tour takes one headline result from each of the seven questions, in about eight minutes, ' +
    'and opens a door into the full path at every stop.</p>' +
    '<span class="door-meta"><span class="door-rq">The default path</span>' +
    '<span class="door-go">Start' + ARROW + '</span></span></a>';

  SITE.buildDoors = function (mount) {
    var M = SITE.manifest;
    mount.innerHTML = M.paths.map(function (p) {
      return '<a class="door" href="path.html?rq=' + p.n + '" data-n="' + p.n + '" ' +
        'style="--door-accent:var(--series-' + p.accent + ');--door-accent-ink:color-mix(in srgb, var(--series-' + p.accent + ') 82%, #0b0b0b)">' +
        '<span class="door-n num">' + p.n + '</span>' +
        '<h3>' + p.name + '</h3>' +
        '<p>' + p.question + '</p>' +
        '<span class="door-meta"><span class="door-rq">' + p.rqId + ' · ' + p.minutes + ' min</span>' +
        '<span class="door-go">Open' + ARROW + '</span></span></a>';
    }).join('') + (mount.dataset.tourDoor === 'off' ? '' : TOUR_DOOR);
    // dark mode needs the lighter ink step
    if (document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      mount.querySelectorAll('.door[data-n]').forEach(function (d) {
        var p = M.paths.filter(function (x) { return x.n === +d.dataset.n; })[0];
        if (p) d.style.setProperty('--door-accent-ink', 'color-mix(in srgb, var(--series-' + p.accent + ') 78%, #ffffff)');
      });
    }
    paintPips();
  };

  /* ---- the left-hand contents rail --------------------------------- *
   * A plain list of what is on this page, with the section you are in
   * marked and the steps inside it filling as you go. Click to jump.
   * ------------------------------------------------------------------ */
  SITE.buildToc = function (nav, spec) {
    if (!nav || !spec || !spec.items.length) return;
    document.body.classList.add('has-toc');

    nav.innerHTML =
      '<ol class="toc-list">' +
      spec.items.map(function (it) {
        return '<li class="toc-item' + (it.kind === 'title' ? ' toc-item--title' : '') + '" data-target="' + it.id + '">' +
          '<a href="#' + it.id + '"><span class="toc-bar"></span>' +
          '<span class="toc-txt">' + (it.tag ? '<b>' + it.tag + '</b>' : '') + it.label + '</span></a>' +
          (it.steps ? '<span class="toc-steps" aria-hidden="true">' +
            new Array(it.steps + 1).join('<i></i>') + '</span>' : '') +
        '</li>';
      }).join('') + '</ol>';

    var items = Array.prototype.map.call(nav.querySelectorAll('.toc-item'), function (li) {
      return { li: li, id: li.dataset.target, pips: li.querySelectorAll('.toc-steps i') };
    });

    var ticking = false;
    function spy() {
      ticking = false;
      var line = window.innerHeight * 0.4;
      var active = 0;
      items.forEach(function (it, i) {
        var t = document.getElementById(it.id);
        if (t && t.getBoundingClientRect().top <= line) active = i;
      });
      items.forEach(function (it, i) {
        it.li.dataset.on = i === active ? '1' : '0';
        it.li.dataset.done = i < active ? '1' : '0';
        if (i === active && it.pips.length) {
          var sec = document.getElementById(it.id);
          var steps = sec ? sec.querySelectorAll('.step') : [];
          var at = -1;
          for (var k = 0; k < steps.length; k++) if (steps[k].classList.contains('is-active')) at = k;
          it.pips.forEach(function (pip, k) { pip.dataset.on = k <= at ? '1' : '0'; });
        }
      });
    }
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true; requestAnimationFrame(spy);
    }, { passive: true });
    window.addEventListener('resize', spy);
    spy();
  };

  /* ---- ambient hero field ----------------------------------------- *
   * Every dot is one article. They start as noise and settle into the
   * seven columns the site is organised around. Purely decorative.
   * ------------------------------------------------------------------ */
  SITE.heroField = function (canvas) {
    if (!canvas) return;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ctx = canvas.getContext('2d');
    var dots = [], N = 460, raf = null, t0 = null;

    function palette() {
      var cs = getComputedStyle(document.documentElement);
      return SITE.manifest.paths.map(function (p) { return cs.getPropertyValue('--series-' + p.accent).trim(); });
    }
    var cols = palette();

    function size() {
      var r = canvas.parentElement.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout(r.width, r.height);
    }

    function layout(w, h) {
      var lanes = 7;
      var laneW = w / lanes;
      dots.forEach(function (d, i) {
        var lane = i % lanes;
        d.tx = laneW * lane + laneW * (0.25 + 0.5 * d.r1);
        d.ty = h * (0.16 + 0.68 * d.r2);
        d.c = cols[lane];
      });
    }

    for (var i = 0; i < N; i++) {
      dots.push({ x: Math.random(), y: Math.random(), r1: Math.random(), r2: Math.random(),
                  s: 0.8 + Math.random() * 1.7, ph: Math.random() * 6.28 });
    }

    function frame(ts) {
      if (t0 === null) t0 = ts;
      var el = Math.min(1, (ts - t0) / 2600);
      var e = 1 - Math.pow(1 - el, 3);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      dots.forEach(function (d, i) {
        var sx = d.x * w, sy = d.y * h;
        var x = sx + (d.tx - sx) * e;
        var y = sy + (d.ty - sy) * e + (reduced ? 0 : Math.sin(ts / 2200 + d.ph) * 4 * e);
        ctx.globalAlpha = 0.16 + 0.42 * e * (0.4 + 0.6 * d.r1);
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.arc(x, y, d.s, 0, 6.2832);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (!reduced || el < 1) raf = requestAnimationFrame(frame);
    }

    size();
    window.addEventListener('resize', function () { size(); });
    window.addEventListener('themechange', function () { cols = palette(); size(); });
    if (reduced) { t0 = -3000; frame(0); }
    else raf = requestAnimationFrame(frame);
  };

  /* ---- dependency tripwire ---------------------------------------- *
   * If a content module fails to load, every global it defines is simply
   * missing and the page dies quietly — static text renders, nothing works.
   * That is exactly what GitHub Pages does to the underscore-prefixed files
   * unless a .nojekyll sits at the repo root, so say so out loud instead of
   * leaving a blank page to interpret.
   * ------------------------------------------------------------------ */
  var MODULE_OF = {
    manifest: 'js/content/_manifest.js',
    entities: 'js/content/_entities.js',
    data: 'js/content/_data.js',
    Charts: 'js/charts.js',
    Figure: 'js/render.js'
  };

  function assertDeps() {
    var need = ['manifest'];
    // a page that mounts figures needs the chart stack as well
    if (document.getElementById('path') || document.getElementById('tour')) {
      need = need.concat(['entities', 'data', 'Charts', 'Figure']);
    }
    var missing = need.filter(function (k) { return !SITE[k]; });
    if (!missing.length) return true;

    var files = missing.map(function (k) { return MODULE_OF[k]; });
    var bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:relative;z-index:99;margin:0;padding:1rem 1.2rem;' +
      'background:#fdf1d4;color:#5c3d00;border-bottom:1px solid #f0d79a;' +
      'font:14px/1.5 system-ui,sans-serif';
    bar.innerHTML =
      '<b>This page could not load part of itself, so nothing on it will work.</b><br>' +
      'Missing: <code>' + files.join('</code>, <code>') + '</code>. ' +
      'If this is a GitHub Pages deploy, add an empty <code>.nojekyll</code> file to the ' +
      'repository root — Jekyll silently drops files whose names begin with an underscore.';
    document.body.insertBefore(bar, document.body.firstChild);
    if (window.console) console.error('[site] missing modules:', files.join(', '));
    return false;
  }

  /* ---- boot ------------------------------------------------------- */
  SITE.boot = function (opts) {
    opts = opts || {};
    if (!assertDeps()) return false;
    SITE.buildRail(opts.activeN);
    SITE.progressBar();
    return true;
  };
}());
