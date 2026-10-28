/* Visual effects for the portfolio: hero particle network, isometric stack scroll-in, blueprint draw-in.
   Hand-written, no dependencies. Everything here is decoration: the pages work without it, and under
   prefers-reduced-motion nothing animates (the particles draw one static frame). */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- particles */

  const canvas = document.querySelector('canvas.particles');
  const hero = canvas && canvas.parentElement;
  const ctx = canvas && canvas.getContext('2d');

  if (canvas && hero && ctx) {
    // Fixed-seed PRNG: the same starting layout on every load (keeps the visual baseline stable).
    const mulberry32 = (seed) => () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const MAX = 90;
    const TAU = Math.PI * 2;
    const rnd = mulberry32(0x5eed1e55);
    const nx = new Float32Array(MAX), ny = new Float32Array(MAX);
    const x = new Float32Array(MAX), y = new Float32Array(MAX);
    const vx = new Float32Array(MAX), vy = new Float32Array(MAX); // base drift, px/s
    const ix = new Float32Array(MAX), iy = new Float32Array(MAX); // pointer impulse, px/s
    const rad = new Float32Array(MAX), tone = new Uint8Array(MAX);
    for (let i = 0; i < MAX; i++) {
      const a = rnd() * TAU, speed = 5 + rnd() * 10;
      nx[i] = rnd(); ny[i] = rnd();
      vx[i] = Math.cos(a) * speed; vy[i] = Math.sin(a) * speed;
      rad[i] = 1 + rnd() * 1.4;
      tone[i] = rnd() < 0.5 ? 0 : 1;
    }

    // Tiny test hook: lets a spec tell a static frame from a running loop.
    const state = (window.__particles = { running: false, mode: 'static', frames: 0, count: 0 });

    let w = 0, h = 0, dpr = 1, count = 0, linkDist = 130, linkDist2 = 130 * 130;
    let rgb = [[124, 92, 255], [34, 211, 166]];
    let inView = true, raf = 0, last = 0, placed = false;
    const pointer = { on: false, x: 0, y: 0 };
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

    const swatch = document.createElement('canvas').getContext('2d');
    const parseColor = (value, fallback) => {
      if (!swatch) return fallback;
      swatch.fillStyle = '#000';
      swatch.fillStyle = value; // invalid values are ignored and keep #000
      const c = swatch.fillStyle;
      if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
      const m = c.match(/[\d.]+/g);
      return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : fallback;
    };
    const readColors = () => {
      const cs = getComputedStyle(root);
      rgb = [parseColor(cs.getPropertyValue('--accent').trim(), rgb[0]), parseColor(cs.getPropertyValue('--accent-2').trim(), rgb[1])];
    };
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const LINK_ALPHA = [0.08, 0.15, 0.24, 0.34];

    function layout() {
      const r = hero.getBoundingClientRect();
      const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const phone = nw < 640;
      count = Math.min(phone ? 35 : MAX, Math.round((nw * nh) / (phone ? 11000 : 14000)));
      linkDist = phone ? 92 : 130;
      linkDist2 = linkDist * linkDist;
      canvas.width = Math.round(nw * dpr);
      canvas.height = Math.round(nh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < MAX; i++) {
        // static frame: always derived from the seed; live loop: keep the drift, just rescale to the new box
        if (!placed || !state.running && reduceQuery.matches) { x[i] = nx[i] * nw; y[i] = ny[i] * nh; }
        else if (w && h) { x[i] *= nw / w; y[i] *= nh / h; }
      }
      w = nw; h = nh; placed = true;
      state.count = count;
    }

    function step(dt) {
      const R = 150, R2 = R * R, cap = 45;
      const decay = Math.pow(0.9, dt * 60);
      for (let i = 0; i < count; i++) {
        if (pointer.on) {
          const dx = pointer.x - x[i], dy = pointer.y - y[i], d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1) {
            const d = Math.sqrt(d2), f = 1 - d / R;
            // gentle pull from afar, soft push when a dot gets close to the cursor
            const a = d > 70 ? 36 * f : -160 * f;
            ix[i] = Math.max(-cap, Math.min(cap, ix[i] + (dx / d) * a * dt));
            iy[i] = Math.max(-cap, Math.min(cap, iy[i] + (dy / d) * a * dt));
          }
        }
        ix[i] *= decay; iy[i] *= decay;
        x[i] += (vx[i] + ix[i]) * dt; y[i] += (vy[i] + iy[i]) * dt;
        if (x[i] < 0) { x[i] = 0; vx[i] = Math.abs(vx[i]); } else if (x[i] > w) { x[i] = w; vx[i] = -Math.abs(vx[i]); }
        if (y[i] < 0) { y[i] = 0; vy[i] = Math.abs(vy[i]); } else if (y[i] > h) { y[i] = h; vy[i] = -Math.abs(vy[i]); }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      // links: 2 tones x 4 alpha buckets, one stroke per bucket
      const paths = [];
      for (let k = 0; k < 8; k++) paths.push(null);
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = x[i] - x[j], dy = y[i] - y[j], d2 = dx * dx + dy * dy;
          if (d2 >= linkDist2) continue;
          const b = Math.min(3, ((1 - Math.sqrt(d2) / linkDist) * 4) | 0);
          const k = (tone[i] === tone[j] ? tone[i] : 0) * 4 + b;
          const p = paths[k] || (paths[k] = new Path2D());
          p.moveTo(x[i], y[i]); p.lineTo(x[j], y[j]);
        }
      }
      ctx.lineWidth = 1;
      for (let k = 0; k < 8; k++) {
        if (!paths[k]) continue;
        ctx.strokeStyle = rgba(rgb[k >> 2], LINK_ALPHA[k & 3]);
        ctx.stroke(paths[k]);
      }
      // faint links from the cursor to nearby dots
      if (pointer.on) {
        const R = 150;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const dx = pointer.x - x[i], dy = pointer.y - y[i];
          if (dx * dx + dy * dy < R * R) { ctx.moveTo(pointer.x, pointer.y); ctx.lineTo(x[i], y[i]); }
        }
        ctx.strokeStyle = rgba(rgb[1], 0.16);
        ctx.stroke();
      }
      // dots, one fill per tone
      for (let t = 0; t < 2; t++) {
        const p = new Path2D();
        for (let i = 0; i < count; i++) {
          if (tone[i] !== t) continue;
          p.moveTo(x[i] + rad[i], y[i]); p.arc(x[i], y[i], rad[i], 0, TAU);
        }
        ctx.fillStyle = rgba(rgb[t], 0.7);
        ctx.fill(p);
      }
    }

    const shouldRun = () => inView && !document.hidden && !reduceQuery.matches;

    function frame(now) {
      raf = 0;
      if (!shouldRun()) { state.running = false; return; }
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      step(dt);
      draw();
      state.frames++;
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (raf || !shouldRun()) return;
      state.running = true; state.mode = 'live';
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; state.running = false;
    }
    // reduced motion: one deterministic frame from the seed, no loop and no pointer
    function applyMode() {
      if (reduceQuery.matches) {
        stop();
        state.mode = 'static';
        layout();
        draw();
      } else {
        state.mode = 'live';
        start();
      }
    }

    readColors();
    layout();
    draw();
    applyMode();

    // resize (debounced)
    let timer = 0, sized = false;
    new ResizeObserver(() => {
      if (!sized) { sized = true; return; } // the initial notification: already laid out
      clearTimeout(timer);
      timer = setTimeout(() => { layout(); if (!state.running) draw(); }, 150);
    }).observe(hero);

    // pause offscreen / in a background tab
    new IntersectionObserver((entries) => {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView) start(); else stop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    // theme: re-read the CSS variables (toggle button, or the OS scheme when no theme is stored)
    const recolor = () => { readColors(); if (!state.running) draw(); };
    new MutationObserver(recolor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);
    reduceQuery.addEventListener('change', applyMode);

    // pointer attraction / repulsion: desktop pointers only, never with reduced motion
    hero.addEventListener('pointermove', (e) => {
      if (!finePointer.matches || reduceQuery.matches || e.pointerType === 'touch') return;
      const r = hero.getBoundingClientRect();
      pointer.on = true; pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { pointer.on = false; });
  }

  /* -------------------------------------------------- scroll-in (isometric + blueprint) */

  const canObserve = 'IntersectionObserver' in window;

  // Isometric stack: starts collapsed, separates once it scrolls into view; packets run only after that.
  const iso = document.querySelector('.iso');
  if (iso && canObserve && !reduceQuery.matches) {
    iso.classList.add('iso-pre');
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      iso.classList.add('in');
      iso.classList.remove('iso-pre');
    }, { threshold: 0.35 });
    io.observe(iso);
  }

  // Blueprint panels: strokes draw once, chips fade in staggered.
  const panels = [...document.querySelectorAll('.bp-panel')];
  if (panels.length && canObserve && !reduceQuery.matches) {
    panels.forEach((p) => p.classList.add('bp-pre'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.classList.add('bp-in');
        e.target.classList.remove('bp-pre');
      }
    }, { threshold: 0.2 });
    panels.forEach((p) => io.observe(p));
    // never print a half-drawn sheet
    addEventListener('beforeprint', () => panels.forEach((p) => { p.classList.add('bp-in'); p.classList.remove('bp-pre'); }));
  }
})();
