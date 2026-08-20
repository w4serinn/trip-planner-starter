// H. しおりタブビュー(SPA)
// しおり項目の追加・編集・削除(やること名・日付・時間目安(任意)・場所リンク(任意)・
// 移動手段(任意)・メモ(任意))と、日付グルーピング＋各日内での時間順自動ソート表示を行う。
// データモデルはdocs/firestore-design.md「itineraryItems」参照。
// 時間入力は<input type="time">のネイティブUIではなく、「午前/午後」「時(0〜12)」
// 「分(00/15/30/45)」の3セレクトボックスにする(docs/ROADMAP.md「15」)。保存する
// データ形式("HH:MM"の24時間表記文字列)自体は変えない。時間セレクトのロジックは
// src/timeSelect.jsに切り出し、src/views/scratch.jsの簡易フォームと共用する
// (docs/ROADMAP.md「38」)。日付見出しはクリックで開閉できるアコーディオンにし
// (docs/ROADMAP.md「59」)、現在時刻に最も近い未来の予定を強調表示する
// (docs/ROADMAP.md「60」)。移動手段は交通手段の予約調整機能(Won't)とは別の、単なる
// 自由記述メモ(docs/ROADMAP.md「61」・docs/requirements.md5.1参照)。メモ欄は
// プレーンテキストだが、含まれるURLはリンク化する(docs/ROADMAP.md「65」)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, updateDocument, deleteDocument, subscribeToCollection } from '../firestore.js';
import { icons } from '../icons.js';
import { isSafeUrl } from '../url.js';
import { createDatePicker } from '../datePicker.js';
import { HOUR_OPTIONS, MINUTE_OPTIONS, buildTimeString, parseTimeString } from '../timeSelect.js';
import { appendLinkifiedText } from '../linkify.js';

