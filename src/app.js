// SPAシェルのエントリーポイント。
// この段階(docs/ROADMAP.md「10. 基盤(SPA化)」)ではルーター・タブバーの骨組みのみを
// 実装し、各ビューの実際のロジック(A・B画面は「11」、C〜Hタブは「12」)は
// 別タスクで実装する。
import { registerRoute, startRouter } from './router.js';

const tabbar = document.getElementById('tabbar');

const TABS = [
  { key: 'overview', label: '概要', suffix: '' },
  { key: 'scratch', label: '雑多メモ', suffix: '/scratch' },
  { key: 'notes', label: '企画メモ', suffix: '/notes' },
  { key: 'destinations', label: '行き先決め', suffix: '/destinations' },
  { key: 'schedule', label: '日程調整', suffix: '/schedule' },
  { key: 'lodging', label: '宿泊', suffix: '/lodging' },
  { key: 'itinerary', label: 'しおり', suffix: '/itinerary' },
];

function renderTabbar(tripId, activeKey) {
  tabbar.innerHTML = '';
  tabbar.hidden = false;
  for (const tab of TABS) {
    const link = document.createElement('a');
    link.textContent = tab.label;
    link.href = `#/trips/${tripId}${tab.suffix}`;
    link.className = tab.key === activeKey ? 'tab tab-active' : 'tab';
    tabbar.appendChild(link);
  }
}

function registerTripTab(key, label, suffix) {
  registerRoute(`#/trips/:tripId${suffix}`, (outlet, params) => {
    renderTabbar(params.tripId, key);
    outlet.innerHTML = `<p class="subtitle">${label}(準備中。tripId=${params.tripId})</p>`;
  });
}

registerRoute('#/', (outlet) => {
  tabbar.hidden = true;
  outlet.innerHTML = '<p class="subtitle">A. 参加画面(準備中)</p>';
});

registerRoute('#/trips', (outlet) => {
  tabbar.hidden = true;
  outlet.innerHTML = '<p class="subtitle">B. 旅行一覧画面(準備中)</p>';
});

for (const tab of TABS) {
  registerTripTab(tab.key, tab.label, tab.suffix);
}

startRouter();
