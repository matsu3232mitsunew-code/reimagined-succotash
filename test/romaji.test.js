const test = require('node:test');
const assert = require('node:assert');
const { Typer } = require('../romaji.js');

// 文字列をすべて入力し、全部受理されて単語が完了するかを返す
function typeAll(kana, romaji) {
  const t = new Typer(kana);
  for (const ch of romaji) {
    if (!t.input(ch)) return false;
  }
  return t.done;
}

test('基本的なかな', () => {
  assert.ok(typeAll('さくら', 'sakura'));
  assert.ok(typeAll('サクラ', 'sakura'));
});

test('複数の打ち方を受け付ける', () => {
  assert.ok(typeAll('しつもん', 'shitsumonn'));
  assert.ok(typeAll('しつもん', 'situmonn'));
  assert.ok(typeAll('ふじさん', 'hujisann'));
});

test('拗音と分割入力', () => {
  assert.ok(typeAll('きょう', 'kyou'));
  assert.ok(typeAll('きょう', 'kixyou'));
  assert.ok(typeAll('しゃしん', 'syasinn'));
  assert.ok(typeAll('ちゃわん', 'chawann'));
});

test('ん: 子音の前は n 一打ちで可', () => {
  assert.ok(typeAll('かんじ', 'kanji'));
  assert.ok(typeAll('かんじ', 'kannji'));
  assert.ok(typeAll('しんぶん', 'shinbunn'));
});

test('ん: 母音・な行・や行の前は nn が必要', () => {
  assert.ok(!typeAll('きんえん', 'kinenn'));
  assert.ok(typeAll('きんえん', 'kinnenn'));
  assert.ok(typeAll('こんにちは', 'konnnichiha'));
  assert.ok(!typeAll('こんにちは', 'konnichiha'));
});

test('ん: 語末は nn が必要', () => {
  assert.ok(!typeAll('ほん', 'hon'));
  assert.ok(typeAll('ほん', 'honn'));
});

test('っ: 子音の重ね打ちと単独入力', () => {
  assert.ok(typeAll('きって', 'kitte'));
  assert.ok(typeAll('きって', 'kixtute'));
  assert.ok(typeAll('まっちゃ', 'maccha'));
  assert.ok(typeAll('まっちゃ', 'mattya'));
});

test('ミス入力は拒否され、状態は変わらない', () => {
  const t = new Typer('ねこ');
  assert.ok(t.input('n'));
  assert.ok(!t.input('x'));
  assert.ok(t.input('e'));
  assert.deepStrictEqual(t.guide(), { typed: 'ne', rest: 'ko' });
});

test('ガイドは打ち方に追従する', () => {
  const t = new Typer('しお');
  t.input('s');
  t.input('i');
  assert.deepStrictEqual(t.guide(), { typed: 'si', rest: 'o' });
});

test('お題の単語はすべてガイド通りに打てる', () => {
  const WORDS = require('../words.js');
  for (const [, kana] of WORDS) {
    const t = new Typer(kana);
    const guide = t.guide().rest;
    assert.ok(typeAll(kana, guide), `${kana} (${guide})`);
  }
});
