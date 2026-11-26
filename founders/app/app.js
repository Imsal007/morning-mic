/* Founder Rehearsal: member room.
   Every read and write goes through row-level rules in the database, so a founder only ever sees their own rows and audio. */
(function () {
  'use strict';
  var cfg = window.FR || {};
  var $ = function (id) { return document.getElementById(id); };
  var views = { load: $('v-load'), out: $('v-out'), consent: $('v-consent'), room: $('v-room'), profile: $('v-profile') };
  function show(name) { for (var k in views) views[k].hidden = k !== name; $('who').hidden = name !== 'room' && name !== 'profile'; $('btnProfile').textContent = name === 'profile' ? 'Back to practice' : 'My profile'; }
  function say(el, kind, text) { el.className = 'msg' + (kind ? ' ' + kind : ''); el.textContent = text || ''; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function clock(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function when(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }

  if (!window.supabase || !cfg.url) { show('out'); say($('outMsg'), 'err', 'Sign in is not available right now. Please try again shortly.'); return; }
  var sb = window.supabase.createClient(cfg.url, cfg.key);
  var here = location.origin + location.pathname;

  var MAX_SAVED = 30; // the database enforces the same limit
  var user = null, modules = [], takes = [], open = null, cueIdx = 0, urls = {};
  var P = window.FRPractice, passes = [], recent = [], result = null, scoringNow = false;

  /* ---------- sign in ---------- */
  // Show Google only once it is switched on in the project; otherwise the button leads to an error page.
  fetch(cfg.url + '/auth/v1/settings', { headers: { apikey: cfg.key } })
    .then(function (r) { return r.json(); })
    .then(function (s) { if (s && s.external && s.external.google) { $('btnGoogle').hidden = false; $('orRow').hidden = false; } })
    .catch(function () {});
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
      if (r.error) say($('outMsg'), 'err', r.error.code === 'email_address_not_authorized' ? 'Member sign-in is not open to this address yet. Email hello@founderrehearsal.com and we will help.' : 'That did not send. Check the address and try again in a minute.');
      else say($('outMsg'), 'ok', 'Check your inbox. The link signs you in on this device.');
    });
  });
  $('btnOut').addEventListener('click', function () { stopStream(); sb.auth.signOut(); });

  sb.auth.onAuthStateChange(function (event, session) {
    var next = session ? session.user : null;
    if (next && user && next.id === user.id) return;
    user = next; result = null; resetProfile();
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

  function loadRoom(keepOpen, note) {
    Promise.all([
      sb.from('modules').select('*').order('position'),
      sb.from('recordings').select('*').order('created_at'),
      sb.from('attempts').select('module_id,cue_index').eq('passed', true),
      sb.from('attempts').select('*').order('created_at', { ascending: false }).limit(12)
    ]).then(function (res) {
      if (res.some(function (x) { return x.error; })) { show('room'); say($('roomMsg'), 'err', 'We could not load your ladder. Refresh to try again.'); return; }
      modules = res[0].data; takes = res[1].data; passes = res[2].data; recent = res[3].data;
      var keep = keepOpen && modules.filter(function (m) { return m.id === keepOpen; })[0];
      open = keep || modules.filter(function (m) { return m.status === 'current'; })[0] || modules[modules.length - 1] || null;
      if (!keep) cueIdx = 0;
      show('room'); renderLadder(); renderModule(); renderCompare();
      if (note) { say($('roomMsg'), 'ok', note + (open && open.status === 'current' ? ' Now on module ' + open.position + ': ' + open.title + '.' : '')); window.scrollTo(0, 0); $('modKicker').scrollIntoView({ block: 'center' }); }
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
    $('modKicker').textContent = 'Module ' + ('0' + open.position).slice(-2) + (open.scoring ? ' of ' + modules.length : '') + ' · ' + open.track;
    $('modTitle').textContent = open.title;
    $('modBrief').textContent = open.brief;
    $('modRule').textContent = open.pass_rule; $('modRule').hidden = !open.pass_rule;
    var list = cuesOf(open), box = $('cues'); box.textContent = '';
    if (cueIdx >= list.length) cueIdx = 0;
    list.forEach(function (c, i) {
      var b = el('button', open.scoring && drillPassed(open.id, i) ? 'done' : null, (open.scoring ? 'Drill ' : 'Cue ') + (i + 1) + (open.scoring && drillPassed(open.id, i) ? ' ✓' : '')); b.type = 'button'; b.setAttribute('aria-pressed', String(i === cueIdx));
      b.addEventListener('click', function () { if (busy()) return; cueIdx = i; resetReview(); renderModule(); });
      box.appendChild(b);
    });
    box.hidden = list.length < 2;
    $('cueText').textContent = list[cueIdx];
    renderTakes();
    var mine = takes.filter(function (t) { return t.module_id === open.id; });
    $('passBox').hidden = !(!open.scoring && open.status === 'current' && mine.length);
    renderScored();
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
    $('saveCount').textContent = 'Audio is saved only when you keep it. ' + takes.length + ' of ' + MAX_SAVED + ' saved recordings used.';
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

  /* ---------- scored drills ---------- */
  function drillPassed(moduleId, i) { return passes.some(function (a) { return a.module_id === moduleId && a.cue_index === i; }); }
  function metric(k, v, target, ok) {
    var d = el('div', 'metric'); d.appendChild(el('span', 'k', k));
    d.appendChild(el('span', 'v' + (ok === true ? ' ok' : ok === false ? ' no' : ''), v === null ? '—' : String(v)));
    d.appendChild(el('span', 't', target)); return d;
  }
  function markCue(missIdx) {
    var box = $('cueText'), text = cuesOf(open)[cueIdx], miss = {}, idx = 0;
    missIdx.forEach(function (i) { miss[i] = true; });
    box.textContent = '';
    text.split(/(\s+)/).forEach(function (tok) {
      if (/^\s+$/.test(tok)) { box.appendChild(document.createTextNode(tok)); return; }
      var bad = false; P.norm(tok).forEach(function () { if (miss[idx]) bad = true; idx++; });
      box.appendChild(el('span', bad ? 'miss' : null, tok));
    });
  }
  function renderScored() {
    var s = open.scoring;
    ['score', 'signBox', 'scores', 'srNote', 'live'].forEach(function (id) { $(id).hidden = !s; });
    $('model').hidden = !s || s.kind !== 'read';
    if (!s) return;
    var read = s.kind === 'read', n = cuesOf(open).length, done = 0;
    for (var i = 0; i < n; i++) if (drillPassed(open.id, i)) done++;
    $('srNote').textContent = P.supported
      ? 'Scores come from your browser’s British English speech checker, which may send your audio to the browser’s provider (such as Google or Apple) to turn it into words. It checks whether each word came through, not your accent: use the model voice and your playback for that.'
      : 'This browser has no speech checker, so takes cannot be scored. Open your room in Chrome, Edge or Safari.';
    if (!read) $('cueText').appendChild(el('span', 'hint', 'No script. Take five seconds to think, then answer. Aim for ' + s.minSecs + '–' + (s.minSecs + 45) + ' seconds.'));

    var r = result || (read ? { clarity: 86, wpm: 178, fillers: 0, secs: 14 } : { wpm: 152, fillers: 3, secs: 31 });
    $('exampleTag').hidden = !!result;
    var box = $('metrics'); box.textContent = '';
    if (read) box.appendChild(metric('Clarity', r.clarity === null ? null : r.clarity + '%', 'target ≥ ' + P.CLARITY_PASS + '%', r.clarity === null ? null : r.clarity >= P.CLARITY_PASS));
    else box.appendChild(metric('Coach', null, 'no AI coach yet', null));
    box.appendChild(metric('Pace', r.wpm, read ? s.wpm[0] + '–' + s.wpm[1] + ' wpm' : '130–170 wpm feels natural', read && r.wpm !== null ? r.wpm >= s.wpm[0] && r.wpm <= s.wpm[1] : null));
    var maxF = read ? P.READ_MAX_FILLERS : s.maxFillers;
    box.appendChild(metric('Fillers', result && !result.checked ? null : r.fillers, 'target ≤ ' + maxF, result && !result.checked ? null : r.fillers <= maxF));
    box.appendChild(metric('Time', clock(r.secs), read ? '' : 'at least ' + s.minSecs + 's', read ? null : r.secs >= s.minSecs));
    var v = $('verdict');
    v.className = 'verdict' + (result && result.checked ? (result.pass ? ' ok' : ' no') : '');
    v.textContent = !result ? '' : !result.checked ? 'No speech checker ran for this take, so there is no score. Play it back and judge it against the model voice.'
      : result.pass ? 'Drill passed. Move to the next drill, or do one more clean take.' : 'Not yet. Look at the red numbers and the underlined words, then take it again.';
    if (result && read) markCue(result.missIdx);
    $('btnCoach').disabled = !result || !result.checked;

    $('signTitle').textContent = 'Module ' + open.position + ' sign-off';
    $('signNote').textContent = open.status === 'passed'
      ? 'Signed off on ' + when(open.passed_at) + '. Come back any time to keep it sharp.'
      : done + ' of ' + n + ' drills passed. When every drill has a passing take, ask to be signed off. The check uses your numbers.';
    $('btnSign').hidden = open.status === 'passed';
    $('btnSign').disabled = done < n;
    renderLog();
  }
  function twoStep(d, act) {
    d.addEventListener('click', function () {
      if (busy()) return;
      if (!d.classList.contains('sure')) { d.classList.add('sure'); d.textContent = 'Confirm delete'; setTimeout(function () { d.classList.remove('sure'); d.textContent = 'Delete'; }, 4000); return; }
      d.disabled = true; act();
    });
  }
  function renderLog() {
    var tb = $('log'); tb.textContent = '';
    if (!recent.length) { var tr0 = el('tr'), td0 = el('td', null, 'No scores yet. Your first take lands here.'); td0.colSpan = 8; tr0.appendChild(td0); tb.appendChild(tr0); return; }
    recent.forEach(function (a) {
      var m = modules.filter(function (x) { return x.id === a.module_id; })[0], tr = el('tr');
      [new Date(a.created_at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }),
        'M' + (m ? m.position : '?') + '·D' + (a.cue_index + 1), a.clarity === null ? '—' : a.clarity + '%', a.wpm === null ? '—' : a.wpm, a.fillers, clock(a.duration_s)
      ].forEach(function (x) { tr.appendChild(el('td', null, String(x))); });
      tr.appendChild(el('td', a.passed ? 'ok' : 'no', a.passed ? 'Pass' : 'Again'));
      var cell = el('td'), d = el('button', 'del', 'Delete'); d.type = 'button';
      d.setAttribute('aria-label', 'Delete this score');
      twoStep(d, function () {
        sb.from('attempts').delete().eq('id', a.id).then(function (r) {
          if (r.error) { say($('roomMsg'), 'err', 'That score could not be deleted. Please try again.'); d.disabled = false; return; }
          loadRoom(open.id);
        });
      });
      cell.appendChild(d); tr.appendChild(cell);
      tb.appendChild(tr);
    });
  }
  function scoreTake(mod, idx, secs) {
    scoringNow = true; $('btnRec').disabled = true;
    P.finish().then(function (h) {
      scoringNow = false; $('btnRec').disabled = false;
      if (!user || !open || open.id !== mod.id || cueIdx !== idx) return;
      result = P.score(mod.scoring, cuesOf(mod)[idx], h.heard, secs, h.checked);
      if (h.checked) $('live').textContent = h.heard || 'The speech checker heard nothing. Check your microphone.';
      renderModule();
      if (!h.checked) return;
      var row = { module_id: mod.id, cue_index: idx, clarity: result.clarity, wpm: result.wpm === null ? null : Math.min(2000, result.wpm), fillers: result.fillers, duration_s: result.secs, passed: result.pass };
      sb.from('attempts').insert(row).select('*').single().then(function (r) {
        if (r.error) { say($('roomMsg'), 'err', 'Your score did not save, so it will not count yet. Check your connection and take it again.'); return; }
        recent = [r.data].concat(recent).slice(0, 12);
        if (r.data.passed) passes.push({ module_id: mod.id, cue_index: idx });
        if (open && open.id === mod.id) renderModule();
      });
    });
  }
  $('btnHear').addEventListener('click', function () { if (busy() || !open) return; $('live').textContent = P.speak(cuesOf(open)[cueIdx], Number($('rate').value)); });
  $('btnCoach').addEventListener('click', function () {
    if (!result || !open) return;
    var text = P.brief(open, cuesOf(open)[cueIdx], result), box = $('coachText');
    function manual() { box.value = text; box.hidden = false; box.select(); $('coachOut').textContent = 'Copy the text below and paste it into Claude.'; }
    if (!navigator.clipboard) { manual(); return; }
    navigator.clipboard.writeText(text).then(function () { $('coachOut').textContent = 'Take copied. Paste it into Claude and it will score this take and tell you the one thing to fix.'; }, manual);
  });
  $('btnSign').addEventListener('click', function () {
    var b = $('btnSign'), was = open; b.disabled = true;
    sb.rpc('pass_module', { p_module: was.id }).then(function (r) {
      if (r.error) { b.disabled = false; say($('roomMsg'), 'err', 'That module could not be signed off. Every drill needs a saved passing take.'); return; }
      resetReview(); loadRoom(null, 'Module ' + was.position + ' signed off. Every drill had a passing take. Well rehearsed.');
    });
  });

  /* ---------- recorder ---------- */
  var MAX = 180, rec = null, stream = null, chunks = [], t0 = 0, tick = null, blob = null, dur = 0, actx = null, raf = 0;
  function busy() { return !!rec || scoringNow; }
  function stopStream() {
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); P.abort(); }
    rec = null; clearInterval(tick); cancelAnimationFrame(raf);
    if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null;
    if (actx) { actx.close(); actx = null; }
    $('btnRec').style.setProperty('--lvl', 0);
    $('btnRec').setAttribute('aria-pressed', 'false'); $('recLabel').textContent = 'Record';
  }
  function resetReview() {
    result = null; $('live').textContent = ''; $('coachText').hidden = true; P.hush();
    $('coachOut').textContent = 'Record a take, then copy it and paste it into Claude for feedback. No AI coach is connected inside this room yet.';
    blob = null; $('review').hidden = true; $('reviewAudio').removeAttribute('src'); $('recTime').textContent = '0:00';
    $('recHint').textContent = 'Read the cue, then press record. Three minutes at most.'; say($('roomMsg'));
  }
  $('btnRec').addEventListener('click', function () {
    if (rec) { rec.stop(); return; }
    if (scoringNow) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { say($('roomMsg'), 'err', 'This browser cannot record audio. Try a current version of Chrome, Safari or Edge.'); return; }
    resetReview(); if (open.scoring) renderModule();
    var mod = open, idx = cueIdx;
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
        if (mod.scoring) scoreTake(mod, idx, dur);
      };
      rec.start(); t0 = performance.now();
      if (mod.scoring) { $('live').textContent = 'Listening\u2026'; P.listen(function (t) { $('live').textContent = t; }); }
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
  // discarding the audio keeps the score: the take has already been counted
  $('btnDiscard').addEventListener('click', function () { blob = null; $('review').hidden = true; $('reviewAudio').removeAttribute('src'); });
  $('btnKeep').addEventListener('click', function () {
    if (!blob || !open) return;
    if (takes.length >= MAX_SAVED) { say($('roomMsg'), 'err', 'You have ' + MAX_SAVED + ' saved recordings, the most you can keep for now. Delete one to save another.'); return; }
    var ext = blob.type.indexOf('mp4') > -1 ? 'm4a' : (blob.type.indexOf('ogg') > -1 ? 'ogg' : 'webm');
    var path = user.id + '/' + open.id + '/' + Date.now() + '.' + ext;
    var keep = $('btnKeep'); keep.disabled = true; say($('roomMsg'), '', '');
    sb.storage.from('recordings').upload(path, blob, { contentType: blob.type, upsert: false }).then(function (r) {
      if (r.error) throw r.error;
      return sb.from('recordings').insert({ module_id: open.id, cue_index: cueIdx, storage_path: path, duration_s: Math.min(900, Math.round(dur * 10) / 10) }).then(function (x) {
        // never leave audio behind without its record
        if (x.error) return sb.storage.from('recordings').remove([path]).then(function () { return x; });
        return x;
      });
    }).then(function (r) {
      if (r.error) throw r.error;
      keep.disabled = false; $('review').hidden = true; blob = null; say($('roomMsg'), 'ok', 'Saved to your room.'); loadRoom(open.id);
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

  /* ---------- profile ---------- */
  var FIELDS = ['full_name', 'company', 'role', 'goal', 'subject', 'comfort', 'english', 'minutes', 'deadline'];
  var form = $('profileForm'), filledFor = null;
  function resetProfile() { filledFor = null; form.reset(); $('profFields').disabled = true; say($('profMsg')); }
  function fillProfile() {
    if (filledFor === user.id) return; // keep anything typed but not yet saved
    var id = user.id; $('profFields').disabled = true; say($('profMsg'));
    sb.from('profiles').select(FIELDS.join(',')).eq('id', id).single().then(function (r) {
      if (!user || user.id !== id) return;
      // the form stays locked on failure, so blanks can never overwrite what is saved
      if (r.error) { say($('profMsg'), 'err', 'We could not load your profile. Go back to practice and open it again.'); return; }
      FIELDS.forEach(function (k) { form.elements[k].value = r.data[k] || ''; });
      filledFor = id; $('profFields').disabled = false;
    });
  }
  function renderProgress() {
    var ul = $('progList'); ul.textContent = '';
    var passed = modules.filter(function (m) { return m.status === 'passed'; }).length;
    $('progSum').textContent = passed + ' of ' + modules.length + (modules.length === 1 ? ' module' : ' modules') + ' passed · ' + takes.length + (takes.length === 1 ? ' saved take' : ' saved takes');
    modules.forEach(function (m) {
      var n = takes.filter(function (t) { return t.module_id === m.id; }).length;
      var li = el('li', m.status);
      li.appendChild(el('b', null, m.title));
      li.appendChild(el('span', null, LABEL[m.status] + ' · ' + n + (n === 1 ? ' take' : ' takes')));
      ul.appendChild(li);
    });
  }
  $('btnProfile').addEventListener('click', function () {
    if (!views.profile.hidden) { show('room'); window.scrollTo(0, 0); return; }
    if (busy()) { say($('roomMsg'), 'err', 'Stop the recording first, then open your profile.'); return; }
    Array.prototype.forEach.call(document.querySelectorAll('audio'), function (a) { a.pause(); });
    show('profile'); renderProgress(); fillProfile(); window.scrollTo(0, 0); $('profTitle').focus({ preventScroll: true });
  });
  form.addEventListener('input', function () { say($('profMsg')); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var row = { profile_updated_at: new Date().toISOString() };
    FIELDS.forEach(function (k) { row[k] = form.elements[k].value.trim() || null; });
    var btn = form.querySelector('button[type="submit"]'); btn.disabled = true; say($('profMsg'));
    sb.from('profiles').update(row).eq('id', user.id).select('id').single().then(function (r) {
      btn.disabled = false;
      if (r.error) say($('profMsg'), 'err', 'Your profile did not save. Please try again.');
      else say($('profMsg'), 'ok', 'Saved.');
    });
  });

  /* ---------- delete account ---------- */
  var dlg = $('account');
  $('btnAskDelete').addEventListener('click', function () { $('delWord').value = ''; $('btnDelete').disabled = true; say($('accMsg')); dlg.showModal(); });
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
