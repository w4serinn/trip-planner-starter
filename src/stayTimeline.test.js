import { describe, expect, it } from 'vitest';
import { buildStayTimelineBars } from './stayTimeline.js';

describe('buildStayTimelineBars', () => {
  it('空配列には空配列を返す', () => {
    expect(buildStayTimelineBars([])).toEqual([]);
  });

  it('連続する2件の宿泊を、全体期間に対する位置・幅の割合に変換する', () => {
    const bars = buildStayTimelineBars([
      { id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-03' },
      { id: 'b', checkIn: '2026-09-03', checkOut: '2026-09-05' },
    ]);
    expect(bars[0]).toMatchObject({ id: 'a', leftPercent: 0, widthPercent: 50 });
    expect(bars[1]).toMatchObject({ id: 'b', leftPercent: 50, widthPercent: 50 });
  });

  it('1件のみの場合は全体を覆う1本のバーになる', () => {
    const bars = buildStayTimelineBars([{ id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-05' }]);
    expect(bars).toEqual([{ id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-05', leftPercent: 0, widthPercent: 100 }]);
  });

  it('チェックイン=チェックアウト(同日)の宿泊は最小幅で表示される', () => {
    const bars = buildStayTimelineBars([
      { id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-01' },
      { id: 'b', checkIn: '2026-09-01', checkOut: '2026-09-10' },
    ]);
    expect(bars[0].widthPercent).toBe(4);
    expect(bars[0].leftPercent).toBe(0);
  });

  it('末尾の宿泊でも leftPercent + widthPercent が100を超えない', () => {
    const bars = buildStayTimelineBars([
      { id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-10' },
      { id: 'b', checkIn: '2026-09-10', checkOut: '2026-09-10' },
    ]);
    const last = bars[1];
    expect(last.leftPercent + last.widthPercent).toBeLessThanOrEqual(100);
    expect(last.widthPercent).toBe(4);
    expect(last.leftPercent).toBe(96);
  });

  it('日程が飛び飛び(間に空白期間)の宿泊も正しく位置づけられる', () => {
    const bars = buildStayTimelineBars([
      { id: 'a', checkIn: '2026-09-01', checkOut: '2026-09-02' },
      { id: 'b', checkIn: '2026-09-09', checkOut: '2026-09-10' },
    ]);
    expect(bars[0].leftPercent).toBe(0);
    expect(bars[1].leftPercent).toBeGreaterThan(80);
  });

  it('入力の順序をそのまま維持する(並び替えはしない)', () => {
    const bars = buildStayTimelineBars([
      { id: 'later', checkIn: '2026-09-05', checkOut: '2026-09-07' },
      { id: 'earlier', checkIn: '2026-09-01', checkOut: '2026-09-03' },
    ]);
    expect(bars.map((b) => b.id)).toEqual(['later', 'earlier']);
  });
});
