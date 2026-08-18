import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// GitHub Pages(publicリポジトリ)へのデプロイを見据えたサブパス。
// docs/firestore-design.md「ホスティング方針」参照。
const base = '/trip-planner-starter/';

// A〜Hの8画面をすべてマルチページ構成で登録する。
const input = {
  index: fileURLToPath(new URL('./pages/index.html', import.meta.url)), // A. 参加画面
  trips: fileURLToPath(new URL('./pages/trips.html', import.meta.url)), // B. 旅行一覧画面
  trip: fileURLToPath(new URL('./pages/trip.html', import.meta.url)), // C. 旅行詳細トップ画面
  notes: fileURLToPath(new URL('./pages/notes.html', import.meta.url)), // D. 企画メモ画面
  destinations: fileURLToPath(new URL('./pages/destinations.html', import.meta.url)), // E. 行き先決め画面
  schedule: fileURLToPath(new URL('./pages/schedule.html', import.meta.url)), // F. 日程調整画面
  lodging: fileURLToPath(new URL('./pages/lodging.html', import.meta.url)), // G. 宿泊画面
  itinerary: fileURLToPath(new URL('./pages/itinerary.html', import.meta.url)), // H. しおり画面
};

export default defineConfig({
  base,
  build: {
    rollupOptions: { input },
  },
});
