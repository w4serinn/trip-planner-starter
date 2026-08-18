// C. 旅行詳細トップ画面
// 旅行名の表示・編集を行う。D〜H各機能画面へのリンクや集合場所・割り勘欄は
// 別タスク(docs/ROADMAP.md「3. C. 旅行詳細トップ画面」)で実装する。
import { loadSession } from '../src/session.js';
import { getDocument, updateDocument } from '../src/firestore.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}

const tripId = new URLSearchParams(window.location.search).get('id');
if (!tripId) {
  window.location.href = 'trips.html';
}

const tripPath = `groups/${session.groupCode}/trips/${tripId}`;

const tripNameHeading = document.getElementById('trip-name');
const editNameButton = document.getElementById('edit-name-button');
const editNameForm = document.getElementById('edit-name-form');
const tripNameInput = document.getElementById('trip-name-input');
const nameErrorText = document.getElementById('name-error-text');
const cancelEditButton = document.getElementById('cancel-edit-button');

async function loadTrip() {
  try {
    const trip = await getDocument(tripPath);
    if (!trip) {
      window.location.href = 'trips.html';
      return;
    }
    tripNameHeading.textContent = trip.name || '名称未設定の旅行';
  } catch (error) {
    console.error(error);
    tripNameHeading.textContent = '取得に失敗しました';
  }
}

editNameButton.addEventListener('click', () => {
  tripNameInput.value = tripNameHeading.textContent;
  nameErrorText.textContent = '';
  editNameForm.hidden = false;
  tripNameInput.focus();
});

cancelEditButton.addEventListener('click', () => {
  editNameForm.hidden = true;
});

editNameForm.addEventListener('submit', async (event) => {
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
});

loadTrip();
