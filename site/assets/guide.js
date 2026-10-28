/* Tess, the portfolio guide: a voiced tour of the homepage sections.
   Script: guide/tour.json (text per step and language). Voice: guide/voice.json + guide/audio/<lang>/<id>.m4a,
   made once by scripts/guide/voice.mjs (Gemini TTS) so the site never needs a key. A missing clip, a blocked autoplay
   or sound switched off all fall back to captions paced by reading time.
   The avatar is the neon-tube bust from the music-video studio (kit/neonbust.ts) redrawn as SVG: it traces itself in
   when the panel opens, and its mouth and chest core follow the voice level from a WebAudio analyser.
   Hooks for tests: [data-testid] on every control, data-guide-focus on the highlighted section, window.__guide. */
(() => {
  'use strict';

  const STORE = 'linhqa-guide';
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; } };
  const save = (v) => { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} };

  /* ------------------------------------------------------------------ avatar */

  // Unit figure from neonbust.ts (y up, head centre 0.95) scaled ×100 into SVG space (y down).
  const BUST = [
    '<ellipse cx="0" cy="-95" rx="36" ry="43"/>',
    '<ellipse cx="-37" cy="-95" rx="7" ry="11"/>',
    '<ellipse cx="37" cy="-95" rx="7" ry="11"/>',
    '<path d="M24.7 -92.7 A25 17 0 0 0 -24.7 -92.7"/>',
    '<path d="M-13 -53 C-14 -45 -18 -40 -20 -36"/>',
    '<path d="M13 -53 C14 -45 18 -40 20 -36"/>',
    '<path d="M-110 95 C-112 5 -62 -32 -20 -36"/>',
    '<path d="M20 -36 C62 -32 112 5 110 95"/>',
    '<circle class="g-core" cx="0" cy="25" r="16"/>',
    '<path class="g-ring" d="M28.5 10.5 A32 32 0 0 0 -28.5 10.5"/>',
    '<path class="g-ring" d="M-28.5 39.5 A32 32 0 0 0 28.5 39.5"/>',
    '<path d="M-62 55 C-45 62 -30 50 -22 38"/>',
    '<path d="M62 55 C45 62 30 50 22 38"/>',
  ];
  function avatar(cls, viewBox) {
    const tubes = BUST.map((s, i) => s.replace(/\/>$/, ` pathLength="1" style="--i:${i}"/>`)).join('');
    return `<svg class="g-avatar ${cls}" viewBox="${viewBox}" aria-hidden="true">
      <g class="g-tubes">${tubes}</g>
      <rect class="g-eye" x="-21" y="-100.5" width="16" height="7" rx="3.5"/>
      <rect class="g-eye" x="5" y="-100.5" width="16" height="7" rx="3.5"/>
      <ellipse class="g-mouth" cx="0" cy="-74" rx="9" ry="5"/>
    </svg>`;
  }

  /* --------------------------------------------------------------------- DOM */

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'g-launch';
  launcher.dataset.testid = 'guide-launcher';
  launcher.setAttribute('aria-expanded', 'false');
  launcher.setAttribute('aria-controls', 'guide-panel');
  launcher.setAttribute('aria-label', 'Open the portfolio guide');
  launcher.innerHTML = `${avatar('mini', '-60 -150 120 120')}<span class="g-launch-label">Tour</span>`;

  const panel = document.createElement('section');
  panel.id = 'guide-panel';
  panel.className = 'g-panel';
  panel.hidden = true;
  panel.dataset.testid = 'guide-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'guide-name');
  panel.innerHTML = `
    <header class="g-head">
      ${avatar('big', '-120 -146 240 248')}
      <div class="g-who"><b id="guide-name" data-testid="guide-name"></b><small data-testid="guide-role"></small></div>
      <div class="g-langs" role="group" aria-label="Language">
        <button type="button" data-lang="en" data-testid="guide-lang-en" aria-pressed="false">EN</button>
        <button type="button" data-lang="vi" data-testid="guide-lang-vi" aria-pressed="false">VI</button>
      </div>
      <button type="button" class="g-icon" data-act="close" data-testid="guide-close" aria-label="Close the guide">✕</button>
    </header>
    <div class="g-body">
      <p class="g-count" data-testid="guide-step-count"></p>
      <h3 class="g-title" data-testid="guide-step-title"></h3>
      <p class="g-say" data-testid="guide-caption" aria-live="polite"></p>
      <div class="g-progress" aria-hidden="true"><i></i></div>
    </div>
    <div class="g-controls">
      <button type="button" class="g-icon" data-act="prev" data-testid="guide-prev" aria-label="Previous stop">‹</button>
      <button type="button" class="g-play" data-act="play" data-testid="guide-play" aria-label="Pause"></button>
      <button type="button" class="g-icon" data-act="next" data-testid="guide-next" aria-label="Next stop">›</button>
      <button type="button" class="g-icon g-sound" data-act="sound" data-testid="guide-sound" aria-pressed="true" aria-label="Voice"></button>
    </div>
    <nav class="g-stops" aria-label="Tour stops"><ol data-testid="guide-stops"></ol></nav>`;

  document.body.append(launcher, panel);
  const $ = (sel) => panel.querySelector(sel);
  const bigAvatar = $('.g-avatar.big');
  const progressBar = $('.g-progress i');
  const audio = new Audio();
  audio.preload = 'auto';

  /* ------------------------------------------------------------------- state */

  const prefs = load();
  const st = {
    tour: null,
    voice: { clips: {} },
    lang: prefs.lang || (/^vi\b/i.test(navigator.language) ? 'vi' : 'en'),
    sound: prefs.sound !== false,
    index: 0,
    playing: false,
    done: false,
    open: false,
    timer: 0,
    started: 0,
    duration: 0,
    focused: null,
  };
  window.__guide = { get step() { return st.tour?.steps[st.index]?.id ?? null; }, get playing() { return st.playing; }, get lang() { return st.lang; } };

  const ready = Promise.all([
    fetch('guide/tour.json').then((r) => r.json()),
    fetch('guide/voice.json').then((r) => (r.ok ? r.json() : { clips: {} })).catch(() => ({ clips: {} })),
  ]).then(([tour, voice]) => { st.tour = tour; st.voice = voice; renderStops(); renderText(); });

  /* ---------------------------------------------------------------- speaking */

  // Voice level: an analyser on the audio element when the browser allows it, otherwise a soft synthetic wobble.
  let ctx = null, analyser = null, buf = null, raf = 0;
  function level(now) {
    if (!st.playing) return 0;
    if (analyser && st.sound && !audio.paused) {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.min(1, Math.sqrt(sum / buf.length) * 4);
    }
    return st.sound ? 0 : 0.25 + 0.2 * Math.sin(now / 90) * Math.sin(now / 37);
  }
  function frame(now) {
    const lvl = reduceQuery.matches ? 0 : level(now);
    bigAvatar.style.setProperty('--lvl', lvl.toFixed(3));
    const p = st.duration ? Math.min(1, (st.sound && audio.duration ? audio.currentTime * 1000 : now - st.started) / st.duration) : 0;
    progressBar.style.transform = `scaleX(${p})`;
    raf = st.open ? requestAnimationFrame(frame) : 0;
  }
  function ensureAnalyser() {
    // Without a click yet (the #tour link) the browser would refuse the context: wait for the first gesture.
    if (ctx || !window.AudioContext || navigator.userActivation?.hasBeenActive === false) return;
    try {
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      buf = new Uint8Array(analyser.fftSize);
      ctx.createMediaElementSource(audio).connect(analyser);
      analyser.connect(ctx.destination);
    } catch { analyser = null; }
  }

  const readMs = (text) => Math.max(3500, text.split(/\s+/).length * 380);
  const clipOf = (step) => st.voice.clips?.[st.lang]?.[step.id];

  function stopSpeaking() {
    clearTimeout(st.timer);
    audio.pause();
  }

  // Pacing between stops for a reader, not synchronisation: a short pause after each line, then the next stop.
  function onLineEnd() {
    if (!st.playing) return;
    if (st.index < st.tour.steps.length - 1) st.timer = setTimeout(() => go(st.index + 1), 700);
    else { st.done = true; setPlaying(false); }
  }

  function speak() {
    stopSpeaking();
    const step = st.tour.steps[st.index];
    const clip = clipOf(step);
    st.started = performance.now();
    st.duration = clip?.ms ?? readMs(step.say[st.lang]);
    if (!st.playing) return;
    if (st.sound && clip) {
      ensureAnalyser();
      ctx?.resume?.();
      audio.src = `guide/${clip.file}`;
      audio.play().catch(() => { st.timer = setTimeout(onLineEnd, readMs(step.say[st.lang])); });
    } else {
      st.timer = setTimeout(onLineEnd, st.duration);
    }
  }
  audio.addEventListener('ended', onLineEnd);
  audio.addEventListener('error', () => { if (st.playing && audio.src) st.timer = setTimeout(onLineEnd, readMs(st.tour.steps[st.index].say[st.lang])); });

  /* -------------------------------------------------------------- navigation */

  function focusSection(step) {
    st.focused?.removeAttribute('data-guide-focus');
    const el = document.querySelector(step.target);
    st.focused = el;
    if (!el) return;
    el.setAttribute('data-guide-focus', step.id);
    el.scrollIntoView({ behavior: reduceQuery.matches ? 'auto' : 'smooth', block: 'start' });
  }

  function renderText() {
    const { tour, lang, index } = st;
    if (!tour) return;
    const step = tour.steps[index];
    $('#guide-name').textContent = tour.name;
    $('.g-who small').textContent = tour.role[lang];
    $('.g-count').textContent = `${index + 1} / ${tour.steps.length}`;
    $('.g-title').textContent = step.title[lang];
    $('.g-say').textContent = step.say[lang];
    panel.lang = lang;
    for (const b of panel.querySelectorAll('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    panel.querySelectorAll('.g-stops button').forEach((b, i) => {
      b.textContent = tour.steps[i].title[lang];
      if (i === index) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('[data-act="prev"]').disabled = index === 0;
    $('[data-act="next"]').disabled = index === tour.steps.length - 1;
  }

  function renderStops() {
    $('.g-stops ol').innerHTML = st.tour.steps.map((s, i) => `<li><button type="button" data-stop="${i}" data-testid="guide-stop"></button></li>`).join('');
  }

  function renderControls() {
    const play = $('[data-act="play"]');
    play.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
    play.textContent = st.playing ? '❚❚' : '▶';
    panel.classList.toggle('is-playing', st.playing);
    const sound = $('[data-act="sound"]');
    sound.setAttribute('aria-pressed', String(st.sound));
    sound.textContent = st.sound ? '🔊' : '🔈';
  }

  function go(i) {
    st.done = false;
    st.index = Math.max(0, Math.min(st.tour.steps.length - 1, i));
    renderText();
    focusSection(st.tour.steps[st.index]);
    speak();
  }

  function setPlaying(on) {
    st.playing = on;
    renderControls();
    if (on) speak(); else stopSpeaking();
  }

  async function open() {
    await ready;
    st.open = true;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    launcher.hidden = true;
    bigAvatar.classList.remove('draw');
    void bigAvatar.getBoundingClientRect(); // restart the trace-in
    bigAvatar.classList.add('draw');
    st.playing = true;
    renderControls();
    go(st.index);
    $('[data-act="play"]').focus();
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function close() {
    st.open = false;
    setPlaying(false);
    st.focused?.removeAttribute('data-guide-focus');
    st.focused = null;
    panel.hidden = true;
    launcher.hidden = false;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.focus();
  }

  /* ------------------------------------------------------------------ events */

  launcher.addEventListener('click', open);
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || btn.disabled) return;
    if (btn.dataset.lang) {
      st.lang = btn.dataset.lang;
      save({ lang: st.lang, sound: st.sound });
      renderText();
      speak();
      return;
    }
    if (btn.dataset.stop) { go(Number(btn.dataset.stop)); return; }
    switch (btn.dataset.act) {
      case 'close': close(); break;
      case 'prev': go(st.index - 1); break;
      case 'next': go(st.index + 1); break;
      case 'play':
        if (st.done) { st.done = false; st.playing = true; renderControls(); go(0); }
        else setPlaying(!st.playing);
        break;
      case 'sound':
        st.sound = !st.sound;
        save({ lang: st.lang, sound: st.sound });
        renderControls();
        speak();
        break;
    }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' && !e.target.closest('.g-stops')) go(st.index + 1);
    else if (e.key === 'ArrowLeft' && !e.target.closest('.g-stops')) go(st.index - 1);
  });

  // Shareable link: …/#tour opens the guide (the click on the link counts as the gesture that allows sound).
  if (location.hash === '#tour') open();
})();
