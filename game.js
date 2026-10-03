(() => {
  'use strict';

  const DURATION = 60;
  const BEST_KEY = 'romaji-typing-best';

  const $ = (id) => document.getElementById(id);
  const screens = { start: $('screen-start'), play: $('screen-play'), result: $('screen-result') };

  let state = 'start';
  let typer = null;
  let word = null;
  let lastWord = null;
  let score = 0, correct = 0, miss = 0, combo = 0, maxCombo = 0;
  let endAt = 0;
  let timerId = null;

  // ---- 効果音 ----
  let audio = null;
  function beep(freq, ms, type = 'square', vol = 0.04) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol;
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + ms / 1000);
    } catch (e) { /* 音が出せない環境では無視 */ }
  }

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 保存できなくても続行 */ }
  }

  function show(name) {
    state = name;
    for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
  }

  function nextWord() {
    do { word = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (word === lastWord);
    lastWord = word;
    typer = new Romaji.Typer(word[1]);
    $('word').textContent = word[0];
    $('kana').textContent = word[1];
    render();
  }

  function render() {
    const g = typer.guide();
    $('typed').textContent = g.typed;
    $('next').textContent = g.rest.slice(0, 1);
    $('rest').textContent = g.rest.slice(1);
    $('score').textContent = score;
    $('combo').textContent = combo;
  }

  function tick() {
    const left = Math.max(0, endAt - performance.now());
    $('time').textContent = Math.ceil(left / 1000);
    $('timebar-fill').style.width = `${(left / (DURATION * 1000)) * 100}%`;
    if (left <= 0) finish();
  }

  function start() {
    score = correct = miss = combo = maxCombo = 0;
    show('play');
    nextWord();
    endAt = performance.now() + DURATION * 1000;
    clearInterval(timerId);
    timerId = setInterval(tick, 100);
    tick();
    beep(880, 120, 'sine', 0.06);
  }

  function rankFor(s) {
    if (s >= 600) return ['S', 'タイピングの達人！'];
    if (s >= 400) return ['A', 'かなり速い！'];
    if (s >= 250) return ['B', 'いい調子！'];
    if (s >= 120) return ['C', 'まずまず'];
    return ['D', '練習あるのみ！'];
  }

  function finish() {
    clearInterval(timerId);
    const best = loadBest();
    const isBest = score > best;
    if (isBest) saveBest(score);

    const [rank, msg] = rankFor(score);
    const total = correct + miss;
    $('rank').innerHTML = `<span class="rank-letter">${rank}</span><span>${msg}</span>`;
    $('r-score').textContent = score;
    $('r-correct').textContent = correct;
    $('r-miss').textContent = miss;
    $('r-acc').textContent = total ? `${((correct / total) * 100).toFixed(1)}%` : '-';
    $('r-kpm').textContent = `${correct} 打/分`;
    $('r-combo').textContent = maxCombo;
    $('r-best').textContent = isBest ? `${score}（新記録！）` : Math.max(best, score);
    show('result');
    beep(isBest ? 1320 : 440, 400, 'triangle', 0.06);
  }

  function handleChar(ch) {
    if (state !== 'play') return;
    if (typer.input(ch)) {
      correct += 1;
      combo += 1;
      maxCombo = Math.max(maxCombo, combo);
      // コンボが続くほど1打の点数が上がる（最大3倍）
      score += 1 + Math.min(2, Math.floor(combo / 50));
      beep(660 + Math.min(combo, 100) * 4, 30);
      if (typer.done) {
        score += word[1].length * 2;
        beep(1200, 80, 'sine', 0.05);
        nextWord();
        return;
      }
    } else {
      miss += 1;
      combo = 0;
      beep(140, 120, 'sawtooth', 0.05);
      const el = $('screen-play');
      el.classList.remove('shake');
      void el.offsetWidth; // アニメーションを再始動
      el.classList.add('shake');
    }
    render();
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    if (state !== 'play') {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); }
      else if (e.key === 'Escape' && state === 'result') show('start');
      return;
    }
    if (e.key === 'Escape') { clearInterval(timerId); show('start'); return; }
    if (e.key.length === 1) {
      e.preventDefault();
      handleChar(e.key);
    }
  });

  // スマホ: 画面タップで隠し入力欄にフォーカスし、ソフトウェアキーボードから受け取る
  const mobileInput = $('mobile-input');
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    mobileInput.focus();
    if (state !== 'play') start();
  });
  mobileInput.addEventListener('input', () => {
    for (const ch of mobileInput.value) handleChar(ch);
    mobileInput.value = '';
  });

  $('r-best').textContent = loadBest();
})();
