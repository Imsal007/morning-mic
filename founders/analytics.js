/* Founder Rehearsal: analytics with consent. Public pages only; never add this file to the member room (app/).
   Nothing is requested from Google unless the visitor presses Accept. */
(function () {
  'use strict';
  if (/\/app(\/|$)/.test(location.pathname)) return;
  var ID = 'G-EEWT6MLNNY', KEY = 'fr-analytics', SIX_MONTHS = 183 * 864e5;
  var live = /(^|\.)founderrehearsal\.com$/.test(location.hostname); // never send test visits
  var loaded = false, banner = null;

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); if (v && Date.now() - v.at < SIX_MONTHS) return v.choice; } catch (e) {}
    return null;
  }
  function save(choice) { try { localStorage.setItem(KEY, JSON.stringify({ choice: choice, at: Date.now() })); } catch (e) {} }

  function load() {
    window['ga-disable-' + ID] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 60 * 60 * 24 * 60 });
    if (!live) return;
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(s);
  }
  function removeCookies() {
    var hosts = ['', location.hostname, '.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^_ga/.test(name)) return;
      hosts.forEach(function (h) { document.cookie = name + '=; Max-Age=0; path=/' + (h ? '; domain=' + h : ''); });
    });
  }
  function choose(choice) {
    var before = read();
    save(choice); close();
    if (choice === 'granted') { load(); return; }
    window['ga-disable-' + ID] = true; removeCookies();
    if (before === 'granted' && loaded) location.reload(); // start clean, without Google's script
  }

  // events carry a name only: never pass anything a person typed
  window.frTrack = function (name) { if (loaded && read() === 'granted') window.gtag('event', name); };

  function close() { if (banner) { banner.remove(); banner = null; } }
  function privacyHref() {
    var a = document.querySelector('footer a[href$="cookies/"]');
    return a ? a.getAttribute('href') : '/cookies/';
  }
  function open() {
    if (banner) return;
    banner = document.createElement('section');
    banner.className = 'consent'; banner.setAttribute('aria-label', 'Analytics choice');
    var p = document.createElement('p');
    p.textContent = 'May we use Google Analytics to see which pages help visitors? It sets cookies only if you accept, and it is never used in the member room. ';
    var link = document.createElement('a'); link.href = privacyHref(); link.textContent = 'Cookie details';
    p.appendChild(link);
    var row = document.createElement('div');
    [['Accept', 'granted'], ['Reject', 'denied']].forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm'; b.textContent = o[0];
      b.addEventListener('click', function () { choose(o[1]); });
      row.appendChild(b);
    });
    banner.appendChild(p); banner.appendChild(row);
    document.body.appendChild(banner);
  }

  var style = document.createElement('style');
  style.textContent = '.consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:560px;margin:0 auto;padding:16px 18px;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:0 24px 60px -20px rgba(0,0,0,.85);display:grid;gap:12px;font-size:14.5px;line-height:1.55}.consent p{margin:0}.consent a{color:var(--accent)}.consent div{display:grid;grid-template-columns:1fr 1fr;gap:10px}.consent .btn{width:100%;border-color:var(--muted)}.footer-btn{all:unset;cursor:pointer}.footer-btn:hover{color:var(--ink)}.footer-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}';
  document.head.appendChild(style);

  var nav = document.querySelector('footer nav');
  if (nav) {
    var again = document.createElement('button'); again.type = 'button'; again.className = 'footer-btn'; again.textContent = 'Cookie settings';
    again.addEventListener('click', function () { open(); banner.querySelector('button').focus(); });
    nav.appendChild(again);
  }

  var choice = read();
  if (choice === 'granted') load();
  else if (choice !== 'denied') open();
})();
