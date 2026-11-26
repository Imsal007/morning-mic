/* Founder Rehearsal: scored drills (modules that have `scoring` set).
   Scoring measures what the browser's British English speech checker heard. It does not listen for accent. */
(function () {
  'use strict';
  var CLARITY_PASS = 90, READ_MAX_FILLERS = 1;
  var FILLERS = ['um', 'umm', 'uh', 'er', 'erm', 'ah', 'like', 'basically', 'actually', 'literally', 'you know', 'i mean', 'sort of', 'kind of'];

  /* ---------- scoring ---------- */
  function norm(s) { return s.toLowerCase().replace(/[‘’ʼ']/g, '').replace(/[-–—]/g, ' ').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean); }
  function countFillers(words) {
    var s = ' ' + words.join('  ') + ' ', n = 0;
    FILLERS.forEach(function (f) { var m = s.match(new RegExp(' ' + f.replace(/ /g, '  ') + ' ', 'g')); if (m) n += m.length; });
    return n;
  }
  function matched(a, b) { // longest common subsequence: which script words were heard
    var dp = [], i, j, hit = {};
    for (i = 0; i <= a.length; i++) dp.push(new Uint16Array(b.length + 1));
    for (i = a.length - 1; i >= 0; i--) for (j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    i = 0; j = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    return hit;
  }
  function score(scoring, text, heard, secs, checked) {
    var read = scoring.kind === 'read', hw = norm(heard);
    var wpm = secs > 2 && hw.length ? Math.round(hw.length / (secs / 60)) : null;
    var clarity = null, missIdx = [], missed = [], fillers, pass;
    if (read) {
      var tw = norm(text), hit = matched(tw, hw), n = 0;
      tw.forEach(function (w, i) { if (hit[i]) n++; else { missIdx.push(i); missed.push(w); } });
      clarity = checked ? (tw.length ? Math.round(100 * n / tw.length) : 0) : null;
      if (!checked) { missIdx = []; missed = []; }
      fillers = Math.max(0, countFillers(hw) - countFillers(tw));
      pass = checked && clarity >= CLARITY_PASS && wpm !== null && wpm >= scoring.wpm[0] && wpm <= scoring.wpm[1] && fillers <= READ_MAX_FILLERS;
    } else {
      fillers = countFillers(hw);
      pass = checked && secs >= scoring.minSecs && fillers <= scoring.maxFillers && hw.length > 0;
    }
    return { heard: heard, checked: checked, clarity: clarity, wpm: wpm, fillers: fillers, secs: Math.min(900, Math.round(secs)), missIdx: missIdx, missed: missed, pass: !!pass };
  }

  /* ---------- plain-language help ---------- */
  // how long a script takes inside the pace range
  function readSeconds(scoring, text) {
    var n = norm(text).length;
    return [Math.ceil(n * 60 / scoring.wpm[1]), Math.floor(n * 60 / scoring.wpm[0])];
  }
  function seconds(range) { return range[0] >= range[1] ? 'about ' + range[0] + ' seconds' : 'about ' + range[0] + ' to ' + range[1] + ' seconds'; }
  // one line for each target that was missed, saying what to change
  function advice(scoring, text, r) {
    var out = [], read = scoring.kind === 'read';
    if (!r.checked) return out;
    if (read) {
      if (r.clarity < CLARITY_PASS) out.push('Clarity ' + r.clarity + '%, needs ' + CLARITY_PASS + '% or more. Practise the underlined words, finish each ending, then read the whole line again. The checker can also mishear names and brand names.');
      var lo = scoring.wpm[0], hi = scoring.wpm[1], aim = 'Aim for ' + seconds(readSeconds(scoring, text)) + ' from Record to Stop.';
      if (r.wpm === null) out.push('Pace could not be measured. Read the whole line, then press Stop.');
      else if (r.wpm < lo) out.push('Pace ' + r.wpm + ' is too slow: speak a bit faster, to at least ' + lo + ' words a minute. ' + aim + ' Silence at the start and end counts, so start speaking straight away and press Stop as soon as you finish.');
      else if (r.wpm > hi) out.push('Pace ' + r.wpm + ' is too fast: slow down to ' + hi + ' words a minute or fewer. ' + aim + ' Pause briefly at each full stop.');
      if (r.fillers > READ_MAX_FILLERS) out.push('Fillers ' + r.fillers + ', no more than ' + READ_MAX_FILLERS + ' allowed. Read only the words on the screen, and pause silently if you need a moment.');
    } else {
      if (r.secs < scoring.minSecs) out.push('Time ' + r.secs + ' seconds is too short: keep going for at least ' + (scoring.minSecs - r.secs) + ' more. Add a reason or an example.');
      if (r.fillers > scoring.maxFillers) out.push('Fillers ' + r.fillers + ', no more than ' + scoring.maxFillers + ' allowed. When you feel “um” coming, close your mouth and pause.');
      if (!r.heard) out.push('The speech checker heard no words. Check your microphone and try again.');
    }
    return out;
  }

  /* ---------- listening ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var cur = null;
  function listen(onText) {
    abort();
    var s = cur = { final: '', interim: '', blocked: !SR, active: true, sr: null };
    if (!SR) return;
    var r = s.sr = new SR(); r.lang = 'en-GB'; r.continuous = true; r.interimResults = true;
    r.onresult = function (ev) {
      s.interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) { var x = ev.results[i]; if (x.isFinal) s.final += x[0].transcript + ' '; else s.interim += x[0].transcript; }
      onText((s.final + s.interim).trim() || 'Listening…');
    };
    r.onerror = function (ev) {
      if (['not-allowed', 'service-not-allowed', 'network', 'language-not-supported', 'audio-capture'].indexOf(ev.error) > -1) {
        s.blocked = true; onText('The speech checker could not run, so this take is recording only. Try Chrome, Edge or Safari.');
      }
    };
    r.onend = function () { if (s.active && !s.blocked) try { r.start(); } catch (e) {} };
    try { r.start(); } catch (e) { s.blocked = true; }
  }
  function finish() {
    var s = cur; cur = null;
    if (!s) return Promise.resolve({ heard: '', checked: false });
    s.active = false;
    function out() { var heard = (s.final.trim() || s.interim.trim()).slice(0, 6000); return { heard: s.blocked ? '' : heard, checked: !s.blocked }; }
    if (!s.sr) return Promise.resolve(out());
    return new Promise(function (done) {
      s.sr.onend = function () { done(out()); };
      try { s.sr.stop(); } catch (e) { done(out()); }
      setTimeout(function () { done(out()); }, 1500);
    });
  }
  function abort() { if (cur) { cur.active = false; try { cur.sr && cur.sr.abort(); } catch (e) {} cur = null; } }

  /* ---------- British model voice ---------- */
  var voices = [];
  function loadVoices() { voices = window.speechSynthesis.getVoices(); }
  if ('speechSynthesis' in window) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }
  function britishVoice() {
    var gb = voices.filter(function (v) { return /en[-_]GB/i.test(v.lang); });
    var pref = ['Google UK English Male', 'Daniel', 'Arthur', 'Google UK English Female', 'Serena', 'Kate', 'Martha', 'Oliver'];
    for (var i = 0; i < pref.length; i++) { var hit = gb.filter(function (v) { return v.name.indexOf(pref[i]) > -1; })[0]; if (hit) return hit; }
    return gb[0] || null;
  }
  function speak(text, rate) {
    if (!('speechSynthesis' in window)) return 'This browser cannot play the model voice.';
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text), v = britishVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-GB';
    u.rate = rate; window.speechSynthesis.speak(u);
    return v ? 'Model voice: ' + v.name + '. Listen once, then shadow it.' : 'No British voice is installed on this device, so this is the default English voice.';
  }
  function hush() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }

  /* ---------- copy for Claude ---------- */
  function brief(m, text, r) {
    var read = m.scoring.kind === 'read';
    return 'You are a warm, direct speaking coach training a London founder to speak clearly and confidently on camera in British English. You cannot hear audio. You only get what an en-GB speech recogniser heard, plus timing. Treat words the recogniser missed or misheard as likely pronunciation or clarity problems, and say so carefully.\n\n' +
      'Module ' + m.position + ': ' + m.title + '. Focus: ' + m.brief + '\n' +
      'Drill type: ' + (read ? 'read aloud from script' : 'spoken answer, no script') + '\n' +
      (read ? 'Script: ' : 'Question: ') + text + '\n' +
      'Recogniser heard: "' + (r.heard || '(nothing)') + '"\n' +
      (read ? 'Words missed: ' + (r.missed.join(', ') || 'none') + '\nClarity: ' + r.clarity + '%\n' : '') +
      'Pace: ' + (r.wpm === null ? 'unknown' : r.wpm) + ' wpm. Fillers counted: ' + r.fillers + '. Length: ' + r.secs + 's.\n\n' +
      'Give me: a score out of 10, one thing that worked, the single most important fix, and one exercise for my next take. ' +
      (read ? 'Score clarity and delivery against the script.' : 'Score structure, clarity and confidence of the answer; 7 or more means good enough to post on camera.');
  }

  window.FRPractice = { CLARITY_PASS: CLARITY_PASS, READ_MAX_FILLERS: READ_MAX_FILLERS, supported: !!SR, norm: norm, score: score, advice: advice, readSeconds: readSeconds, seconds: seconds, listen: listen, finish: finish, abort: abort, speak: speak, hush: hush, brief: brief };
})();
