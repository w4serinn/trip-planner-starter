// H. しおりタブビュー(SPA)
// しおり項目の追加(やること名・日付・時間目安(任意)・場所リンク(任意)・メモ(任意))と、
// 日付グルーピング＋各日内での時間順自動ソート表示を行う。
// データモデルはdocs/firestore-design.md「itineraryItems」参照。
// 時間入力の3セレクトボックス化(docs/ROADMAP.md「15」)は別タスクのため、ここでは
// <input type="time">のまま移植する。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, listCollection } from '../firestore.js';

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

    <form id="item-form" novalidate>
      <div class="field">
        <label for="item-title">やること</label>
        <input type="text" id="item-title" name="title" required />
      </div>
      <div class="field">
        <label for="item-date">日付</label>
        <input type="date" id="item-date" name="date" required />
      </div>
      <div class="field">
        <label for="item-time">時間目安(任意)</label>
        <input type="time" id="item-time" name="time" />
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
      <button type="submit">追加する</button>
    </form>

    <div id="item-list"></div>
  `;

  const itemForm = outlet.querySelector('#item-form');
  const titleInput = outlet.querySelector('#item-title');
  const dateInput = outlet.querySelector('#item-date');
  const timeInput = outlet.querySelector('#item-time');
  const locationInput = outlet.querySelector('#item-location');
  const noteInput = outlet.querySelector('#item-note');
  const errorText = outlet.querySelector('#item-error-text');
  const itemList = outlet.querySelector('#item-list');
  const submitButton = itemForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  let currentItems = [];

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  function renderItems(items) {
    itemList.innerHTML = '';

    if (items.length === 0) {
      itemList.innerHTML = '<p class="empty-state">まだしおり項目がありません。最初の項目を追加しましょう。</p>';
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

      for (const item of dayItems) {
        const card = document.createElement('div');
        card.className = 'card';

        const title = document.createElement('h3');
        title.textContent = item.time ? `${item.time} ${item.title}` : item.title;
        card.appendChild(title);

        if (item.locationUrl) {
          const link = document.createElement('a');
          link.className = 'candidate-link';
          link.href = item.locationUrl;
          link.textContent = item.locationUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          card.appendChild(link);
        }

        if (item.note) {
          const note = document.createElement('p');
          note.textContent = item.note;
          card.appendChild(note);
        }

        const meta = document.createElement('p');
        meta.className = 'subtitle';
        meta.textContent = `追加: ${item.addedBy}`;
        card.appendChild(meta);

        itemList.appendChild(card);
      }
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
    const date = dateInput.value;
    const time = timeInput.value;
    const locationUrl = locationInput.value.trim();
    const note = noteInput.value.trim();
    if (!title || !date) {
      errorText.textContent = 'やること名と日付を入力してください。';
      return;
    }

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
      titleInput.value = '';
      timeInput.value = '';
      locationInput.value = '';
      noteInput.value = '';
      // src/views/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
      currentItems = [...currentItems, { id, title, date, time, locationUrl, note, addedBy: session.name }];
      renderItems(currentItems);
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
    itemForm.removeEventListener('submit', onItemSubmit);
  };
}
