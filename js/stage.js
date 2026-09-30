/* ------------------------------------------------------------------ *
 * stage.js — scene transitions.
 *
 * A route is a scene, not a stretch of page. Its stage pins to the
 * viewport and scroll position drives three cross-fades:
 *
 *   title in  →  title out / figure in  →  everything out
 *
 * Nothing slides. The figure appears where it will live. The only thing
 * that physically scrolls is the column of step boxes riding over the
 * stage, and by the time the next scene's title fades in, the previous
 * scene has already gone to zero.
 *
 * Behind each title card an ambient canvas previews the shape of the
 * figure that is about to arrive — ribbons for a stream, a lattice for a
 * heatmap, a scatter for a scatter, and so on.
 *
 * The title card arrives as soon as the stage pins and then holds for
 * most of a screen of scrolling. A proximity snap point sits in the hold
 * (html.has-stage in base.css), so a reader who stops anywhere near it
 * settles on the card; the "Keep scrolling" arrow skips to step one.
 *
 * Deck mode (per route, measured): when the step boxes would cover more
 * than DECK_OVERLAP of the figure — phones, mostly — the steps move into
 * a dock under the figure and page sideways by swipe, the dock's arrows,
 * or ← →. The arrow keys work in every mode.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.Stage = (function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stages = [];
  var ticking = false;
  var running = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function railH() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-h'));
    return isNaN(v) ? 56 : v;
  }

  /* ================================================================
   * Ambient canvas — one painter per figure family
   * ================================================================ */
  function palette(el) {
    var cs = getComputedStyle(el);
    function v(n) { return cs.getPropertyValue(n).trim(); }
    return {
      accent: v('--accent') || '#2a78d6',
      muted: v('--muted') || '#8a877f',
      rule: v('--rule-strong') || '#cfcbbe',
      series: [v('--series-1'), v('--series-2'), v('--series-3'), v('--series-4'),
               v('--series-5'), v('--series-6'), v('--series-7'), v('--series-8')]
    };
  }

  /* Deterministic pseudo-random, so a scene looks the same every visit. */
  function rnd(i) {
    var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  var PAINT = {
    /* flowing bands — stream, timeline, flow, slope */
    ribbons: function (c, w, h, t, p, a) {
      c.lineCap = 'round';
      for (var i = 0; i < 7; i++) {
        c.beginPath();
        var base = h * (0.16 + i * 0.105);
        for (var x = 0; x <= w; x += 10) {
          var y = base + Math.sin(x / 190 + t / 2600 + i * 0.8) * 26 +
                  Math.sin(x / 78 - t / 4200 + i) * 9;
          if (x === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.strokeStyle = p.series[i % 8];
        c.lineWidth = 2.5;
        c.globalAlpha = a * 0.20;
        c.stroke();
      }
    },

    /* bars rising off a baseline — bars, columns, lollipop, diverging */
    bars: function (c, w, h, t, p, a) {
      var n = Math.max(10, Math.round(w / 78));
      var bw = w / n * 0.46;
      for (var i = 0; i < n; i++) {
        var k = rnd(i);
        var amp = 0.18 + 0.52 * k;
        var grow = 0.55 + 0.45 * Math.sin(t / 2100 + i * 0.55);
        var bh = h * amp * grow;
        c.globalAlpha = a * 0.18;
        c.fillStyle = p.series[i % 8];
        var x = (i + 0.27) * (w / n);
        var y = h * 0.86 - bh;
        var r = Math.min(4, bw / 2);
        c.beginPath();
        c.moveTo(x, h * 0.86);
        c.lineTo(x, y + r);
        c.quadraticCurveTo(x, y, x + r, y);
        c.lineTo(x + bw - r, y);
        c.quadraticCurveTo(x + bw, y, x + bw, y + r);
        c.lineTo(x + bw, h * 0.86);
        c.closePath();
        c.fill();
      }
    },

    /* a lattice of cells lighting up in a wave — heatmap, imagegrid */
    grid: function (c, w, h, t, p, a) {
      var cols = Math.max(6, Math.round(w / 96));
      var rows = Math.max(4, Math.round(h / 96));
      var cw = w / cols, ch = h / rows;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var d = (i / cols) * 2.2 + (j / rows) * 1.1;
          var pulse = 0.5 + 0.5 * Math.sin(t / 1500 - d * 2.4);
          c.globalAlpha = a * (0.05 + 0.20 * pulse * (0.4 + 0.6 * rnd(i * 31 + j)));
          c.fillStyle = p.series[(i + j) % 8];
          c.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
        }
      }
    },

    /* a drifting point cloud — quadrant, scatter, network */
    dots: function (c, w, h, t, p, a) {
      var n = Math.round(clamp(w * h / 5200, 60, 190));
      for (var i = 0; i < n; i++) {
        var gx = rnd(i) , gy = rnd(i + 900);
        var drift = Math.sin(t / 3400 + i * 0.7);
        var x = (0.06 + 0.88 * gx) * w + drift * 16;
        var y = (0.08 + 0.84 * gy) * h + Math.cos(t / 3900 + i) * 12;
        var r = 1.6 + 4.4 * Math.pow(rnd(i + 400), 2.2);
        c.globalAlpha = a * (0.12 + 0.30 * rnd(i + 77));
        c.fillStyle = p.series[Math.floor(rnd(i + 1300) * 3)];
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
    },

    /* concentric profiles — radar */
    rings: function (c, w, h, t, p, a) {
      var cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.42, axes = 8;
      for (var k = 0; k < 3; k++) {
        c.beginPath();
        for (var i = 0; i <= axes; i++) {
          var ang = -Math.PI / 2 + (i % axes) * 2 * Math.PI / axes;
          var wob = 0.55 + 0.35 * Math.sin(t / 2400 + i * 1.3 + k * 2);
          var rr = R * (0.34 + 0.22 * k) * (0.7 + 0.6 * wob);
          var x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.closePath();
        c.strokeStyle = p.series[k % 8];
        c.lineWidth = 2; c.globalAlpha = a * 0.22; c.stroke();
      }
    },

    /* rows of dashes, like a page of headlines — headlines, models */
    text: function (c, w, h, t, p, a) {
      var rows = Math.max(7, Math.round(h / 54));
      for (var j = 0; j < rows; j++) {
        var y = h * 0.1 + j * (h * 0.8 / rows);
        var x = w * 0.08;
        var k = 0;
        while (x < w * 0.92 && k < 14) {
          var len = (18 + 92 * rnd(j * 41 + k)) * 0.9;
          if (x + len > w * 0.92) break;
          var lit = rnd(j * 17 + k) > 0.86;
          var fade = 0.5 + 0.5 * Math.sin(t / 2000 - j * 0.5);
          c.globalAlpha = a * (lit ? 0.30 * fade + 0.10 : 0.10);
          c.fillStyle = lit ? p.accent : p.muted;
          c.fillRect(x, y, len, 5);
          x += len + 12;
          k++;
        }
      }
    }
  };

  var FOR_TYPE = {
    stream: 'ribbons', timeline: 'ribbons', flow: 'ribbons', slope: 'ribbons',
    bars: 'bars', columns: 'bars', lollipop: 'bars', diverging: 'bars',
    heatmap: 'grid', imagegrid: 'grid',
    quadrant: 'dots', scatter: 'dots', network: 'dots',
    radar: 'rings',
    headlines: 'text', models: 'text'
  };

  function Fx(canvas, type) {
    var c = canvas.getContext('2d');
    var painter = PAINT[FOR_TYPE[type] || 'dots'];
    var w = 0, h = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      canvas.width = w * dpr; canvas.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    return {
      resize: resize,
      clear: function () { if (w) c.clearRect(0, 0, w, h); },
      paint: function (t, alpha, pal) {
        if (!w) resize();
        c.clearRect(0, 0, w, h);
        painter(c, w, h, t, pal, alpha);
        c.globalAlpha = 1;
      }
    };
  }


  /* ================================================================
   * The scroll-driven scene
   * ================================================================ */
  var ARROW_L = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ARROW_R = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Where the title card is held, in units of the stage height, measured as
  // scroll distance into the scene. The snap point sits here too.
  var HOLD_AT = 0.14;
  // Deck mode: when the step boxes, resting at the foot of the screen, would
  // cover more than this share of the figure, the steps move into a dock
  // below it and are paged sideways instead.
  var DECK_OVERLAP = 0.30;

  function register(sec, type) {
    var st = {
      sec: sec,
      scene: sec.querySelector('.route-scene'),
      stage: sec.querySelector('.route-stage'),
      title: sec.querySelector('.stage-title'),
      fig: sec.querySelector('.stage-figure'),
      canvas: sec.querySelector('.stage-fx'),
      intro: sec.querySelector('.phase-intro'),
      hint: sec.querySelector('.stage-hint'),
      tail: sec.querySelector('.route-tail'),
      boxes: Array.prototype.slice.call(sec.querySelectorAll('.step-box')),
      tag: (sec.querySelector('.stage-title .tag') || {}).textContent || '',
      alpha: 0, fAlpha: 0, live: false, pal: null,
      step: -1, deck: false, firstBoxTop: 0,
      text: !!(SITE.Charts && SITE.Charts.isHtml(type))
    };
    if (!st.scene || !st.stage) return null;
    if (st.canvas) st.fx = Fx(st.canvas, type);

    // snap target: a zero-height marker inside the intro phase
    if (st.intro) {
      st.snap = document.createElement('div');
      st.snap.className = 'snap-hold';
      st.snap.setAttribute('aria-hidden', 'true');
      st.intro.appendChild(st.snap);
    }
    if (st.hint) st.hint.addEventListener('click', function () { goStep(st, 0); });

    buildDock(st);
    wireSwipe(st);

    stages.push(st);
    setDeck(st, wantsDeck(st));
    measure(st);
    if (window.ResizeObserver) {
      var rt;
      new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { measure(st); layout(); }, 60);
      }).observe(st.fig.firstElementChild || st.fig);
    }
    if (!running) { running = true; start(); }
    if (st.step < 0) setStep(st, 0);
    return st;
  }

  /* ---- the dock: step text under the figure, paged sideways -------- */
  function buildDock(st) {
    var n = st.boxes.length;
    var dock = document.createElement('div');
    dock.className = 'stage-dock';
    dock.innerHTML =
      '<div class="dock-bar">' +
        '<button type="button" class="dock-btn dock-prev" aria-label="Previous step">' + ARROW_L + '</button>' +
        '<div class="dock-meta"><span class="dock-n"></span>' +
          '<span class="dock-dots" aria-hidden="true">' + new Array(n + 1).join('<i></i>') + '</span></div>' +
        '<button type="button" class="dock-btn dock-next" aria-label="Next step">' + ARROW_R + '</button>' +
      '</div>' +
      '<div class="dock-body" aria-live="polite"></div>';
    st.stage.appendChild(dock);
    st.dock = dock;
    st.dockBody = dock.querySelector('.dock-body');
    st.dockN = dock.querySelector('.dock-n');
    st.dockDots = dock.querySelectorAll('.dock-dots i');
    st.dockPrev = dock.querySelector('.dock-prev');
    st.dockNext = dock.querySelector('.dock-next');
    st.dockPrev.addEventListener('click', function () { goStep(st, st.step - 1); });
    st.dockNext.addEventListener('click', function () { goStep(st, st.step + 1); });
  }

  function setStep(st, i) {
    if (i === st.step || !st.boxes[i]) return;
    var dir = st.step < 0 ? 0 : (i > st.step ? 1 : -1);
    st.step = i;
    var n = st.boxes.length;
    var clone = st.boxes[i].cloneNode(true);
    var num = clone.querySelector('.step-n');
    if (num) num.remove();
    st.dockBody.innerHTML = clone.innerHTML;
    st.dockBody.scrollTop = 0;
    var deeper = st.boxes[i].classList.contains('step-box--deeper');
    st.dockN.textContent = (st.tag ? st.tag.split(' · ')[0] + ' · ' : '') + (deeper ? 'Go deeper' : 'Step ' + (i + 1) + ' / ' + n);
    Array.prototype.forEach.call(st.dockDots, function (d, k) { d.dataset.on = k === i ? '1' : k < i ? 'done' : '0'; });
    st.dockPrev.setAttribute('aria-label', i === 0 ? 'Back to the title' : 'Previous step');
    st.dockNext.setAttribute('aria-label', i === n - 1 ? 'Go to the next section' : 'Next step');
    if (dir && !reduced) {
      st.dockBody.classList.remove('from-left', 'from-right');
      void st.dockBody.offsetWidth; // restart the animation
      st.dockBody.classList.add(dir > 0 ? 'from-right' : 'from-left');
    }
  }

  /* Horizontal swipes on the stage page through the steps. The stage keeps
     touch-action: pan-y in deck mode, so vertical drags still scroll the
     page natively and only a clearly sideways gesture is taken. */
  function wireSwipe(st) {
    var x0 = 0, y0 = 0, t0 = 0, on = false;
    st.stage.addEventListener('pointerdown', function (e) {
      if (!st.deck || e.pointerType === 'mouse') return;
      on = true; x0 = e.clientX; y0 = e.clientY; t0 = Date.now();
    }, { passive: true });
    st.stage.addEventListener('pointercancel', function () { on = false; }, { passive: true });
    st.stage.addEventListener('pointerup', function (e) {
      if (!on) return;
      on = false;
      var dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy) * 1.4 || Date.now() - t0 > 900) return;
      if (st.alpha > 0.5) { if (dx < 0) goStep(st, 0); return; }
      goStep(st, st.step + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---- navigation ------------------------------------------------- *
   * Scroll position stays the single source of truth for which step is
   * showing: every button, key and swipe just scrolls the page to where
   * that step becomes active, and the step engine takes it from there.
   * ------------------------------------------------------------------ */
  function vhOf() { return Math.max(240, window.innerHeight - railH()); }
  function sceneTop(st) { return window.scrollY + st.scene.getBoundingClientRect().top; }
  function holdY(st) { return sceneTop(st) - railH() + vhOf() * HOLD_AT; }

  function scrollToY(y, instant) {
    window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: instant || reduced ? 'instant' : 'smooth' });
  }

  function goStep(st, i, instant) {
    var n = st.boxes.length;
    if (i < 0) return scrollToY(holdY(st), instant);
    if (i >= n) {
      // past the last step: on to whatever comes next — this route's
      // explorer if it has one, else the next scene's held title card
      var k = stages.indexOf(st), next = stages[k + 1];
      if (!st.tail && next && next.sec === st.sec.nextElementSibling) return scrollToY(holdY(next), instant);
      var t = st.tail || st.sec.nextElementSibling;
      if (t) scrollToY(window.scrollY + t.getBoundingClientRect().top - railH() - 8, instant);
      return;
    }
    // a step is active once its box top passes 62% of the viewport
    scrollToY(window.scrollY + st.boxes[i].getBoundingClientRect().top - window.innerHeight * 0.5, instant);
  }

  // The scene that currently fills the screen, if any.
  function current() {
    var rh = railH(), best = null;
    stages.forEach(function (st) {
      var r = st.scene.getBoundingClientRect();
      if (r.top <= rh + 2 && r.bottom >= window.innerHeight - 2 && (st.alpha > 0.4 || st.fAlpha > 0.4)) best = st;
    });
    return best;
  }

  function onKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName))) return;
    var st = current();
    if (!st) return;
    e.preventDefault();
    var fwd = e.key === 'ArrowRight';
    if (st.alpha > 0.5) { if (fwd) goStep(st, 0); return; }   // on the title card
    goStep(st, st.step + (fwd ? 1 : -1));
  }

  /* In-page links to a route (crossroads cards, contents rail, deep links)
     land on the held title card rather than on the empty top of the scene. */
  function byId(id) {
    for (var i = 0; i < stages.length; i++) if (stages[i].sec.id === id) return stages[i];
    return null;
  }
  function jump(id, instant) {
    var st = byId(id);
    if (!st) return false;
    scrollToY(holdY(st), instant);
    return true;
  }
  function onClick(e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!byId(id)) return;
    e.preventDefault();
    jump(id);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  /* ---- measurement ------------------------------------------------ */

  /* A pinned stage cannot scroll, so a figure taller than its area is
     scaled down to fit rather than clipped. In deck mode a figure is never
     shrunk past legibility: one that would need more than MIN_DECK_SCALE
     keeps its size and its area scrolls instead (long text figures on a
     phone). offsetHeight is a layout measurement, so the transform cannot
     feed back into it. */
  var MIN_DECK_SCALE = 0.68;   // charts in the deck
  var MIN_TEXT_SCALE = 0.8;    // text figures in the deck (headlines, answers, photo codes)
  function fit(st) {
    var card = st.fig && st.fig.firstElementChild;
    if (!card) return;
    card.style.transform = '';
    st.fig.classList.remove('fig-scroll');
    var avail = st.fig.clientHeight - (st.deck ? 10 : 20);
    var natural = card.offsetHeight;
    if (!natural || avail <= 0 || natural <= avail) return;
    var k = avail / natural;
    var floor = !st.deck ? 0 : st.text ? MIN_TEXT_SCALE : MIN_DECK_SCALE;
    if (k < floor) { st.fig.classList.add('fig-scroll'); return; }
    card.style.transformOrigin = st.deck ? 'center top' : 'center center';
    card.style.transform = 'scale(' + Math.max(0.6, k).toFixed(3) + ')';
  }

  /* Would the step boxes cover too much of the figure? A box is the active
     one from the moment its top passes 62% of the viewport until the next
     box gets there, and it keeps rising the whole time — so this averages
     how much of the figure the tallest box covers over that whole stretch.
     A figure that would have to shrink past legibility goes to the deck too.
     Only called with the page in overlay geometry (see decideAll). */
  function wantsDeck(st) {
    var card = st.fig.firstElementChild;
    if (!card || !st.boxes.length) return false;
    var stageW = st.stage.clientWidth, stageH = st.stage.clientHeight;
    // side-by-side layout: the boxes sit beside the figure, never on it
    if (st.boxes[0].offsetWidth < stageW * 0.6) return false;
    var natural = card.offsetHeight;
    if (!natural) return false;
    var avail = stageH - 20;
    var k = natural > avail ? avail / natural : 1;
    // would have to shrink past legibility to fit the stage: the deck can scroll it instead
    if (k < (st.text ? MIN_TEXT_SCALE : MIN_DECK_SCALE)) return true;
    var figTop = railH() + 6 + (1 - k) * natural / 2;
    var figH = natural * k, figBottom = figTop + figH;
    var boxH = 0;
    st.boxes.forEach(function (b) { boxH = Math.max(boxH, b.offsetHeight); });
    var step = st.boxes[0].parentNode;
    var pitch = st.boxes.length > 1 ? st.boxes[1].parentNode.offsetTop - step.offsetTop : step.offsetHeight;
    var line = window.innerHeight * 0.62, N = 16, sum = 0;
    for (var i = 0; i < N; i++) {
      var top = line - pitch * (i + 0.5) / N;
      sum += Math.max(0, Math.min(figBottom, top + boxH) - Math.max(figTop, top));
    }
    return sum / N / figH > DECK_OVERLAP;
  }

  function setDeck(st, on) {
    if (on === st.deck) return;
    st.deck = on;
    st.sec.classList.toggle('is-deck', on);
  }

  /* The deck decision is taken once per screen size, in overlay geometry,
     and then left alone: the deck layout changes the figure's width (and
     so its height), which must not feed back into the decision. A new
     decision needs a real resize — a width change, or a rotation — not the
     URL bar sliding in and out as a phone scrolls. Charts redraw on a
     120ms debounce after a width change, hence the wait. */
  var lastW = 0, lastH = 0, decideT = null;
  function decideAll(later) {
    clearTimeout(decideT);
    function run() {
      stages.forEach(function (st) { setDeck(st, false); });
      stages.forEach(function (st) { st.fig.firstElementChild && (st.fig.firstElementChild.style.transform = ''); });
      stages.forEach(function (st) { setDeck(st, wantsDeck(st)); });
      measureAll();
    }
    lastW = window.innerWidth; lastH = window.innerHeight;
    if (later) decideT = setTimeout(run, 320); else run();
  }
  function onResize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w !== lastW || Math.abs(h - lastH) > 150) {
      // back to overlay geometry while the charts redraw at the new width
      stages.forEach(function (st) { setDeck(st, false); });
      decideAll(true);
    }
    measureAll();
  }

  function measure(st) {
    fit(st);
    st.firstBoxTop = st.boxes.length ? st.boxes[0].offsetTop : (st.intro ? st.intro.offsetHeight : vhOf());
    var nb = st.boxes.length;
    st.lastBoxTop = nb ? st.boxes[nb - 1].offsetTop : st.firstBoxTop;
    st.pitch = nb ? st.boxes[nb - 1].parentNode.offsetHeight : vhOf() * 0.6;
    if (st.snap) st.snap.style.top = Math.max(0, vhOf() * HOLD_AT - railH()) + 'px';
  }

  function measureAll() {
    stages.forEach(function (st) { if (st.fx) st.fx.resize(); st.pal = null; measure(st); });
    layout();
  }

  function layout() {
    var rh = railH();
    var vh = vhOf();

    stages.forEach(function (st) {
      var r = st.scene.getBoundingClientRect();

      // Entirely out of the way: park it at zero and stop painting.
      if (r.bottom < -80 || r.top > window.innerHeight + 80) {
        if (st.live) {
          st.live = false; st.alpha = 0; st.fAlpha = 0;
          st.title.style.opacity = '0';
          st.fig.style.opacity = '0';
          st.dock.style.opacity = '0';
          st.stage.style.pointerEvents = 'none';
          st.stage.style.setProperty('--tint', '0');
          if (st.fx) st.fx.clear();
        }
        return;
      }
      st.live = true;

      var scrolled = rh - r.top;                               // px scrolled into the scene
      var total = Math.max(1, st.scene.offsetHeight - vh);     // px of pinned travel
      // Where the first step box starts rising into view. The handover is
      // anchored to it, so the title and the figure are always finished
      // before any box can overlap them, however tall the intro phase is.
      var enter = Math.max(vh * 0.9, st.firstBoxTop - vh);

      // Sequential, never overlapping, and none of them starts before the
      // stage is pinned (scrolled >= 0) — a title is never seen travelling
      // up the screen. It arrives almost at once, then holds.
      var tIn = ease(clamp(scrolled / (vh * 0.06), 0, 1));
      var tOut = ease(clamp((scrolled - (enter - vh * 0.58)) / (vh * 0.25), 0, 1));
      // figure: appears in place — opacity and a hair of scale, never a slide
      var fIn = ease(clamp((scrolled - (enter - vh * 0.30)) / (vh * 0.25), 0, 1));
      // The whole scene clears out before the next one arrives — but only
      // once the last step has had its full turn: the fade is anchored to
      // the last box (active when its top passes 62% of the viewport), so
      // the last comment is never shown half-faded or with dead buttons.
      var lastOn = st.lastBoxTop + rh - window.innerHeight * 0.62;
      var outLen = vh * 0.4;
      var outAt = Math.min(lastOn + st.pitch * 0.55, total - outLen);
      var out = ease(clamp((scrolled - Math.max(outAt, lastOn + 40)) / outLen, 0, 1));

      var tA = tIn * (1 - tOut) * (1 - out);
      var fA = fIn * (1 - out);

      st.title.style.opacity = tA.toFixed(3);
      st.title.style.transform = 'translateY(' + (-tOut * 26).toFixed(1) + 'px)';
      st.title.style.pointerEvents = tA > 0.6 ? 'auto' : 'none';

      st.fig.style.opacity = fA.toFixed(3);
      st.fig.style.transform = 'scale(' + (0.982 + 0.018 * fIn).toFixed(4) + ')';
      st.fig.style.pointerEvents = fA > 0.65 ? 'auto' : 'none';

      st.dock.style.opacity = fA.toFixed(3);
      st.dock.style.pointerEvents = fA > 0.65 ? 'auto' : 'none';

      st.stage.style.setProperty('--tint', (tA * 0.9).toFixed(3));
      // An empty stage must not catch taps: on the tour the next scene's
      // stage slides in over the foot of this one while still invisible.
      st.stage.style.pointerEvents = tA > 0.05 || fA > 0.05 ? '' : 'none';
      st.alpha = tA;
      st.fAlpha = fA;
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; layout(); });
  }

  function start() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    lastW = window.innerWidth; lastH = window.innerHeight;
    window.addEventListener('themechange', function () {
      stages.forEach(function (st) { st.pal = null; });
    });
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    document.documentElement.classList.add('has-stage');
    measureAll();

    function frame(ts) {
      stages.forEach(function (st) {
        if (!st.fx || !st.live || st.alpha < 0.02) { return; }
        if (!st.pal) st.pal = palette(st.stage);
        st.fx.paint(reduced ? 0 : ts, st.alpha, st.pal);
      });
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function step(sec, i) {
    for (var k = 0; k < stages.length; k++) if (stages[k].sec === sec) return setStep(stages[k], i);
  }

  return {
    register: register, refresh: measureAll, step: step, jump: jump,
    fit: function () { stages.forEach(fit); }
  };
}());
