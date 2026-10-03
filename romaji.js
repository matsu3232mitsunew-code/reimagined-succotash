// かな → ローマ字の入力判定エンジン。
// 「し」は shi / si / ci、「ん」は nn / n / xn のように複数の打ち方を受け付ける。
(function (root) {
  'use strict';

  const BASE = {
    'あ': ['a'], 'い': ['i', 'yi'], 'う': ['u', 'wu', 'whu'], 'え': ['e'], 'お': ['o'],
    'か': ['ka', 'ca'], 'き': ['ki'], 'く': ['ku', 'cu', 'qu'], 'け': ['ke'], 'こ': ['ko', 'co'],
    'さ': ['sa'], 'し': ['shi', 'si', 'ci'], 'す': ['su'], 'せ': ['se', 'ce'], 'そ': ['so'],
    'た': ['ta'], 'ち': ['chi', 'ti'], 'つ': ['tsu', 'tu'], 'て': ['te'], 'と': ['to'],
    'な': ['na'], 'に': ['ni'], 'ぬ': ['nu'], 'ね': ['ne'], 'の': ['no'],
    'は': ['ha'], 'ひ': ['hi'], 'ふ': ['fu', 'hu'], 'へ': ['he'], 'ほ': ['ho'],
    'ま': ['ma'], 'み': ['mi'], 'む': ['mu'], 'め': ['me'], 'も': ['mo'],
    'や': ['ya'], 'ゆ': ['yu'], 'よ': ['yo'],
    'ら': ['ra'], 'り': ['ri'], 'る': ['ru'], 'れ': ['re'], 'ろ': ['ro'],
    'わ': ['wa'], 'を': ['wo'],
    'が': ['ga'], 'ぎ': ['gi'], 'ぐ': ['gu'], 'げ': ['ge'], 'ご': ['go'],
    'ざ': ['za'], 'じ': ['ji', 'zi'], 'ず': ['zu'], 'ぜ': ['ze'], 'ぞ': ['zo'],
    'だ': ['da'], 'ぢ': ['di'], 'づ': ['du'], 'で': ['de'], 'ど': ['do'],
    'ば': ['ba'], 'び': ['bi'], 'ぶ': ['bu'], 'べ': ['be'], 'ぼ': ['bo'],
    'ぱ': ['pa'], 'ぴ': ['pi'], 'ぷ': ['pu'], 'ぺ': ['pe'], 'ぽ': ['po'],
    'ゔ': ['vu'],
    'ぁ': ['xa', 'la'], 'ぃ': ['xi', 'li'], 'ぅ': ['xu', 'lu'], 'ぇ': ['xe', 'le'], 'ぉ': ['xo', 'lo'],
    'ゃ': ['xya', 'lya'], 'ゅ': ['xyu', 'lyu'], 'ょ': ['xyo', 'lyo'],
    'っ': ['xtu', 'ltu', 'xtsu', 'ltsu'],
    'ー': ['-'], '、': [','], '。': ['.'], '！': ['!'], '？': ['?'], '　': [' '], ' ': [' '],
  };

  // 2文字で1音になる組み合わせ（拗音など）。分割入力（ki + xya）も別途許可する。
  const COMBO = {
    'きゃ': ['kya'], 'きゅ': ['kyu'], 'きょ': ['kyo'],
    'しゃ': ['sha', 'sya'], 'しゅ': ['shu', 'syu'], 'しょ': ['sho', 'syo'], 'しぇ': ['she', 'sye'],
    'ちゃ': ['cha', 'tya', 'cya'], 'ちゅ': ['chu', 'tyu', 'cyu'], 'ちょ': ['cho', 'tyo', 'cyo'], 'ちぇ': ['che', 'tye'],
    'にゃ': ['nya'], 'にゅ': ['nyu'], 'にょ': ['nyo'],
    'ひゃ': ['hya'], 'ひゅ': ['hyu'], 'ひょ': ['hyo'],
    'みゃ': ['mya'], 'みゅ': ['myu'], 'みょ': ['myo'],
    'りゃ': ['rya'], 'りゅ': ['ryu'], 'りょ': ['ryo'],
    'ぎゃ': ['gya'], 'ぎゅ': ['gyu'], 'ぎょ': ['gyo'],
    'じゃ': ['ja', 'zya', 'jya'], 'じゅ': ['ju', 'zyu', 'jyu'], 'じょ': ['jo', 'zyo', 'jyo'], 'じぇ': ['je', 'zye'],
    'ぢゃ': ['dya'], 'ぢゅ': ['dyu'], 'ぢょ': ['dyo'],
    'びゃ': ['bya'], 'びゅ': ['byu'], 'びょ': ['byo'],
    'ぴゃ': ['pya'], 'ぴゅ': ['pyu'], 'ぴょ': ['pyo'],
    'ふぁ': ['fa'], 'ふぃ': ['fi'], 'ふぇ': ['fe'], 'ふぉ': ['fo'],
    'てぃ': ['thi'], 'でぃ': ['dhi'], 'とぅ': ['twu'], 'どぅ': ['dwu'],
    'うぃ': ['wi'], 'うぇ': ['we'], 'ゔぁ': ['va'], 'ゔぃ': ['vi'], 'ゔぇ': ['ve'], 'ゔぉ': ['vo'],
  };

  const VOWELS_NY = 'aiueony';

  const toHiragana = (s) =>
    s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

  const unique = (arr) => [...new Set(arr)];

  // かな文字列を「チャンク」（1回で打ち切る単位）の配列に分割する。
  // 各チャンクは { kana, candidates } で、candidates は受理するローマ字の一覧。
  function buildChunks(kanaInput) {
    const kana = toHiragana(kanaInput);
    const raw = [];
    for (let i = 0; i < kana.length; ) {
      const two = kana.slice(i, i + 2);
      const one = kana[i];
      if (COMBO[two]) {
        const split = BASE[two[0]].flatMap((a) => BASE[two[1]].map((b) => a + b));
        raw.push({ kana: two, candidates: unique([...COMBO[two], ...split]) });
        i += 2;
      } else if (one === 'ん') {
        raw.push({ kana: 'ん', candidates: null }); // 次のチャンクを見て決める
        i += 1;
      } else if (BASE[one]) {
        raw.push({ kana: one, candidates: BASE[one].slice() });
        i += 1;
      } else if (/[ -~]/.test(one)) {
        raw.push({ kana: one, candidates: [one.toLowerCase()] });
        i += 1;
      } else {
        throw new Error(`未対応の文字: ${one}`);
      }
    }

    // 「ん」: 次が母音・な行・や行・終端でなければ n 一打ちも可
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].kana !== 'ん') continue;
      const next = raw[i + 1];
      const cands = ['nn', 'xn', "n'"];
      const nextNeedsDouble =
        !next ||
        next.kana === 'ん' ||
        next.candidates.some((c) => VOWELS_NY.includes(c[0]));
      if (!nextNeedsDouble) cands.push('n');
      raw[i].candidates = cands;
    }

    // 「っ」: 次のチャンクと結合し、子音の重ね打ち（kka 等）を許可する
    const chunks = [];
    for (let i = 0; i < raw.length; i++) {
      const cur = raw[i];
      const next = raw[i + 1];
      if (cur.kana === 'っ' && next && next.kana !== 'っ' && next.kana !== 'ん') {
        const doubled = next.candidates
          .filter((c) => /^[bcdfghjklmpqrstvwxyz]/.test(c))
          .map((c) => c[0] + c);
        const separate = cur.candidates.flatMap((a) => next.candidates.map((b) => a + b));
        chunks.push({ kana: cur.kana + next.kana, candidates: unique([...doubled, ...separate]) });
        i += 1;
      } else {
        chunks.push(cur);
      }
    }
    return chunks;
  }

  // 1つの単語の入力状態を管理する。
  class Typer {
    constructor(kana) {
      this.kana = kana;
      this.chunks = buildChunks(kana);
      this.index = 0; // 現在のチャンク
      this.buffer = ''; // 現在のチャンクで打った文字
      this.typed = ''; // 確定済みのローマ字
    }

    get done() {
      return this.index >= this.chunks.length;
    }

    // キーを1つ入力する。正しければ true、ミスなら false。
    input(rawKey) {
      if (this.done) return false;
      const key = rawKey.toLowerCase();
      const chunk = this.chunks[this.index];
      const next = this.buffer + key;
      const matches = chunk.candidates.filter((c) => c.startsWith(next));

      if (matches.length > 0) {
        this.buffer = next;
        // 完全一致し、かつそれ以上長い候補がなければ確定
        if (matches.every((c) => c === next)) this._commit();
        return true;
      }

      // 「n」のように、今のバッファで既に完結している場合は確定して次へ
      if (this.buffer && chunk.candidates.includes(this.buffer)) {
        this._commit();
        return this.input(key);
      }
      return false;
    }

    _commit() {
      this.typed += this.buffer;
      this.buffer = '';
      this.index += 1;
    }

    // 画面表示用: 打ち終えた部分と残りのガイド
    guide() {
      if (this.done) return { typed: this.typed, rest: '' };
      const chunk = this.chunks[this.index];
      const current =
        chunk.candidates.find((c) => c.startsWith(this.buffer)) || chunk.candidates[0];
      const rest =
        current.slice(this.buffer.length) +
        this.chunks.slice(this.index + 1).map((c) => c.candidates[0]).join('');
      return { typed: this.typed + this.buffer, rest };
    }
  }

  const api = { buildChunks, Typer, toHiragana };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Romaji = api;
})(typeof self !== 'undefined' ? self : this);
