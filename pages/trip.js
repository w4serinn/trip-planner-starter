// C. 旅行詳細トップ画面
// 旅行名の表示・編集、集合情報・割り勘リンクの直接編集、D〜H各機能画面へのカードリンクを行う。
// D〜Hのカードは、各画面(4〜8章)を実装したサイクルで対応するものから順に追加する
// (docs/ROADMAP.md「3. C. 旅行詳細トップ画面」参照)。
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

// 実装済みの機能画面のみカードを表示する。未実装の画面(E〜H)は、それぞれの
// 画面実装サイクルで追加する。
const featureLinks = [
  { label: '企画メモ', href: `notes.html?tripId=${encodeURIComponent(tripId)}` },
];

const featureLinksNav = document.getElementById('feature-links');
for (const feature of featureLinks) {
  const link = document.createElement('a');
  link.className = 'card card-link';
  link.href = feature.href;
  link.textContent = feature.label;
  featureLinksNav.appendChild(link);
}

const tripNameHeading = document.getElementById('trip-name');
const editNameButton = document.getElementById('edit-name-button');
const editNameForm = document.getElementById('edit-name-form');
const tripNameInput = document.getElementById('trip-name-input');
const nameErrorText = document.getElementById('name-error-text');
const cancelEditButton = document.getElementById('cancel-edit-button');

const meetingForm = document.getElementById('meeting-form');
const meetingPlaceInput = document.getElementById('meeting-place');
const meetingTimeInput = document.getElementById('meeting-time');
const meetingNoteInput = document.getElementById('meeting-note');
const meetingErrorText = document.getElementById('meeting-error-text');
const meetingSavedText = document.getElementById('meeting-saved-text');

const warikaForm = document.getElementById('warika-form');
const warikaUrlInput = document.getElementById('warika-url');
const warikaErrorText = document.getElementById('warika-error-text');
const warikaSavedText = document.getElementById('warika-saved-text');

async function loadTrip() {
  try {
    const trip = await getDocument(tripPath);
    if (!trip) {
      window.location.href = 'trips.html';
      return;
    }
    tripNameHeading.textContent = trip.name || '名称未設定の旅行';
    meetingPlaceInput.value = trip.meetingPlace || '';
    meetingTimeInput.value = trip.meetingTime || '';
    meetingNoteInput.value = trip.meetingNote || '';
    warikaUrlInput.value = trip.warikaUrl || '';
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

meetingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  meetingErrorText.textContent = '';
  meetingSavedText.textContent = '';

  const submitButton = meetingForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await updateDocument(tripPath, {
      meetingPlace: meetingPlaceInput.value.trim(),
      meetingTime: meetingTimeInput.value.trim(),
      meetingNote: meetingNoteInput.value.trim(),
    });
    meetingSavedText.textContent = '保存しました。';
  } catch (error) {
    console.error(error);
    meetingErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

warikaForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  warikaErrorText.textContent = '';
  warikaSavedText.textContent = '';

  const submitButton = warikaForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await updateDocument(tripPath, {
      warikaUrl: warikaUrlInput.value.trim(),
    });
    warikaSavedText.textContent = '保存しました。';
  } catch (error) {
    console.error(error);
    warikaErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

loadTrip();
