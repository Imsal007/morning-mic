/* Founder Rehearsal: member room.
   Every read and write goes through row-level rules in the database, so a founder only ever sees their own rows and audio. */
(function () {
  'use strict';
  var cfg = window.FR || {};
  var $ = function (id) { return document.getElementById(id); };
  var views = { load: $('v-load'), out: $('v-out'), consent: $('v-consent'), room: $('v-room') };
  function show(name) { for (var k in views) views[k].hidden = k !== name; $('who').hidden = name !== 'room'; }
  function say(el, kind, text) { el.className = 'msg' + (kind ? ' ' + kind : ''); el.textContent = text || ''; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function when(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  if (!window.supabase || !cfg.url) { show('out'); say($('outMsg'), 'err', 'Sign in is not available right now. Please try again shortly.'); return; }
  var sb = window.supabase.createClient(cfg.url, cfg.key);
  var here = location.origin + location.pathname;

  var user = null, modules = [], takes = [], open = null, cueIdx = 0, urls = {};

  /* ---------- sign in ---------- */
  $('btnGoogle').addEventListener('click', function () {
    say($('outMsg'));
    sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here } }).then(function (r) {
      if (r.error) say($('outMsg'), 'err', 'Google sign in is not switched on yet. Use the email link below.');
    });
  });
  $('linkForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('linkEmail');
    if (!input.checkValidity()) { input.reportValidity(); return; }
    var btn = e.target.querySelector('button'); btn.disabled = true;
    sb.auth.signInWithOtp({ email: input.value.trim(), options: { emailRedirectTo: here } }).then(function (r) {
      btn.disabled = false;
      if (r.error) say($('outMsg'), 'err', 'That did not send. Check the address and try again in a minute.');
      else say($('outMsg'), 'ok', 'Check your inbox. The link signs you in on this device.');
    });
  });
  $('btnOut').addEventListener('click', function () { stopStream(); sb.auth.signOut(); });

  sb.auth.onAuthStateChange(function (event, session) {
    var next = session ? session.user : null;
    if (next && user && next.id === user.id) return;
    user = next;
    // never call the client from inside this callback
    setTimeout(function () { user ? enter() : (show('out')); }, 0);
  });

  /* ---------- load ---------- */
  function enter() {
    show('load');
    $('whoName').textContent = user.email || '';
    $('accEmail').textContent = 'Signed in as ' + (user.email || '');
    sb.from('profiles').select('consent_recordings_at').eq('id', user.id).maybeSingle().then(function (r) {
      if (r.error) { show('out'); say($('outMsg'), 'err', 'We could not open your room. Please sign in again.'); return; }
      if (!r.data || !r.data.consent_recordings_at) { show('consent'); return; }
      loadRoom();
    });
  }
  $('consentBox').addEventListener('change', function (e) { $('btnConsent').disabled = !e.target.checked; });
  $('btnConsent').addEventListener('click', function () {
    $('btnConsent').disabled = true;
    sb.from('profiles').update({ consent_recordings_at: new Date().toISOString() }).eq('id', user.id).then(function (r) {
      if (r.error) { $('btnConsent').disabled = false; say($('consentMsg'), 'err', 'That did not save. Please try again.'); return; }
      loadRoom();
    });
  });

  function loadRoom(keepOpen) {
    Promise.all([
      sb.from('modules').select('*').order('position'),
      sb.from('recordings').select('*').order('created_at')
    ]).then(function (res) {
      if (res[0].error || res[1].error) { show('room'); say($('roomMsg'), 'err', 'We could not load your ladder. Refresh to try again.'); return; }
      modules = res[0].data; takes = res[1].data;
      var keep = keepOpen && modules.filter(function (m) { return m.id === keepOpen; })[0];
      open = keep || modules.filter(function (m) { return m.status === 'current'; })[0] || modules[modules.length - 1] || null;
      if (!keep) cueIdx = 0;
      show('room'); renderLadder(); renderModule(); renderCompare();
    });
  }

  /* ---------- ladder ---------- */
  var LABEL = { passed: 'Passed', current: 'In progress', locked: 'Locked' };
  function renderLadder() {
    var ol = $('ladder'); ol.textContent = '';
    modules.forEach(function (m) {
      var li = el('li', m.status + (open && m.id === open.id ? ' open' : ''));
      var b = el('button'); b.type = 'button'; b.disabled = m.status === 'locked';
      b.appendChild(el('span', 'n', ('0' + m.position).slice(-2)));
      b.appendChild(el('span', null, m.title));
      b.appendChild(el('span', 's', LABEL[m.status]));
      b.addEventListener('click', function () { if (busy()) return; open = m; cueIdx = 0; resetReview(); renderLadder(); renderModule(); });
      li.appendChild(b); ol.appendChild(li);
    });
    var waiting = modules.length && modules.every(function (m) { return m.status === 'passed'; });
    $('ladderNote').textContent = waiting
      ? 'Your next modules are being written around your application. We will email you when they are ready.'
      : (modules.length === 1 ? 'Start with your baseline. The rest of your ladder is built around you.' : '');
  }

  /* ---------- module ---------- */
  function cuesOf(m) { return Array.isArray(m.cues) && m.cues.length ? m.cues : ['Speak for one minute on this module.']; }
  function renderModule() {
    if (!open) { $('work').hidden = true; return; }
    $('work').hidden = false;
    $('modKicker').textContent = 'Module ' + ('0' + open.position).slice(-2) + ' · ' + open.track;
    $('modTitle').textContent = open.title;
    $('modBrief').textContent = open.brief;
    $('modRule').textContent = open.pass_rule; $('modRule').hidden = !open.pass_rule;
    var list = cuesOf(open), box = $('cues'); box.textContent = '';
    if (cueIdx >= list.length) cueIdx = 0;
    list.forEach(function (c, i) {
      var b = el('button', null, 'Cue ' + (i + 1)); b.type = 'button'; b.setAttribute('aria-pressed', String(i === cueIdx));
      b.addEventListener('click', function () { if (busy()) return; cueIdx = i; resetReview(); renderModule(); });
      box.appendChild(b);
    });
    box.hidden = list.length < 2;
    $('cueText').textContent = list[cueIdx];
    renderTakes();
    var mine = takes.filter(function (t) { return t.module_id === open.id; });
    $('passBox').hidden = !(open.status === 'current' && mine.length);
  }

  function signed(path) {
    if (urls[path]) return Promise.resolve(urls[path]);
    return sb.storage.from('recordings').createSignedUrl(path, 3600).then(function (r) {
      if (r.error) throw r.error; urls[path] = r.data.signedUrl; return urls[path];
    });
  }
  function lazyAudio(audio, path) {
    audio.controls = true; audio.preload = 'none';
    var loaded = false;
    audio.addEventListener('play', function () {
      if (loaded) return; loaded = true; audio.pause();
      signed(path).then(function (u) { audio.src = u; audio.play(); }).catch(function () { loaded = false; });
    });
    // a source is needed for the play button to respond; resolve it on first interaction
    signed(path).then(function (u) { if (!loaded) { loaded = true; audio.src = u; } }).catch(function () {});
  }

  function renderTakes() {
    var ul = $('takes'); ul.textContent = '';
    var mine = takes.filter(function (t) { return t.module_id === open.id; }).reverse();
    if (!mine.length) { ul.appendChild(el('li', 'empty', 'No takes yet. Your first one becomes the take you compare against.')); return; }
    mine.forEach(function (t) {
      var li = el('li'), meta = el('div', 'meta');
      meta.appendChild(el('b', null, 'Cue ' + (t.cue_index + 1) + ' · ' + clock(t.duration_s)));
      meta.appendChild(el('span', null, when(t.created_at)));
      var a = el('audio'); lazyAudio(a, t.storage_path);
      var d = el('button', 'del', 'Delete'); d.type = 'button';
      d.addEventListener('click', function () {
        if (!d.classList.contains('sure')) { d.classList.add('sure'); d.textContent = 'Confirm delete'; setTimeout(function () { d.classList.remove('sure'); d.textContent = 'Delete'; }, 4000); return; }
        d.disabled = true;
        sb.storage.from('recordings').remove([t.storage_path]).then(function () {
          return sb.from('recordings').delete().eq('id', t.id);
        }).then(function (r) {
          if (r.error) { say($('roomMsg'), 'err', 'That take could not be deleted. Please try again.'); d.disabled = false; return; }
          loadRoom(open.id);
        });
      });
      li.appendChild(meta); li.appendChild(a); li.appendChild(d); ul.appendChild(li);
    });
  }

  function renderCompare() {
    var box = $('compare');
    if (takes.length < 2) { box.hidden = true; return; }
    var first = takes[0], last = takes[takes.length - 1];
    box.hidden = false;
    $('cmpFirstWhen').textContent = when(first.created_at); $('cmpLastWhen').textContent = when(last.created_at);
    signed(first.storage_path).then(function (u) { $('cmpFirst').src = u; }).catch(function () {});
    signed(last.storage_path).then(function (u) { $('cmpLast').src = u; }).catch(function () {});
  }

  /* ---------- recorder ---------- */
  var MAX = 180, rec = null, stream = null, chunks = [], t0 = 0, tick = null, blob = null, dur = 0, actx = null, raf = 0;
  function busy() { return !!rec; }
  function stopStream() {
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); }
    rec = null; clearInterval(tick); cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
    if (actx) { actx.close(); actx = null; }
    $('btnRec').style.setProperty('--lvl', 0);
    $('btnRec').setAttribute('aria-pressed', 'false'); $('recLabel').textContent = 'Record';
  }
  function resetReview() {
    blob = null; $('review').hidden = true; $('reviewAudio').removeAttribute('src'); $('recTime').textContent = '0:00';
    $('recHint').textContent = 'Read the cue, then press record. Three minutes at most.'; say($('roomMsg'));
  }
  $('btnRec').addEventListener('click', function () {
    if (rec) { rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { say($('roomMsg'), 'err', 'This browser cannot record audio. Try a current version of Chrome, Safari or Edge.'); return; }
    resetReview();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      stream = s;
      var mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
      rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      chunks = [];
      rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        dur = (performance.now() - t0) / 1000;
        blob = new Blob(chunks, { type: (rec.mimeType || 'audio/webm').split(';')[0] });
        stopStream();
        $('reviewAudio').src = URL.createObjectURL(blob); $('review').hidden = false;
        $('recHint').textContent = 'Listen back before you decide.';
      };
      rec.start(); t0 = performance.now();
      $('btnRec').setAttribute('aria-pressed', 'true'); $('recLabel').textContent = 'Stop';
      $('recHint').textContent = 'Recording. Press stop when you have finished.';
      tick = setInterval(function () {
        var s2 = (performance.now() - t0) / 1000; $('recTime').textContent = clock(s2);
        if (s2 >= MAX && rec) rec.stop();
      }, 200);
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        var an = actx.createAnalyser(); an.fftSize = 256; actx.createMediaStreamSource(s).connect(an);
        var buf = new Uint8Array(an.fftSize);
        (function level() {
          an.getByteTimeDomainData(buf);
          var peak = 0; for (var i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i] - 128));
          $('btnRec').style.setProperty('--lvl', Math.min(1, peak / 60).toFixed(2));
          raf = requestAnimationFrame(level);
        })();
      } catch (e) { /* the meter is a nicety */ }
    }).catch(function () { say($('roomMsg'), 'err', 'The microphone is blocked. Allow it for this site in your browser, then press record again.'); });
  });
  $('btnDiscard').addEventListener('click', resetReview);
  $('btnKeep').addEventListener('click', function () {
    if (!blob || !open) return;
    var ext = blob.type.indexOf('mp4') > -1 ? 'm4a' : (blob.type.indexOf('ogg') > -1 ? 'ogg' : 'webm');
    var path = user.id + '/' + open.id + '/' + Date.now() + '.' + ext;
    var keep = $('btnKeep'); keep.disabled = true; say($('roomMsg'), '', '');
    sb.storage.from('recordings').upload(path, blob, { contentType: blob.type, upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      return sb.from('recordings').insert({ module_id: open.id, cue_index: cueIdx, storage_path: path, duration_s: Math.min(900, Math.round(dur * 10) / 10) });
    }).then(function (r) {
      if (r.error) throw r.error;
      keep.disabled = false; resetReview(); say($('roomMsg'), 'ok', 'Saved to your room.'); loadRoom(open.id);
    }).catch(function () { keep.disabled = false; say($('roomMsg'), 'err', 'That take did not save. Check your connection and press keep again.'); });
  });

  $('btnPass').addEventListener('click', function () {
    var b = $('btnPass'); b.disabled = true;
    sb.rpc('pass_module', { p_module: open.id }).then(function (r) {
      b.disabled = false;
      if (r.error) { say($('roomMsg'), 'err', 'That module could not be passed yet. Record a take first.'); return; }
      say($('roomMsg'), 'ok', 'Passed. Well rehearsed.'); loadRoom();
    });
  });

  /* ---------- account ---------- */
  var dlg = $('account');
  $('btnAccount').addEventListener('click', function () { $('delWord').value = ''; $('btnDelete').disabled = true; say($('accMsg')); dlg.showModal(); });
  $('btnAccClose').addEventListener('click', function () { dlg.close(); });
  $('delWord').addEventListener('input', function (e) { $('btnDelete').disabled = e.target.value.trim() !== 'DELETE'; });
  $('btnDelete').addEventListener('click', function () {
    $('btnDelete').disabled = true; stopStream();
    var paths = takes.map(function (t) { return t.storage_path; });
    var files = paths.length ? sb.storage.from('recordings').remove(paths) : Promise.resolve({});
    files.then(function (r) {
      if (r && r.error) throw r.error;
      return sb.rpc('delete_my_account');
    }).then(function (r) {
      if (r.error) throw r.error;
      dlg.close(); return sb.auth.signOut({ scope: 'local' });
    }).then(function () {
      user = null; show('out'); say($('outMsg'), 'ok', 'Your account and every recording have been deleted.');
    }).catch(function () { say($('accMsg'), 'err', 'Deletion did not finish. Please try again.'); $('btnDelete').disabled = false; });
  });
})();
