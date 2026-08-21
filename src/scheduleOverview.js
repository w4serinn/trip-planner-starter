// F(日程調整)タブの俯瞰ビュー(月めくりカレンダー上に候補日を○×△で色分け表示、
// docs/ROADMAP.md「52」)用のDOM非依存な純粋関数。
// 判定ルール(「調整さん」等の既存日程調整サービスの表記に準拠):
//  ng(×表示)  : 回答に一つでも「×」が含まれる(誰か1人でも参加できない)
//  ok(○表示)  : 全メンバーが回答済みで、すべて「○」(全員参加できる)
//  pending(△表示): 上記のいずれでもないが1件以上回答がある(一部○・△混在、未回答者あり等)
//  none        : 候補日だが誰も回答していない
import { buildMonthGrid, toDateString } from './datePicker.js';

export function computeDayStatus(responses, memberCount) {
  const values = Object.values(responses || {});
  if (values.length === 0) return 'none';
  if (values.includes('×')) return 'ng';
  if (memberCount > 0 && values.length >= memberCount && values.every((v) => v === '○')) return 'ok';
  return 'pending';
}

// entriesByDate: Map<"YYYY-MM-DD", { responses }>。候補日ではない日はnullを返す。
export function buildOverviewCells(year, month, entriesByDate, memberCount) {
  return buildMonthGrid(year, month).map((day) => {
    if (day === null) return null;
    const dateStr = toDateString(year, month, day);
    const entry = entriesByDate.get(dateStr);
    if (!entry) return { day, dateStr, status: null };
    return { day, dateStr, status: computeDayStatus(entry.responses, memberCount) };
  });
}
