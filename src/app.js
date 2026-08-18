// SPAシェルのエントリーポイント。
// A・B・C(概要タブ)・D(企画メモ)・E(行き先決め)・F(日程調整)・G(宿泊)・H(しおり)は
// 実装済み(docs/ROADMAP.md「11」「12」)。雑多メモタブ(scratch)は「14」で新規実装予定
// のため、それまでは骨組み(準備中表示)のまま。
import { registerRoute, startRouter } from './router.js';
import { mount as mountJoin } from './views/join.js';
import { mount as mountTrips } from './views/trips.js';
import { mount as mountTripOverview } from './views/tripOverview.js';
import { mount as mountNotes } from './views/notes.js';
import { mount as mountDestinations } from './views/destinations.js';
import { mount as mountSchedule } from './views/schedule.js';
import { mount as mountLodging } from './views/lodging.js';
import { mount as mountItinerary } from './views/itinerary.js';

const tabbar = document.getElementById('tabbar');
const backToTrips = document.getElementById('back-to-trips');

const TABS = [
  { key: 'overview', label: '概要', suffix: '', mount: mountTripOverview },
  { key: 'scratch', label: '雑多メモ', suffix: '/scratch' },
  { key: 'notes', label: '企画メモ', suffix: '/notes', mount: mountNotes },
  { key: 'destinations', label: '行き先決め', suffix: '/destinations', mount: mountDestinations },
  { key: 'schedule', label: '日程調整', suffix: '/schedule', mount: mountSchedule },
  { key: 'lodging', label: '宿泊', suffix: '/lodging', mount: mountLodging },
  { key: 'itinerary', label: 'しおり', suffix: '/itinerary', mount: mountItinerary },
];

function renderTabbar(tripId, activeKey) {
  tabbar.innerHTML = '';
  tabbar.hidden = false;
  backToTrips.hidden = false;
  for (const tab of TABS) {
    const link = document.createElement('a');
    link.textContent = tab.label;
    link.href = `#/trips/${tripId}${tab.suffix}`;
    link.className = tab.key === activeKey ? 'tab tab-active' : 'tab';
    tabbar.appendChild(link);
  }
}

function registerTripTab(tab) {
  registerRoute(`#/trips/:tripId${tab.suffix}`, (outlet, params) => {
    renderTabbar(params.tripId, tab.key);
    if (tab.mount) {
      return tab.mount(outlet, params);
    }
    outlet.innerHTML = `<p class="subtitle">${tab.label}(準備中。tripId=${params.tripId})</p>`;
    return undefined;
  });
}

function hideTabbar() {
  tabbar.hidden = true;
  backToTrips.hidden = true;
}

registerRoute('#/', (outlet) => {
  hideTabbar();
  return mountJoin(outlet);
});

registerRoute('#/trips', (outlet) => {
  hideTabbar();
  return mountTrips(outlet);
});

for (const tab of TABS) {
  registerTripTab(tab);
}

startRouter();
