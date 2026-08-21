// SPAシェルのエントリーポイント。
// A・B・C(概要タブ)・D(企画メモ)・E(行き先決め)・F(日程調整)・G(宿泊)・H(しおり)・
// 雑多メモは実装済み(docs/ROADMAP.md「11」「12」「14」)。
import { registerRoute, startRouter } from './router.js';
import { icons } from './icons.js';
import { loadSession } from './session.js';
import { subscribeToDocument } from './firestore.js';
import { mount as mountJoin } from './views/join.js';
import { mount as mountTrips } from './views/trips.js';
import { mount as mountTripOverview } from './views/tripOverview.js';
import { mount as mountScratch } from './views/scratch.js';
import { mount as mountNotes } from './views/notes.js';
import { mount as mountDestinations } from './views/destinations.js';
import { mount as mountSchedule } from './views/schedule.js';
import { mount as mountLodging } from './views/lodging.js';
import { mount as mountItinerary } from './views/itinerary.js';

const sidebar = document.getElementById('sidebar');
const sidebarLinks = document.getElementById('sidebar-links');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const menuToggle = document.getElementById('menu-toggle');
const pageTitle = document.getElementById('page-title');

const TABS = [
  { key: 'overview', label: '概要', suffix: '', icon: icons.overview, mount: mountTripOverview },
  { key: 'scratch', label: '雑多メモ', suffix: '/scratch', icon: icons.scratch, mount: mountScratch },
  { key: 'notes', label: '企画メモ', suffix: '/notes', icon: icons.notes, mount: mountNotes },
  { key: 'destinations', label: '行き先決め', suffix: '/destinations', icon: icons.destinations, mount: mountDestinations },
  { key: 'schedule', label: '日程調整', suffix: '/schedule', icon: icons.schedule, mount: mountSchedule },
  { key: 'lodging', label: '宿泊', suffix: '/lodging', icon: icons.lodging, mount: mountLodging },
  { key: 'itinerary', label: 'しおり', suffix: '/itinerary', icon: icons.itinerary, mount: mountItinerary },
];

// 768px以上では常設の左サイドバー、未満ではハンバーガーボタンで開閉するドロワーとして
// #sidebarを共用する(docs/ROADMAP.md「31. サイドバー(広い画面)・ハンバーガーメニュー
// (モバイル)への刷新」参照)。開閉状態はCSSの.sidebar-openクラス+@mediaで制御する。
let isMenuOpen = false;

function closeMenu() {
  isMenuOpen = false;
  sidebar.classList.remove('sidebar-open');
  sidebarBackdrop.classList.remove('sidebar-backdrop-visible');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.innerHTML = icons.menu;
}

function openMenu() {
  isMenuOpen = true;
  sidebar.classList.add('sidebar-open');
  sidebarBackdrop.classList.add('sidebar-backdrop-visible');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.innerHTML = icons.close;
  // ドロワー内の最初のリンクへフォーカスを移す(キーボード操作時、開いた直後に
  // 背景コンテンツへ迷い込まないように)。
  sidebar.querySelector('a')?.focus();
}

menuToggle.addEventListener('click', () => {
  if (isMenuOpen) closeMenu();
  else openMenu();
});
sidebarBackdrop.addEventListener('click', closeMenu);
document.addEventListener('keydown', (event) => {
  if (!isMenuOpen) return;
  if (event.key === 'Escape') {
    closeMenu();
    return;
  }
  // モバイルのドロワー表示中は、Tab移動が背景コンテンツへ抜けないよう
  // ドロワー内(ハンバーガーボタン⇔各リンク)でフォーカスを循環させる
  // (768px以上の常設サイドバー表示時は.sidebar-openが付かないため対象外)。
  if (event.key !== 'Tab' || !sidebar.classList.contains('sidebar-open')) return;
  const focusables = [menuToggle, ...sidebar.querySelectorAll('a')];
  const currentIndex = focusables.indexOf(document.activeElement);
  if (currentIndex === -1) return;
  event.preventDefault();
  const step = event.shiftKey ? -1 : 1;
  const nextIndex = (currentIndex + step + focusables.length) % focusables.length;
  focusables[nextIndex].focus();
});

function renderNav(tripId, activeKey) {
  sidebarLinks.innerHTML = '';
  sidebar.hidden = false;
  menuToggle.hidden = false;
  closeMenu();
  for (const tab of TABS) {
    const sidebarLink = document.createElement('a');
    sidebarLink.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
    sidebarLink.href = `#/trips/${tripId}${tab.suffix}`;
    sidebarLink.className = tab.key === activeKey ? 'sidebar-link sidebar-link-active' : 'sidebar-link';
    sidebarLinks.appendChild(sidebarLink);
  }
}

// 2026-08-21(docs/ROADMAP.md「79」): 旅行に紐づく画面(C〜H各タブ)にいる間、
// .page-headerの<h1>にその旅行の名前を表示する(それまでは常に固定の
// 「旅行計画アプリ」という汎用アプリ名だったが、旅行の文脈が伝わらないとの
// 指摘を受けた)。各タブビュー(例: src/views/tripOverview.js)がそれぞれ
// trips/{tripId}を購読しているのとは別に、ヘッダー専用の購読をここで1つだけ
// 持つ(タブを跨いでも張り直せるよう、直前の購読は都度停止する)。
const DEFAULT_PAGE_TITLE = '旅行計画アプリ';
let unsubscribeTripName = null;

function stopTripNameSubscription() {
  if (unsubscribeTripName) {
    unsubscribeTripName();
    unsubscribeTripName = null;
  }
}

function subscribeTripName(tripId) {
  stopTripNameSubscription();
  const session = loadSession();
  if (!session) return; // 未参加の場合、リダイレクトは各タブのmount()側の責務
  pageTitle.textContent = DEFAULT_PAGE_TITLE;
  unsubscribeTripName = subscribeToDocument(
    `groups/${session.groupCode}/trips/${tripId}`,
    (trip) => {
      pageTitle.textContent = trip?.name || DEFAULT_PAGE_TITLE;
    },
    (error) => {
      console.error(error);
      pageTitle.textContent = DEFAULT_PAGE_TITLE;
    },
  );
}

function registerTripTab(tab) {
  registerRoute(`#/trips/:tripId${tab.suffix}`, (outlet, params) => {
    renderNav(params.tripId, tab.key);
    subscribeTripName(params.tripId);
    if (tab.mount) {
      return tab.mount(outlet, params);
    }
    outlet.innerHTML = `<p class="subtitle">${tab.label}(準備中。tripId=${params.tripId})</p>`;
    return undefined;
  });
}

function hideNav() {
  sidebar.hidden = true;
  menuToggle.hidden = true;
  closeMenu();
  stopTripNameSubscription();
  pageTitle.textContent = DEFAULT_PAGE_TITLE;
}

registerRoute('#/', (outlet) => {
  hideNav();
  return mountJoin(outlet);
});

registerRoute('#/trips', (outlet) => {
  hideNav();
  return mountTrips(outlet);
});

for (const tab of TABS) {
  registerTripTab(tab);
}

startRouter();
