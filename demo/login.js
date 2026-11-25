import { currentUser, href, login } from './store.js';
import { addBlobs } from './liquid.js';
import { parseParams } from './engine.js';

// `?frozen=1` means: no motion anywhere (deterministic pages for visual snapshots).
if (parseParams(location.search).frozen) document.documentElement.dataset.mode = 'frozen';

if (currentUser()) location.replace(href('board.html'));

// ---- liquid background (positions are in the 1000 x 700 viewBox) ----
const path = (id) => document.getElementById(id);
addBlobs([
  { el: path('lq-b1'), cx: 330, cy: 220, r: 170 },
  { el: path('lq-b2'), cx: 690, cy: 200, r: 150 },
  { el: path('lq-b3'), cx: 660, cy: 520, r: 185 },
  { el: path('lq-b4'), cx: 310, cy: 500, r: 150 },
]);

// ---- form (labels and error texts are part of the test contract) ----
const form = document.getElementById('login-form');
const error = document.getElementById('login-error');
const showError = (message) => {
  error.textContent = message;
  error.hidden = false;
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showError('Email and password are required');
  if (!login(email, password, form.remember.checked)) return showError('Invalid email or password');
  location.assign(href('board.html'));
});

// ---- show / hide password ----
const pw = document.getElementById('password');
const toggle = document.getElementById('pw-toggle');
toggle.addEventListener('click', () => {
  const show = pw.type === 'password';
  pw.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  toggle.classList.toggle('is-on', show);
});

// ---- gooey ripple origin for the primary button ----
const btn = form.querySelector('.liquid-btn');
btn.addEventListener('pointermove', (e) => {
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
  btn.style.setProperty('--my', `${e.clientY - r.top}px`);
});