// 時間未入力の項目をその日の最後に並べるための番兵値(実際の"HH:MM"より必ず後ろに来る)。
const NO_TIME_SENTINEL = '99:99';

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const itemsPath = `groups/${session.groupCode}/trips/${tripId}/itineraryItems`;

  outlet.innerHTML = `
    <p class="subtitle">現地で何をするかを書き貯めましょう。日付ごとにまとまり、各日の中は時間の早い順に並びます。</p>

    <button type="button" id="toggle-item-form" class="btn-secondary">${icons.plus}<span>しおり項目を追加</span></button>

    <form id="item-form" novalidate hidden>
      <div class="field">
        <label for="item-title">やること</label>
        <input type="text" id="item-title" name="title" required />
      </div>
      <div class="field">
        <label>日付</label>
        <div id="item-date-picker"></div>
      </div>
      <div class="field">
        <label for="item-time-ampm">時間目安(任意)</label>
        <div class="time-select-row">
          <select id="item-time-ampm" name="timeAmPm">
            <option value="">--</option>
            <option value="AM">午前</option>
            <option value="PM">午後</option>
          </select>
          <select id="item-time-hour" name="timeHour">
            <option value="">時</option>
            ${HOUR_OPTIONS.map((h) => `<option value="${h}">${h}</option>`).join('')}
          </select>
          <select id="item-time-minute" name="timeMinute">
            <option value="">分</option>
            ${MINUTE_OPTIONS.map((m) => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="item-location">場所リンク(任意)</label>
        <input type="url" id="item-location" name="locationUrl" placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div class="field">
        <label for="item-transportation">移動手段(任意)</label>
        <input type="text" id="item-transportation" name="transportation" placeholder="電車で移動、レンタカー等" />
      </div>
      <div class="field">
        <label for="item-note">メモ(任意)</label>
        <input type="text" id="item-note" name="note" />
      </div>
      <p class="error-text" id="item-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-item-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="item-list"></div>
  `;

  const toggleFormButton = outlet.querySelector('#toggle-item-form');
  const itemForm = outlet.querySelector('#item-form');
  const cancelFormButton = outlet.querySelector('#cancel-item-form');
  const titleInput = outlet.querySelector('#item-title');
  const datePickerContainer = outlet.querySelector('#item-date-picker');
  const timeAmPmSelect = outlet.querySelector('#item-time-ampm');
  const timeHourSelect = outlet.querySelector('#item-time-hour');
  const timeMinuteSelect = outlet.querySelector('#item-time-minute');
  const locationInput = outlet.querySelector('#item-location');
  const transportationInput = outlet.querySelector('#item-transportation');
  const noteInput = outlet.querySelector('#item-note');
  const errorText = outlet.querySelector('#item-error-text');
  const itemList = outlet.querySelector('#item-list');
  const submitButton = itemForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  // 単一選択モード(docs/ROADMAP.md「27」の3つ目のサブタスク)。既存の<input type="date">の
  // 置き換え。
  const datePicker = createDatePicker(datePickerContainer, { mode: 'single' });

  // 編集中の項目ID(docs/ROADMAP.md「39」)。nullなら新規追加モード。
  let editingItemId = null;

  function openForm() {
    toggleFormButton.hidden = true;
    itemForm.hidden = false;
    titleInput.focus();
  }

  // 既存項目の内容をフォームへ流し込み、編集モードとして開く。
  // 追加フォームを再利用するため、Firestoreへの書き込み処理(onItemSubmit)は
  // editingItemIdの有無でaddDocument/updateDocumentを切り替える。
  function openFormForEdit(item) {
    editingItemId = item.id;
    submitButton.textContent = '保存する';
    titleInput.value = item.title;
    datePicker.setValue(item.date);
    const { amPm, hour, minute } = parseTimeString(item.time);
    timeAmPmSelect.value = amPm;
    timeHourSelect.value = hour;
    timeMinuteSelect.value = minute;
    locationInput.value = item.locationUrl || '';
    transportationInput.value = item.transportation || '';
    noteInput.value = item.note || '';
    openForm();
  }

  function closeForm() {
    itemForm.hidden = true;
    toggleFormButton.hidden = false;
    errorText.textContent = '';
    titleInput.value = '';
    datePicker.setValue(null);
    timeAmPmSelect.value = '';
    timeHourSelect.value = '';
    timeMinuteSelect.value = '';
    locationInput.value = '';
    transportationInput.value = '';
    noteInput.value = '';
    editingItemId = null;
    submitButton.textContent = '追加する';
  }

  const onToggleFormClick = () => openForm();
  toggleFormButton.addEventListener('click', onToggleFormClick);

  const onCancelFormClick = () => closeForm();
  cancelFormButton.addEventListener('click', onCancelFormClick);

  let currentItems = [];

  // 開閉状態(docs/ROADMAP.md「59」)。閉じている日付の集合。renderItems()呼び出しを
  // またいで状態を保つため、この関数の外側(mountのスコープ)で保持する。
  const collapsedDates = new Set();

  function toggleDateCollapse(date) {
    if (collapsedDates.has(date)) collapsedDates.delete(date);
    else collapsedDates.add(date);
    renderItems(currentItems);
  }

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  // 現在時刻に最も近い未来の予定を探す(docs/ROADMAP.md「60」)。時間目安が未入力の
  // 項目は「その日のいつか」としてその日の終わり(23:59)扱いにする(一覧表示の並び順
  // (NO_TIME_SENTINEL)と同じく、その日の最後に来る想定のため)。
  function findNextItem(items) {
    const now = Date.now();
    let next = null;
    let nextTime = Infinity;
    for (const item of items) {
      const time = new Date(`${item.date}T${item.time || '23:59'}:00`).getTime();
      if (Number.isNaN(time) || time < now) continue;
      if (time < nextTime) {
        next = item;
        nextTime = time;
      }
    }
    return next;
  }

  // 誤操作防止のため、ブラウザ標準の確認ダイアログを挟んでから削除する
  // (docs/ROADMAP.md「39」)。
  const onDeleteItemClick = async (item, deleteButton) => {
    if (!window.confirm(`「${item.title}」を削除しますか?`)) return;
    deleteButton.disabled = true;
    try {
      await deleteDocument(`${itemsPath}/${item.id}`);
      if (editingItemId === item.id) closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = 'しおり項目の削除に失敗しました。時間をおいて再度お試しください。';
      deleteButton.disabled = false;
    }
  };

  function renderItems(items) {
    itemList.innerHTML = '';

    if (items.length === 0) {
      itemList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだしおり項目がありません。最初の項目を追加しましょう。</p></div>`;
      return;
    }

    const nextItem = findNextItem(items);

    const groups = new Map();
    for (const item of items) {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    }

    const sortedDates = [...groups.keys()].sort();

    for (const date of sortedDates) {
      const isCollapsed = collapsedDates.has(date);

      const heading = document.createElement('div');
      heading.className = 'itinerary-day-heading';
      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');
      heading.setAttribute('aria-expanded', String(!isCollapsed));
      const headingText = document.createElement('h2');
      headingText.textContent = formatDateLabel(date);
      heading.appendChild(headingText);
      const chevron = document.createElement('span');
      chevron.className = isCollapsed ? 'itinerary-day-chevron itinerary-day-chevron-collapsed' : 'itinerary-day-chevron';
      chevron.innerHTML = icons.chevron;
      heading.appendChild(chevron);
      const onHeadingActivate = (event) => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleDateCollapse(date);
      };
      heading.addEventListener('click', onHeadingActivate);
      heading.addEventListener('keydown', onHeadingActivate);
      itemList.appendChild(heading);

      const dayItems = groups.get(date).sort((a, b) => (a.time || NO_TIME_SENTINEL).localeCompare(b.time || NO_TIME_SENTINEL));

      const timeline = document.createElement('div');
      timeline.className = 'timeline';
      timeline.hidden = isCollapsed;

      dayItems.forEach((item, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';

        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        const badge = document.createElement('span');
        badge.className = 'timeline-marker-badge';
        badge.textContent = String(index + 1);
        marker.appendChild(badge);
        timelineItem.appendChild(marker);

        const isNext = nextItem?.id === item.id;

        const content = document.createElement('div');
        content.className = isNext ? 'timeline-content card timeline-content-next' : 'timeline-content card';

        if (isNext) {
          const nextBadge = document.createElement('span');
          nextBadge.className = 'next-badge';
          nextBadge.textContent = '次の予定';
          content.appendChild(nextBadge);
        }

        const title = document.createElement('h3');
        title.textContent = item.time ? `${item.time} ${item.title}` : item.title;
        content.appendChild(title);

        if (item.locationUrl) {
          if (isSafeUrl(item.locationUrl)) {
            const link = document.createElement('a');
            link.className = 'candidate-link';
            link.href = item.locationUrl;
            link.textContent = item.locationUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            content.appendChild(link);
          } else {
            const unsafeUrlText = document.createElement('p');
            unsafeUrlText.className = 'candidate-link';
            unsafeUrlText.textContent = item.locationUrl;
            content.appendChild(unsafeUrlText);
          }
        }

        if (item.transportation) {
          const transportation = document.createElement('p');
          transportation.textContent = `移動手段: ${item.transportation}`;
          content.appendChild(transportation);
        }

        if (item.note) {
          const note = document.createElement('p');
          appendLinkifiedText(note, item.note);
          content.appendChild(note);
        }

        const meta = document.createElement('p');
        meta.className = 'subtitle';
        meta.textContent = `追加: ${item.addedBy}`;
        content.appendChild(meta);

        const itemActions = document.createElement('div');
        itemActions.className = 'button-row';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn-secondary';
        editButton.textContent = '編集';
        editButton.addEventListener('click', () => openFormForEdit(item));
        itemActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-secondary';
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', () => onDeleteItemClick(item, deleteButton));
        itemActions.appendChild(deleteButton);

        content.appendChild(itemActions);

        timelineItem.appendChild(content);
        timeline.appendChild(timelineItem);
      });

      itemList.appendChild(timeline);
    }
  }

  // 「次の予定」(docs/ROADMAP.md「60」)はデータの変更が無くても時間経過だけで
  // 変わりうるため、1分ごとに再描画して追随させる。setIntervalはeslint設定の
  // グローバル一覧に無いため、既に許可されているsetTimeoutの自己再スケジュールで
  // 代用する。
  let nextItemRefreshTimer = null;
  function scheduleNextItemRefresh() {
    nextItemRefreshTimer = setTimeout(() => {
      renderItems(currentItems);
      scheduleNextItemRefresh();
    }, 60000);
  }
  scheduleNextItemRefresh();

  // リアルタイム同期(docs/ROADMAP.md「32」参照)。以前は追加のたびにローカルの配列を
  // 楽観的に更新していたが、購読による再描画と二重になりちらつきの原因になるため、
  // ローカル更新はやめて購読の再描画だけに一本化した。
  let isFirstSnapshot = true;
  const unsubscribeItems = subscribeToCollection(
    itemsPath,
    (items) => {
      currentItems = items;
      renderItems(currentItems);
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        submitButton.disabled = false;
      }
    },
    (error) => {
      console.error(error);
      errorText.textContent = 'しおり項目の取得に失敗しました。時間をおいて再度お試しください。';
      submitButton.disabled = false;
    },
  );

  const onItemSubmit = async (event) => {
    event.preventDefault();
    errorText.textContent = '';

    const title = titleInput.value.trim();
    const date = datePicker.getValue();
    const amPm = timeAmPmSelect.value;
    const hour = timeHourSelect.value;
    const minute = timeMinuteSelect.value;
    const locationUrl = locationInput.value.trim();
    const transportation = transportationInput.value.trim();
    const note = noteInput.value.trim();
    if (!title || !date) {
      errorText.textContent = 'やること名と日付を入力してください。';
      return;
    }

    const timeFieldsFilled = [amPm, hour, minute].filter((v) => v !== '').length;
    if (timeFieldsFilled > 0 && timeFieldsFilled < 3) {
      errorText.textContent = '時間を指定する場合は、午前/午後・時・分をすべて選択してください。';
      return;
    }
    const time = timeFieldsFilled === 3 ? buildTimeString(amPm, hour, minute) : '';

    submitButton.disabled = true;
    try {
      if (editingItemId) {
        // 編集時はaddedBy(追加者)を書き換えない。
        await updateDocument(`${itemsPath}/${editingItemId}`, { title, date, time, locationUrl, transportation, note });
      } else {
        await addDocument(itemsPath, { title, date, time, locationUrl, transportation, note, addedBy: session.name });
      }
      closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = editingItemId
        ? 'しおり項目の更新に失敗しました。時間をおいて再度お試しください。'
        : 'しおり項目の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  itemForm.addEventListener('submit', onItemSubmit);

  return () => {
    toggleFormButton.removeEventListener('click', onToggleFormClick);
    cancelFormButton.removeEventListener('click', onCancelFormClick);
    itemForm.removeEventListener('submit', onItemSubmit);
    datePicker.destroy();
    clearTimeout(nextItemRefreshTimer);
    unsubscribeItems();
  };
}
