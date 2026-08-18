// SPAシェルのエントリーポイント。
// A・B画面は実装済み(docs/ROADMAP.md「11. A・B画面のSPA移行」)。
// C〜Hタブの実際のロジックは「12」で実装し、それまでは骨組み(準備中表示)のまま。
import { registerRoute, startRouter } from './router.js';
import { mount as mountJoin } from './views/join.js';
import { mount as mountTrips } from './views/trips.js';

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
  return mountJoin(outlet);
});

registerRoute('#/trips', (outlet) => {
  tabbar.hidden = true;
  return mountTrips(outlet);
});

for (const tab of TABS) {
  registerTripTab(tab.key, tab.label, tab.suffix);
}

startRouter();
