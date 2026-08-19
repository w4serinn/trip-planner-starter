import { describe, it, expect } from 'vitest';
import { toDateString, parseDateString, buildMonthGrid, addMonths } from './datePicker.js';

describe('toDateString / parseDateString', () => {
  it('月・日を2桁ゼロ埋めした"YYYY-MM-DD"を返す', () => {
    expect(toDateString(2026, 0, 5)).toBe('2026-01-05');
    expect(toDateString(2026, 11, 31)).toBe('2026-12-31');
  });

  it('"YYYY-MM-DD"を0始まりmonthのオブジェクトに戻す(toDateStringと相互変換できる)', () => {
    expect(parseDateString('2026-01-05')).toEqual({ year: 2026, month: 0, day: 5 });
    expect(parseDateString('2026-12-31')).toEqual({ year: 2026, month: 11, day: 31 });
  });
});

describe('buildMonthGrid', () => {
  it('日数分の要素数(7の倍数)を返し、月初のオフセットをnullで埋める', () => {
    // 2026年2月は日曜始まり(2026-02-01は日曜)なのでオフセット無し、28日
    const feb = buildMonthGrid(2026, 1);
    expect(feb.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(feb.filter((d) => d !== null)).toHaveLength(28);
    expect(feb.length % 7).toBe(0);
  });

  it('月初が週の途中の場合、その分だけ先頭がnullになる', () => {
    // 2026年3月1日は日曜日の翌日=日曜日?実際の曜日をnew Dateから動的に検証する
    const year = 2026;
    const month = 2; // 3月(0始まり)
    const firstWeekday = new Date(year, month, 1).getDay();
    const grid = buildMonthGrid(year, month);
    expect(grid.slice(0, firstWeekday).every((cell) => cell === null)).toBe(true);
    expect(grid[firstWeekday]).toBe(1);
  });
});

describe('addMonths', () => {
  it('年をまたがず月だけ進む', () => {
    expect(addMonths(2026, 0, 1)).toEqual({ year: 2026, month: 1 });
  });

  it('12月から翌年1月へ繰り上がる', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  });

  it('1月から前年12月へ繰り下がる', () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});
