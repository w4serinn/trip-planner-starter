import { describe, it, expect } from 'vitest';
import { generatePassphrase } from './passphrase.js';

const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generatePassphrase', () => {
  it('デフォルトでは8文字を生成する', () => {
    expect(generatePassphrase()).toHaveLength(8);
  });

  it('6〜8の範囲で指定した文字数を生成する', () => {
    expect(generatePassphrase(6)).toHaveLength(6);
    expect(generatePassphrase(7)).toHaveLength(7);
    expect(generatePassphrase(8)).toHaveLength(8);
  });

  it('紛らわしい文字(0/O, 1/I/L等)を含まない文字種のみを使う', () => {
    const result = generatePassphrase();
    for (const char of result) {
      expect(CHARSET).toContain(char);
    }
  });

  it('範囲外の長さを指定するとRangeErrorになる', () => {
    expect(() => generatePassphrase(5)).toThrow(RangeError);
    expect(() => generatePassphrase(9)).toThrow(RangeError);
  });

  it('整数以外を指定するとRangeErrorになる', () => {
    expect(() => generatePassphrase(6.5)).toThrow(RangeError);
  });
});
