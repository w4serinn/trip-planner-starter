// 「午前/午後」+「時(0〜12)」+「分」の3セレクトボックスによる時間目安入力の共通ロジック。
// src/views/itinerary.js・src/views/scratch.js(雑多メモ「→しおりへ」の簡易フォーム)で
// 共用する(docs/ROADMAP.md「38」)。保存形式は24時間表記の"HH:MM"文字列(docs/ROADMAP.md「15」)。
export const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i)); // 0〜12
export const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// 「午前/午後」+「0〜12時」+「分」から24時間表記の"HH:MM"文字列を組み立てる。
// 0時・12時はそれぞれのAM/PM内で同じ境界時刻を指すエイリアスとして扱う
// (午前0時=午前12時=00:00、午後0時=午後12時=12:00)。
export function buildTimeString(amPm, hour, minute) {
  const hourNum = Number(hour);
  const hour24 = (hourNum % 12) + (amPm === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

// "HH:MM"文字列を、3セレクトボックスにそれぞれ設定する値へ分解する(編集フォームの
// 初期値設定用)。空文字列の場合は3つとも空文字列を返す。
export function parseTimeString(time) {
  if (!time) return { amPm: '', hour: '', minute: '' };
  const [hourStr, minute] = time.split(':');
  const hour24 = Number(hourStr);
  const amPm = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12;
  return { amPm, hour: String(hour12), minute };
}
