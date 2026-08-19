// H. しおりタブビュー(SPA)
// しおり項目の追加(やること名・日付・時間目安(任意)・場所リンク(任意)・メモ(任意))と、
// 日付グルーピング＋各日内での時間順自動ソート表示を行う。
// データモデルはdocs/firestore-design.md「itineraryItems」参照。
// 時間入力は<input type="time">のネイティブUIではなく、「午前/午後」「時(0〜12)」
// 「分(00/15/30/45)」の3セレクトボックスにする(docs/ROADMAP.md「15」)。保存する
// データ形式("HH:MM"の24時間表記文字列)自体は変えない。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, listCollection } from '../firestore.js';
import { icons } from '../icons.js';
import { isSafeUrl } from '../url.js';
import { createDatePicker } from '../datePicker.js';

// 時間未入力の項目をその日の最後に並べるための番兵値(実際の"HH:MM"より必ず後ろに来る)。
const NO_TIME_SENTINEL = '99:99';

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i)); // 0〜12
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// 「午前/午後」+「0〜12時」+「分」から24時間表記の"HH:MM"文字列を組み立てる。
// 0時・12時はそれぞれのAM/PM内で同じ境界時刻を指すエイリアスとして扱う
// (午前0時=午前12時=00:00、午後0時=午後12時=12:00)。
function buildTimeString(amPm, hour, minute) {
  const hourNum = Number(hour);
  const hour24 = (hourNum % 12) + (amPm === 'PM' ? 12 : 0);
  return `${String(hour24).padStart(2, '0')}:${minute}`;
}

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
  const noteInput = outlet.querySelector('#item-note');
  const errorText = outlet.querySelector('#item-error-text');
  const itemList = outlet.querySelector('#item-list');
  const submitButton = itemForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  // 単一選択モード(docs/ROADMAP.md「27」の3つ目のサブタスク)。既存の<input type="date">の
  // 置き換え。
  const datePicker = createDatePicker(datePickerContainer, { mode: 'single' });

  function openForm() {
    toggleFormButton.hidden = true;
    itemForm.hidden = false;
    titleInput.focus();
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
    noteInput.value = '';
  }

  const onToggleFormClick = () => openForm();
  toggleFormButton.addEventListener('click', onToggleFormClick);

  const onCancelFormClick = () => closeForm();
  cancelFormButton.addEventListener('click', onCancelFormClick);

  let currentItems = [];

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  function renderItems(items) {
    itemList.innerHTML = '';

    if (items.length === 0) {
      itemList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだしおり項目がありません。最初の項目を追加しましょう。</p></div>`;
      return;
    }

    const groups = new Map();
    for (const item of items) {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    }

    const sortedDates = [...groups.keys()].sort();

    for (const date of sortedDates) {
      const heading = document.createElement('h2');
      heading.textContent = formatDateLabel(date);
      itemList.appendChild(heading);

      const dayItems = groups.get(date).sort((a, b) => (a.time || NO_TIME_SENTINEL).localeCompare(b.time || NO_TIME_SENTINEL));

      const timeline = document.createElement('div');
      timeline.className = 'timeline';

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

        const content = document.createElement('div');
        content.className = 'timeline-content card';

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

        if (item.note) {
          const note = document.createElement('p');
          note.textContent = item.note;
          content.appendChild(note);
        }

        const meta = document.createElement('p');
        meta.className = 'subtitle';
        meta.textContent = `追加: ${item.addedBy}`;
        content.appendChild(meta);

        timelineItem.appendChild(content);
        timeline.appendChild(timelineItem);
      });

      itemList.appendChild(timeline);
    }
  }

  async function loadItems() {
    try {
      currentItems = await listCollection(itemsPath);
      renderItems(currentItems);
    } catch (error) {
      console.error(error);
      errorText.textContent = 'しおり項目の取得に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  }

  const onItemSubmit = async (event) => {
    event.preventDefault();
    errorText.textContent = '';

    const title = titleInput.value.trim();
    const date = datePicker.getValue();
    const amPm = timeAmPmSelect.value;
    const hour = timeHourSelect.value;
    const minute = timeMinuteSelect.value;
    const locationUrl = locationInput.value.trim();
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
      const id = await addDocument(itemsPath, {
        title,
        date,
        time,
        locationUrl,
        note,
        addedBy: session.name,
      });
      // src/views/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
      currentItems = [...currentItems, { id, title, date, time, locationUrl, note, addedBy: session.name }];
      renderItems(currentItems);
      closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = 'しおり項目の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  itemForm.addEventListener('submit', onItemSubmit);

  loadItems();

  return () => {
    toggleFormButton.removeEventListener('click', onToggleFormClick);
    cancelFormButton.removeEventListener('click', onCancelFormClick);
    itemForm.removeEventListener('submit', onItemSubmit);
    datePicker.destroy();
  };
}
