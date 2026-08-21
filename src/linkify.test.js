import { describe, it, expect } from 'vitest';
import { tokenizeLinks } from './linkify.js';

describe('tokenizeLinks', () => {
  it('URLを含まないテキストは単一のtextトークンになる', () => {
    expect(tokenizeLinks('ただのメモです')).toEqual([{ type: 'text', value: 'ただのメモです' }]);
  });

  it('文中のURLをtext/url/textの3トークンに分割する', () => {
    const result = tokenizeLinks('見て https://example.com すごい');
    expect(result).toEqual([
      { type: 'text', value: '見て ' },
      { type: 'url', value: 'https://example.com', safe: true },
      { type: 'text', value: ' すごい' },
    ]);
  });

  it('文頭・文末のURLも正しく分割する', () => {
    expect(tokenizeLinks('https://example.com')).toEqual([{ type: 'url', value: 'https://example.com', safe: true }]);
    expect(tokenizeLinks('見て https://example.com')).toEqual([
      { type: 'text', value: '見て ' },
      { type: 'url', value: 'https://example.com', safe: true },
    ]);
  });

  it('複数のURLをそれぞれ検出する', () => {
    const result = tokenizeLinks('https://a.example https://b.example');
    expect(result).toEqual([
      { type: 'url', value: 'https://a.example', safe: true },
      { type: 'text', value: ' ' },
      { type: 'url', value: 'https://b.example', safe: true },
    ]);
  });

  it('URL直後の句読点・閉じ括弧はリンクに含めない', () => {
    expect(tokenizeLinks('見て。https://example.com。')).toEqual([
      { type: 'text', value: '見て。' },
      { type: 'url', value: 'https://example.com', safe: true },
      { type: 'text', value: '。' },
    ]);
    expect(tokenizeLinks('(https://example.com)')).toEqual([
      { type: 'text', value: '(' },
      { type: 'url', value: 'https://example.com', safe: true },
      { type: 'text', value: ')' },
    ]);
  });

  it('URLとして不正な文字列(new URLが失敗するもの)はsafe:falseになる', () => {
    const result = tokenizeLinks('https://[invalid');
    expect(result).toEqual([{ type: 'url', value: 'https://[invalid', safe: false }]);
  });

  it('http/https以外のスキームはそもそもURLとして検出しない(プレーンテキストのまま)', () => {
    // 正規表現がhttp(s)://始まりしか拾わないため、javascript:等は最初からマッチしない。
    expect(tokenizeLinks('javascript:alert(1)')).toEqual([{ type: 'text', value: 'javascript:alert(1)' }]);
  });
});
