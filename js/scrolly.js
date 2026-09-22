/* ------------------------------------------------------------------ *
 * scrolly.js — the step engine.
 *
 * Scroll position drives one integer: which step is active. Everything
 * else (figure state, box emphasis) is a pure function of that integer.
 * Scroll-position based rather than IntersectionObserver so that the
 * first and last steps behave correctly at the ends of the document.
 * ------------------------------------------------------------------ */
window.SITE = window.SITE || {};

SITE.Scrolly = function (root, onStep) {
  'use strict';
  var steps = Array.prototype.slice.call(root.querySelectorAll('.step'));
  if (!steps.length) return { destroy: function () {} };

  var current = -1;
  var ticking = false;

  // Measure the box, not its scroll slot: a step becomes active the moment
  // its card has risen into comfortable reading position, and stays active
  // until the next card reaches the same line.
  var boxes = steps.map(function (s) { return s.querySelector('.step-box') || s; });

  function pick() {
    var line = window.innerHeight * 0.62;
    var active = 0;
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].getBoundingClientRect().top <= line) active = i;
    }
    return active;
  }

  function update() {
    ticking = false;
    var n = pick();
    if (n === current) return;
    current = n;
    steps.forEach(function (s, i) { s.classList.toggle('is-active', i === n); });
    onStep(n, steps[n]);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // Run once so the figure starts in the first step's state.
  update();

  return {
    destroy: function () {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    },
    refresh: update
  };
};
