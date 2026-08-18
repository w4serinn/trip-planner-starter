// H. しおり画面
// しおり項目の追加(やること名・日付・時間目安(任意)・場所リンク(任意)・メモ(任意))と、
// 日付グルーピング＋各日内での時間順自動ソート表示を行う。
// データモデルはdocs/firestore-design.md「itineraryItems」参照。
import { loadSession } from '../src/session.js';
import { addDocument, listCollection } from '../src/firestore.js';

// 時間未入力の項目をその日の最後に並べるための番兵値(実際の"HH:MM"より必ず後ろに来る)。
const NO_TIME_SENTINEL = '99:99';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}

const tripId = new URLSearchParams(window.location.search).get('tripId');
if (!tripId) {
  window.location.href = 'trips.html';
}

document.getElementById('back-link').href = `trip.html?id=${encodeURIComponent(tripId)}`;

const itemsPath = `groups/${session.groupCode}/trips/${tripId}/itineraryItems`;

const itemForm = document.getElementById('item-form');
const titleInput = document.getElementById('item-title');
const dateInput = document.getElementById('item-date');
const timeInput = document.getElementById('item-time');
const locationInput = document.getElementById('item-location');
const noteInput = document.getElementById('item-note');
const errorText = document.getElementById('item-error-text');
const itemList = document.getElementById('item-list');
const submitButton = itemForm.querySelector('button[type="submit"]');

// 初回一覧取得が終わるまで投稿を止める(pages/notes.jsと同じ理由。取得順序の競合を避けるため)。
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

itemForm.addEventListener('submit', async (event) => {
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
    // pages/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
    currentItems = [...currentItems, { id, title, date, time, locationUrl, note, addedBy: session.name }];
    renderItems(currentItems);
  } catch (error) {
    console.error(error);
    errorText.textContent = 'しおり項目の追加に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

loadItems();
