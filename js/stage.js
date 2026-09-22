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
  function register(sec, type) {
    var st = {
      sec: sec,
      scene: sec.querySelector('.route-scene'),
      stage: sec.querySelector('.route-stage'),
      title: sec.querySelector('.stage-title'),
      fig: sec.querySelector('.stage-figure'),
      canvas: sec.querySelector('.stage-fx'),
      alpha: 0, live: false, pal: null
    };
    if (!st.scene || !st.stage) return null;
    if (st.canvas) st.fx = Fx(st.canvas, type);
    stages.push(st);
    fit(st);
    if (window.ResizeObserver) {
      var rt;
      new ResizeObserver(function () {
        clearTimeout(rt);
        rt = setTimeout(function () { fit(st); }, 60);
      }).observe(st.fig);
    }
    if (!running) { running = true; start(); }
    return st;
  }

  /* A pinned stage cannot scroll, so a figure taller than the stage is
     scaled down to fit rather than clipped or given its own scrollbar.
     offsetHeight is a layout measurement, so the transform cannot feed
     back into it. */
  function fit(st) {
    var card = st.fig && st.fig.firstElementChild;
    if (!card) return;
    var avail = st.stage.clientHeight - 20;
    card.style.transform = '';
    var natural = card.offsetHeight;
    if (!natural || avail <= 0) return;
    if (natural > avail) {
      var k = Math.max(0.6, avail / natural);
      card.style.transformOrigin = 'center center';
      card.style.transform = 'scale(' + k.toFixed(3) + ')';
    }
  }

  function measureAll() {
    stages.forEach(function (st) { if (st.fx) st.fx.resize(); st.pal = null; fit(st); });
    layout();
  }

  function layout() {
    var rh = railH();
    var vh = Math.max(240, window.innerHeight - rh);

    stages.forEach(function (st) {
      var r = st.scene.getBoundingClientRect();

      // Entirely out of the way: park it at zero and stop painting.
      if (r.bottom < -80 || r.top > window.innerHeight + 80) {
        if (st.live) {
          st.live = false; st.alpha = 0;
          st.title.style.opacity = '0';
          st.fig.style.opacity = '0';
          st.stage.style.setProperty('--tint', '0');
          if (st.fx) st.fx.clear();
        }
        return;
      }
      st.live = true;

      var scrolled = rh - r.top;                               // px scrolled into the scene
      var total = Math.max(1, st.scene.offsetHeight - vh);     // px of pinned travel
      var intro = vh * 0.92;

      // The three fades are sequential, not overlapping, and none of them
      // starts before the stage is pinned (scrolled >= 0) — so a title is
      // never seen travelling up the screen. It appears where it will sit.
      var tIn = ease(clamp((scrolled - vh * 0.01) / (vh * 0.19), 0, 1));
      var tOut = ease(clamp((scrolled - intro * 0.30) / (intro * 0.36), 0, 1));
      // figure: appears in place — opacity and a hair of scale, never a slide
      var fIn = ease(clamp((scrolled - intro * 0.70) / (intro * 0.28), 0, 1));
      // the whole scene clears out before the next one arrives
      var out = ease(clamp((scrolled - (total - vh * 0.62)) / (vh * 0.5), 0, 1));

      var tA = tIn * (1 - tOut) * (1 - out);
      var fA = fIn * (1 - out);

      st.title.style.opacity = tA.toFixed(3);
      st.title.style.transform = 'translateY(' + (-tOut * 26).toFixed(1) + 'px)';
      st.title.style.pointerEvents = tA > 0.6 ? 'auto' : 'none';

      st.fig.style.opacity = fA.toFixed(3);
      st.fig.style.transform = 'scale(' + (0.982 + 0.018 * fIn).toFixed(4) + ')';
      st.fig.style.pointerEvents = fA > 0.65 ? 'auto' : 'none';

      st.stage.style.setProperty('--tint', (tA * 0.9).toFixed(3));
      st.alpha = tA;
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; layout(); });
  }

  function start() {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measureAll(); });
    window.addEventListener('themechange', function () {
      stages.forEach(function (st) { st.pal = null; });
    });
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

  return { register: register, refresh: measureAll, fit: function () { stages.forEach(fit); } };
}());
