// G(宿泊)タブの確定宿泊タイムライン(ガントチャート風表示、docs/ROADMAP.md「57」)用の
// DOM非依存な純粋関数。全確定宿泊のうち最も早いチェックインと最も遅いチェックアウトを
// 全体の期間とし、各宿泊の期間を「左端位置%」「幅%」に変換する。
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MIN_WIDTH_PERCENT = 4;

function parseDateOnly(dateString) {
  return new Date(`${dateString}T00:00:00`).getTime();
}

// stays: { id, checkIn, checkOut }[]("YYYY-MM-DD"形式)。並び順はそのまま維持して返す。
export function buildStayTimelineBars(stays) {
  if (stays.length === 0) return [];

  const minDate = stays.reduce((min, s) => (s.checkIn < min ? s.checkIn : min), stays[0].checkIn);
  const maxDate = stays.reduce((max, s) => (s.checkOut > max ? s.checkOut : max), stays[0].checkOut);

  const minTime = parseDateOnly(minDate);
  const maxTime = parseDateOnly(maxDate);
  const totalDays = Math.max((maxTime - minTime) / MS_PER_DAY, 1);

  return stays.map((stay) => {
    const checkInTime = parseDateOnly(stay.checkIn);
    const checkOutTime = parseDateOnly(stay.checkOut);
    const offsetDays = (checkInTime - minTime) / MS_PER_DAY;
    const durationDays = Math.max((checkOutTime - checkInTime) / MS_PER_DAY, 0);

    const widthPercent = Math.min(Math.max((durationDays / totalDays) * 100, MIN_WIDTH_PERCENT), 100);
    const rawLeftPercent = (offsetDays / totalDays) * 100;
    const leftPercent = Math.min(Math.max(rawLeftPercent, 0), 100 - widthPercent);

    return {
      id: stay.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      leftPercent,
      widthPercent,
    };
  });
}
