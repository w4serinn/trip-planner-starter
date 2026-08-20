// C. 旅行詳細(概要タブ)ビュー(SPA)
// 旅行名の表示・編集、集合情報・割り勘リンクの直接編集、D〜H各機能の件数サマリー
// (docs/ROADMAP.md「40」)を行う。
// 集合情報・割り勘リンクも、旅行名と同じ「表示モード+編集ボタンで編集フォームを開く」
// パターンに揃え(docs/ROADMAP.md「18」)、画面を開いた時点でフォームが並ぶ煩雑さを避ける。
// 集合情報には地図リンク(meetingLocationUrl)も持たせる(docs/ROADMAP.md「62」)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { getDocument, updateDocument, listCollection } from '../firestore.js';
import { icons } from '../icons.js';
import { isSafeUrl } from '../url.js';

// D〜H各機能タブの件数サマリー(docs/ROADMAP.md「40」)に表示する項目定義。
// keyはsrc/app.jsのTABS定義におけるルートsuffix(先頭の"/"を除いたもの)と一致させる。
const SUMMARY_TABS = [
  { key: 'destinations', icon: icons.destinations, label: '行き先決め' },
  { key: 'schedule', icon: icons.schedule, label: '日程調整' },
  { key: 'lodging', icon: icons.lodging, label: '宿泊' },
  { key: 'itinerary', icon: icons.itinerary, label: 'しおり' },
];

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const tripPath = `groups/${session.groupCode}/trips/${tripId}`;

  outlet.innerHTML = `
    <div class="trip-name-row card card-dark">
      <h2 id="trip-name"></h2>
      <button type="button" id="edit-name-button" class="btn-secondary">編集</button>
    </div>
    <form id="edit-name-form" novalidate hidden>
      <div class="field">
        <label for="trip-name-input">旅行名</label>
        <input type="text" id="trip-name-input" name="tripName" required />
      </div>
      <p class="error-text" id="name-error-text"></p>
      <div class="button-row">
        <button type="submit">保存</button>
        <button type="button" id="cancel-edit-button" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="tab-summary" class="card-grid"></div>

    <div class="card-grid">
      <section class="card">
        <div class="card-section-header">
          <h3>${icons.destinations}<span>集合情報</span></h3>
          <button type="button" id="edit-meeting-button" class="btn-secondary">編集</button>
        </div>
        <div id="meeting-display">
          <p class="subtitle" id="meeting-empty">まだ設定されていません。</p>
          <dl class="summary-list" id="meeting-summary" hidden>
            <dt>場所</dt><dd id="meeting-place-display"></dd>
            <dt>時間</dt><dd id="meeting-time-display"></dd>
            <dt>地図</dt><dd id="meeting-location-display"></dd>
            <dt>メモ</dt><dd id="meeting-note-display"></dd>
          </dl>
        </div>
        <form id="meeting-form" novalidate hidden>
          <div class="field">
            <label for="meeting-place">場所</label>
            <input type="text" id="meeting-place" name="meetingPlace" />
          </div>
          <div class="field">
            <label for="meeting-time">時間</label>
            <input type="text" id="meeting-time" name="meetingTime" />
          </div>
          <div class="field">
            <label for="meeting-location-url">地図リンク(任意)</label>
            <input type="url" id="meeting-location-url" name="meetingLocationUrl" placeholder="https://maps.app.goo.gl/..." />
          </div>
          <div class="field">
            <label for="meeting-note">メモ</label>
            <input type="text" id="meeting-note" name="meetingNote" />
          </div>
          <p class="error-text" id="meeting-error-text"></p>
          <div class="button-row">
            <button type="submit">保存</button>
            <button type="button" id="cancel-meeting-button" class="btn-secondary">キャンセル</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card-section-header">
          <h3>${icons.link}<span>割り勘リンク(Walica)</span></h3>
          <button type="button" id="edit-warika-button" class="btn-secondary">編集</button>
        </div>
        <div id="warika-display">
          <p class="subtitle" id="warika-empty">まだ設定されていません。</p>
          <a id="warika-link-display" class="candidate-link" target="_blank" rel="noopener noreferrer" hidden></a>
        </div>
        <form id="warika-form" novalidate hidden>
          <div class="field">
            <label for="warika-url">URL</label>
            <input type="url" id="warika-url" name="warikaUrl" placeholder="https://walica.jp/..." />
          </div>
          <p class="error-text" id="warika-error-text"></p>
          <div class="button-row">
            <button type="submit">保存</button>
            <button type="button" id="cancel-warika-button" class="btn-secondary">キャンセル</button>
          </div>
        </form>
      </section>
    </div>
  `;

  const tripNameHeading = outlet.querySelector('#trip-name');
  const tabSummary = outlet.querySelector('#tab-summary');
  const editNameButton = outlet.querySelector('#edit-name-button');
  const editNameForm = outlet.querySelector('#edit-name-form');
  const tripNameInput = outlet.querySelector('#trip-name-input');
  const nameErrorText = outlet.querySelector('#name-error-text');
  const cancelEditButton = outlet.querySelector('#cancel-edit-button');

  const editMeetingButton = outlet.querySelector('#edit-meeting-button');
  const meetingDisplay = outlet.querySelector('#meeting-display');
  const meetingEmpty = outlet.querySelector('#meeting-empty');
  const meetingSummary = outlet.querySelector('#meeting-summary');
  const meetingPlaceDisplay = outlet.querySelector('#meeting-place-display');
  const meetingTimeDisplay = outlet.querySelector('#meeting-time-display');
  const meetingLocationDisplay = outlet.querySelector('#meeting-location-display');
  const meetingNoteDisplay = outlet.querySelector('#meeting-note-display');
  const meetingForm = outlet.querySelector('#meeting-form');
  const meetingPlaceInput = outlet.querySelector('#meeting-place');
  const meetingTimeInput = outlet.querySelector('#meeting-time');
  const meetingLocationUrlInput = outlet.querySelector('#meeting-location-url');
  const meetingNoteInput = outlet.querySelector('#meeting-note');
  const meetingErrorText = outlet.querySelector('#meeting-error-text');
  const cancelMeetingButton = outlet.querySelector('#cancel-meeting-button');

  const editWarikaButton = outlet.querySelector('#edit-warika-button');
  const warikaDisplay = outlet.querySelector('#warika-display');
  const warikaEmpty = outlet.querySelector('#warika-empty');
  const warikaLinkDisplay = outlet.querySelector('#warika-link-display');
  const warikaForm = outlet.querySelector('#warika-form');
  const warikaUrlInput = outlet.querySelector('#warika-url');
  const warikaErrorText = outlet.querySelector('#warika-error-text');
  const cancelWarikaButton = outlet.querySelector('#cancel-warika-button');

  let currentTrip = {};

  function renderMeetingDisplay() {
    const hasMeeting = currentTrip.meetingPlace || currentTrip.meetingTime
      || currentTrip.meetingLocationUrl || currentTrip.meetingNote;
    meetingEmpty.hidden = !!hasMeeting;
    meetingSummary.hidden = !hasMeeting;
    meetingPlaceDisplay.textContent = currentTrip.meetingPlace || '(未設定)';
    meetingTimeDisplay.textContent = currentTrip.meetingTime || '(未設定)';
    meetingNoteDisplay.textContent = currentTrip.meetingNote || '(未設定)';

    meetingLocationDisplay.innerHTML = '';
    if (currentTrip.meetingLocationUrl) {
      if (isSafeUrl(currentTrip.meetingLocationUrl)) {
        const link = document.createElement('a');
        link.className = 'candidate-link';
        link.href = currentTrip.meetingLocationUrl;
        link.textContent = currentTrip.meetingLocationUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        meetingLocationDisplay.appendChild(link);
      } else {
        meetingLocationDisplay.textContent = currentTrip.meetingLocationUrl;
      }
    } else {
      meetingLocationDisplay.textContent = '(未設定)';
    }
  }

  function renderWarikaDisplay() {
    const hasWarika = !!currentTrip.warikaUrl;
    warikaEmpty.hidden = hasWarika;
    warikaLinkDisplay.hidden = !hasWarika;
    if (hasWarika) {
      warikaLinkDisplay.href = currentTrip.warikaUrl;
      warikaLinkDisplay.textContent = currentTrip.warikaUrl;
    }
  }

  async function loadTrip() {
    try {
      const trip = await getDocument(tripPath);
      if (!trip) {
        navigate('#/trips');
        return;
      }
      currentTrip = trip;
      tripNameHeading.textContent = trip.name || '名称未設定の旅行';
      meetingPlaceInput.value = trip.meetingPlace || '';
      meetingTimeInput.value = trip.meetingTime || '';
      meetingLocationUrlInput.value = trip.meetingLocationUrl || '';
      meetingNoteInput.value = trip.meetingNote || '';
      warikaUrlInput.value = trip.warikaUrl || '';
      renderMeetingDisplay();
      renderWarikaDisplay();
    } catch (error) {
      console.error(error);
      tripNameHeading.textContent = '取得に失敗しました';
    }
  }

  // D〜H各機能の件数サマリー(docs/ROADMAP.md「40」)。タップで該当タブへ遷移する。
  // 概要タブ自体はリアルタイム購読の対象外(第8期で見送り済み)のため、他画面と同じく
  // 一度きりの取得(listCollection)で件数を出す。取得に失敗してもサマリーが
  // 空になるだけで、概要タブ自体の表示は妨げない。
  function renderTabSummary(counts) {
    tabSummary.innerHTML = '';
    for (const tab of SUMMARY_TABS) {
      const link = document.createElement('a');
      link.className = 'card card-link trip-card';
      link.href = `#/trips/${encodeURIComponent(tripId)}/${tab.key}`;

      const textWrap = document.createElement('div');
      const heading = document.createElement('h3');
      heading.className = 'icon-heading';
      heading.innerHTML = `${tab.icon}<span>${tab.label}</span>`;
      textWrap.appendChild(heading);

      const countText = document.createElement('p');
      countText.className = 'subtitle';
      countText.textContent = counts[tab.key];
      textWrap.appendChild(countText);

      link.appendChild(textWrap);
      link.insertAdjacentHTML('beforeend', `<span class="trip-card-chevron">${icons.chevron}</span>`);
      tabSummary.appendChild(link);
    }
  }

  async function loadTabSummary() {
    try {
      const [destinations, scheduleEntries, lodgingCandidates, confirmedStays, itineraryItems] = await Promise.all([
        listCollection(`${tripPath}/destinations`),
        listCollection(`${tripPath}/scheduleEntries`),
        listCollection(`${tripPath}/lodgingCandidates`),
        listCollection(`${tripPath}/confirmedStays`),
        listCollection(`${tripPath}/itineraryItems`),
      ]);
      renderTabSummary({
        destinations: `候補地 ${destinations.length}件`,
        schedule: `候補日 ${scheduleEntries.length}件`,
        lodging: `候補 ${lodgingCandidates.length}件・確定 ${confirmedStays.length}件`,
        itinerary: `${itineraryItems.length}件`,
      });
    } catch (error) {
      console.error(error);
      // 件数取得に失敗しても概要タブ自体の表示は妨げないため、サマリーは空のままにする。
    }
  }

  const onEditNameClick = () => {
    tripNameInput.value = tripNameHeading.textContent;
    nameErrorText.textContent = '';
    editNameForm.hidden = false;
    tripNameInput.focus();
  };
  editNameButton.addEventListener('click', onEditNameClick);

  const onCancelEditClick = () => {
    editNameForm.hidden = true;
  };
  cancelEditButton.addEventListener('click', onCancelEditClick);

  const onEditNameSubmit = async (event) => {
    event.preventDefault();
    nameErrorText.textContent = '';

    const newName = tripNameInput.value.trim();
    if (!newName) {
      nameErrorText.textContent = '旅行名を入力してください。';
      return;
    }

    const submitButton = editNameForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await updateDocument(tripPath, { name: newName });
      tripNameHeading.textContent = newName;
      editNameForm.hidden = true;
    } catch (error) {
      console.error(error);
      nameErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  editNameForm.addEventListener('submit', onEditNameSubmit);

  const onEditMeetingClick = () => {
    meetingErrorText.textContent = '';
    meetingDisplay.hidden = true;
    meetingForm.hidden = false;
    editMeetingButton.hidden = true;
    meetingPlaceInput.focus();
  };
  editMeetingButton.addEventListener('click', onEditMeetingClick);

  const closeMeetingForm = () => {
    meetingForm.hidden = true;
    meetingDisplay.hidden = false;
    editMeetingButton.hidden = false;
  };

  const onCancelMeetingClick = () => {
    meetingPlaceInput.value = currentTrip.meetingPlace || '';
    meetingTimeInput.value = currentTrip.meetingTime || '';
    meetingLocationUrlInput.value = currentTrip.meetingLocationUrl || '';
    meetingNoteInput.value = currentTrip.meetingNote || '';
    closeMeetingForm();
  };
  cancelMeetingButton.addEventListener('click', onCancelMeetingClick);

  const onMeetingSubmit = async (event) => {
    event.preventDefault();
    meetingErrorText.textContent = '';

    const submitButton = meetingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const meetingPlace = meetingPlaceInput.value.trim();
      const meetingTime = meetingTimeInput.value.trim();
      const meetingLocationUrl = meetingLocationUrlInput.value.trim();
      const meetingNote = meetingNoteInput.value.trim();
      await updateDocument(tripPath, { meetingPlace, meetingTime, meetingLocationUrl, meetingNote });
      currentTrip = { ...currentTrip, meetingPlace, meetingTime, meetingLocationUrl, meetingNote };
      renderMeetingDisplay();
      closeMeetingForm();
    } catch (error) {
      console.error(error);
      meetingErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  meetingForm.addEventListener('submit', onMeetingSubmit);

  const onEditWarikaClick = () => {
    warikaErrorText.textContent = '';
    warikaDisplay.hidden = true;
    warikaForm.hidden = false;
    editWarikaButton.hidden = true;
    warikaUrlInput.focus();
  };
  editWarikaButton.addEventListener('click', onEditWarikaClick);

  const closeWarikaForm = () => {
    warikaForm.hidden = true;
    warikaDisplay.hidden = false;
    editWarikaButton.hidden = false;
  };

  const onCancelWarikaClick = () => {
    warikaUrlInput.value = currentTrip.warikaUrl || '';
    closeWarikaForm();
  };
  cancelWarikaButton.addEventListener('click', onCancelWarikaClick);

  const onWarikaSubmit = async (event) => {
    event.preventDefault();
    warikaErrorText.textContent = '';

    const submitButton = warikaForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      const warikaUrl = warikaUrlInput.value.trim();
      await updateDocument(tripPath, { warikaUrl });
      currentTrip = { ...currentTrip, warikaUrl };
      renderWarikaDisplay();
      closeWarikaForm();
    } catch (error) {
      console.error(error);
      warikaErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  warikaForm.addEventListener('submit', onWarikaSubmit);

  loadTrip();
  loadTabSummary();

  return () => {
    editNameButton.removeEventListener('click', onEditNameClick);
    cancelEditButton.removeEventListener('click', onCancelEditClick);
    editNameForm.removeEventListener('submit', onEditNameSubmit);
    editMeetingButton.removeEventListener('click', onEditMeetingClick);
    cancelMeetingButton.removeEventListener('click', onCancelMeetingClick);
    meetingForm.removeEventListener('submit', onMeetingSubmit);
    editWarikaButton.removeEventListener('click', onEditWarikaClick);
    cancelWarikaButton.removeEventListener('click', onCancelWarikaClick);
    warikaForm.removeEventListener('submit', onWarikaSubmit);
  };
}
