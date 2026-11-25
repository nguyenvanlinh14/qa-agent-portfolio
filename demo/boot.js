// Runs before first paint (classic, blocking script in <head>).
// 1) Apply the saved site theme. Our key is `linhqa-theme`; the Playwright report on this origin owns `theme`, so we never touch it.
// 2) On pages marked <html data-auth="required"> bounce anonymous visitors to the login page, keeping ?seed / ?frozen.
(function () {
  var root = document.documentElement;
  try {
    var t = localStorage.getItem('linhqa-theme');
    if (t === 'dark' || t === 'light') root.dataset.theme = t;
  } catch (e) {}
  if (root.dataset.auth !== 'required') return;
  var signedIn = false;
  try {
    signedIn = !!(localStorage.getItem('marketflow.session') || sessionStorage.getItem('marketflow.session'));
  } catch (e) {}
  if (signedIn) return;
  var q = new URLSearchParams(location.search), keep = new URLSearchParams();
  ['seed', 'frozen'].forEach(function (k) { if (q.has(k)) keep.set(k, q.get(k)); });
  var s = keep.toString();
  location.replace('index.html' + (s ? '?' + s : ''));
})();
