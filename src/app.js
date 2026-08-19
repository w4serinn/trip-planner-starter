// SPAシェルのエントリーポイント。
// A・B・C(概要タブ)・D(企画メモ)・E(行き先決め)・F(日程調整)・G(宿泊)・H(しおり)・
// 雑多メモは実装済み(docs/ROADMAP.md「11」「12」「14」)。
import { registerRoute, startRouter } from './router.js';
import { icons } from './icons.js';
import { mount as mountJoin } from './views/join.js';
import { mount as mountTrips } from './views/trips.js';
import { mount as mountTripOverview } from './views/tripOverview.js';
import { mount as mountScratch } from './views/scratch.js';
import { mount as mountNotes } from './views/notes.js';
import { mount as mountDestinations } from './views/destinations.js';
import { mount as mountSchedule } from './views/schedule.js';
import { mount as mountLodging } from './views/lodging.js';
import { mount as mountItinerary } from './views/itinerary.js';

const tabbar = document.getElementById('tabbar');
const sidebar = document.getElementById('sidebar');
const backToTrips = document.getElementById('back-to-trips');

const TABS = [
  { key: 'overview', label: '概要', suffix: '', icon: icons.overview, mount: mountTripOverview },
  { key: 'scratch', label: '雑多メモ', suffix: '/scratch', icon: icons.scratch, mount: mountScratch },
  { key: 'notes', label: '企画メモ', suffix: '/notes', icon: icons.notes, mount: mountNotes },
  { key: 'destinations', label: '行き先決め', suffix: '/destinations', icon: icons.destinations, mount: mountDestinations },
  { key: 'schedule', label: '日程調整', suffix: '/schedule', icon: icons.schedule, mount: mountSchedule },
  { key: 'lodging', label: '宿泊', suffix: '/lodging', icon: icons.lodging, mount: mountLodging },
  { key: 'itinerary', label: 'しおり', suffix: '/itinerary', icon: icons.itinerary, mount: mountItinerary },
];

// 768px以上では左サイドバー(#sidebar)、未満では横タブバー(#tabbar)を使う
// (docs/ROADMAP.md「31. サイドバー(広い画面)・ハンバーガーメニュー(モバイル)への
// 刷新」参照)。どちらも同じTABS配列から同時に描画し、CSS側の@mediaで表示を切り替える。
function renderTabbar(tripId, activeKey) {
  tabbar.innerHTML = '';
  tabbar.hidden = false;
  sidebar.innerHTML = '';
  sidebar.hidden = false;
  backToTrips.hidden = false;
  for (const tab of TABS) {
    const link = document.createElement('a');
    link.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
    link.href = `#/trips/${tripId}${tab.suffix}`;
    link.className = tab.key === activeKey ? 'tab tab-active' : 'tab';
    tabbar.appendChild(link);

    const sidebarLink = document.createElement('a');
    sidebarLink.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
    sidebarLink.href = `#/trips/${tripId}${tab.suffix}`;
    sidebarLink.className = tab.key === activeKey ? 'sidebar-link sidebar-link-active' : 'sidebar-link';
    sidebar.appendChild(sidebarLink);
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
  sidebar.hidden = true;
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
