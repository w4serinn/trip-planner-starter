// C. 旅行詳細(概要タブ)ビュー(SPA)
// 旅行名の表示・編集、集合情報・割り勘リンクの直接編集を行う。
// D〜H各機能への移動はタブバー(src/app.js)経由で行うため、旧MPA版にあった
// featureLinksカードナビは持たない。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { getDocument, updateDocument } from '../firestore.js';

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const tripPath = `groups/${session.groupCode}/trips/${tripId}`;

  outlet.innerHTML = `
    <div class="trip-name-row">
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

    <section class="card">
      <h3>集合情報</h3>
      <form id="meeting-form" novalidate>
        <div class="field">
          <label for="meeting-place">場所</label>
          <input type="text" id="meeting-place" name="meetingPlace" />
        </div>
        <div class="field">
          <label for="meeting-time">時間</label>
          <input type="text" id="meeting-time" name="meetingTime" />
        </div>
        <div class="field">
          <label for="meeting-note">メモ</label>
          <input type="text" id="meeting-note" name="meetingNote" />
        </div>
        <p class="error-text" id="meeting-error-text"></p>
        <p class="copy-feedback" id="meeting-saved-text"></p>
        <button type="submit">集合情報を保存</button>
      </form>
    </section>

    <section class="card">
      <h3>割り勘リンク(Walica)</h3>
      <form id="warika-form" novalidate>
        <div class="field">
          <label for="warika-url">URL</label>
          <input type="url" id="warika-url" name="warikaUrl" placeholder="https://walica.jp/..." />
        </div>
        <p class="error-text" id="warika-error-text"></p>
        <p class="copy-feedback" id="warika-saved-text"></p>
        <button type="submit">割り勘リンクを保存</button>
      </form>
    </section>
  `;

  const tripNameHeading = outlet.querySelector('#trip-name');
  const editNameButton = outlet.querySelector('#edit-name-button');
  const editNameForm = outlet.querySelector('#edit-name-form');
  const tripNameInput = outlet.querySelector('#trip-name-input');
  const nameErrorText = outlet.querySelector('#name-error-text');
  const cancelEditButton = outlet.querySelector('#cancel-edit-button');

  const meetingForm = outlet.querySelector('#meeting-form');
  const meetingPlaceInput = outlet.querySelector('#meeting-place');
  const meetingTimeInput = outlet.querySelector('#meeting-time');
  const meetingNoteInput = outlet.querySelector('#meeting-note');
  const meetingErrorText = outlet.querySelector('#meeting-error-text');
  const meetingSavedText = outlet.querySelector('#meeting-saved-text');

  const warikaForm = outlet.querySelector('#warika-form');
  const warikaUrlInput = outlet.querySelector('#warika-url');
  const warikaErrorText = outlet.querySelector('#warika-error-text');
  const warikaSavedText = outlet.querySelector('#warika-saved-text');

  async function loadTrip() {
    try {
      const trip = await getDocument(tripPath);
      if (!trip) {
        navigate('#/trips');
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

  const onMeetingSubmit = async (event) => {
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
  };
  meetingForm.addEventListener('submit', onMeetingSubmit);

  const onWarikaSubmit = async (event) => {
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
  };
  warikaForm.addEventListener('submit', onWarikaSubmit);

  loadTrip();

  return () => {
    editNameButton.removeEventListener('click', onEditNameClick);
    cancelEditButton.removeEventListener('click', onCancelEditClick);
    editNameForm.removeEventListener('submit', onEditNameSubmit);
    meetingForm.removeEventListener('submit', onMeetingSubmit);
    warikaForm.removeEventListener('submit', onWarikaSubmit);
  };
}
