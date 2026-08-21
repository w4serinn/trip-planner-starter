import { describe, it, expect } from 'vitest';
import { computeDayStatus, buildOverviewCells } from './scheduleOverview.js';

describe('computeDayStatus', () => {
  it('回答が1件も無ければnoneを返す', () => {
    expect(computeDayStatus({}, 3)).toBe('none');
    expect(computeDayStatus(undefined, 3)).toBe('none');
  });

  it('×が1件でもあればng(他の回答内容によらず優先)', () => {
    expect(computeDayStatus({ a: '×' }, 3)).toBe('ng');
    expect(computeDayStatus({ a: '○', b: '○', c: '×' }, 3)).toBe('ng');
  });

  it('全メンバーが回答済みですべて○ならokを返す', () => {
    expect(computeDayStatus({ a: '○', b: '○' }, 2)).toBe('ok');
  });

  it('全員回答済みでも○以外(△含む)が混ざっていればpendingを返す', () => {
    expect(computeDayStatus({ a: '○', b: '△' }, 2)).toBe('pending');
  });

  it('未回答者が残っている場合はokにはならずpendingを返す', () => {
    expect(computeDayStatus({ a: '○' }, 2)).toBe('pending');
  });

  it('memberCountが0(メンバー数取得失敗時)はokにならずpending扱いにする', () => {
    expect(computeDayStatus({ a: '○' }, 0)).toBe('pending');
  });
});

describe('buildOverviewCells', () => {
  it('候補日ではない日はstatus: nullのオブジェクトを返す(月初のオフセット分は要素自体がnull)', () => {
    const entriesByDate = new Map();
    const cells = buildOverviewCells(2026, 1, entriesByDate, 2); // 2026年2月(日曜始まり、オフセット無し)
    expect(cells).toHaveLength(28);
    expect(cells.every((cell) => cell !== null && cell.status === null)).toBe(true);
  });

  it('月初が週の途中の場合、オフセット分の要素はnullになる', () => {
    const entriesByDate = new Map();
    const year = 2026;
    const month = 2; // 3月(0始まり)
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells = buildOverviewCells(year, month, entriesByDate, 2);
    expect(cells.slice(0, firstWeekday).every((cell) => cell === null)).toBe(true);
    expect(cells[firstWeekday]).toEqual({ day: 1, dateStr: `${year}-03-01`, status: null });
  });

  it('候補日には日付・ステータスを含むオブジェクトを返す', () => {
    const entriesByDate = new Map([
      ['2026-02-03', { responses: { a: '○', b: '○' } }],
      ['2026-02-10', { responses: { a: '×' } }],
    ]);
    const cells = buildOverviewCells(2026, 1, entriesByDate, 2);
    const day3 = cells.find((cell) => cell?.dateStr === '2026-02-03');
    const day10 = cells.find((cell) => cell?.dateStr === '2026-02-10');
    expect(day3).toEqual({ day: 3, dateStr: '2026-02-03', status: 'ok' });
    expect(day10).toEqual({ day: 10, dateStr: '2026-02-10', status: 'ng' });
  });
});
