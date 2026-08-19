// G. 宿泊タブビュー(SPA)
// 宿泊候補の追加(URL・メモ)・一覧表示(投票機能は持たない。docs/requirements.md 7-3参照。
// 決定は口頭・Discord等で行う想定)と、確定宿泊の追加(URL・メモ・チェックイン/アウト日、
// 複数件・飛び飛びの日程に対応)・一覧表示(期間順)を行う。
// データモデルはdocs/firestore-design.md「lodgingCandidates」「confirmedStays」参照。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, listCollection, serverTimestamp } from '../firestore.js';
import { icons } from '../icons.js';
import { isSafeUrl } from '../url.js';
import { createDatePicker } from '../datePicker.js';

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const candidatesPath = `groups/${session.groupCode}/trips/${tripId}/lodgingCandidates`;
  const confirmedStaysPath = `groups/${session.groupCode}/trips/${tripId}/confirmedStays`;

  outlet.innerHTML = `
    <h2 class="icon-heading">${icons.lodging}<span>宿泊候補</span></h2>
    <p class="subtitle">Airbnb等の候補リンクとメモを並べて比較する場所です(投票機能はありません。決定は口頭やDiscord等で行ってください)。</p>

    <button type="button" id="toggle-candidate-form" class="btn-secondary">${icons.plus}<span>候補を追加</span></button>

    <form id="candidate-form" novalidate hidden>
      <div class="field">
        <label for="candidate-url">URL</label>
        <input type="url" id="candidate-url" name="url" required placeholder="https://www.airbnb.jp/..." />
      </div>
      <div class="field">
        <label for="candidate-note">メモ</label>
        <input type="text" id="candidate-note" name="note" />
      </div>
      <p class="error-text" id="candidate-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-candidate-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="candidate-list" class="card-grid"></div>

    <div class="divider"><span>確定した宿泊</span></div>

    <h2 class="icon-heading">${icons.lodging}<span>確定宿泊</span></h2>
    <p class="subtitle">実際に泊まる宿を、期間を分けて複数登録できます(日程が飛び飛びでも構いません)。</p>

    <button type="button" id="toggle-stay-form" class="btn-secondary">${icons.plus}<span>確定宿泊を追加</span></button>

    <form id="stay-form" novalidate hidden>
      <div class="field">
        <label for="stay-url">URL</label>
        <input type="url" id="stay-url" name="url" required placeholder="https://www.airbnb.jp/..." />
      </div>
      <div class="field">
        <label for="stay-note">メモ</label>
        <input type="text" id="stay-note" name="note" />
      </div>
      <div class="field">
        <label>チェックイン</label>
        <div id="stay-checkin-picker"></div>
      </div>
      <div class="field">
        <label>チェックアウト</label>
        <div id="stay-checkout-picker"></div>
      </div>
      <p class="error-text" id="stay-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-stay-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="stay-list" class="card-grid"></div>
  `;

  const toggleCandidateFormButton = outlet.querySelector('#toggle-candidate-form');
  const candidateForm = outlet.querySelector('#candidate-form');
  const cancelCandidateFormButton = outlet.querySelector('#cancel-candidate-form');
  const urlInput = outlet.querySelector('#candidate-url');
  const noteInput = outlet.querySelector('#candidate-note');
  const errorText = outlet.querySelector('#candidate-error-text');
  const candidateList = outlet.querySelector('#candidate-list');
  const submitButton = candidateForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  function openCandidateForm() {
    toggleCandidateFormButton.hidden = true;
    candidateForm.hidden = false;
    urlInput.focus();
  }

  function closeCandidateForm() {
    candidateForm.hidden = true;
    toggleCandidateFormButton.hidden = false;
    errorText.textContent = '';
    urlInput.value = '';
    noteInput.value = '';
  }

  const onToggleCandidateFormClick = () => openCandidateForm();
  toggleCandidateFormButton.addEventListener('click', onToggleCandidateFormClick);

  const onCancelCandidateFormClick = () => closeCandidateForm();
  cancelCandidateFormButton.addEventListener('click', onCancelCandidateFormClick);

  let currentCandidates = [];

  function renderCandidates(candidates) {
    candidateList.innerHTML = '';

    if (candidates.length === 0) {
      candidateList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ宿泊候補がありません。最初の候補を追加しましょう。</p></div>`;
      return;
    }

    const sorted = [...candidates].sort((a, b) => (b.addedAt?.seconds ?? 0) - (a.addedAt?.seconds ?? 0));

    for (const candidate of sorted) {
      const card = document.createElement('div');
      card.className = 'card';

      if (isSafeUrl(candidate.url)) {
        const link = document.createElement('a');
        link.className = 'candidate-link';
        link.href = candidate.url;
        link.textContent = candidate.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.appendChild(link);
      } else {
        const unsafeUrlText = document.createElement('p');
        unsafeUrlText.className = 'candidate-link';
        unsafeUrlText.textContent = candidate.url;
        card.appendChild(unsafeUrlText);
      }

      if (candidate.note) {
        const note = document.createElement('p');
        note.textContent = candidate.note;
        card.appendChild(note);
      }

      const meta = document.createElement('p');
      meta.className = 'subtitle';
      meta.textContent = `追加: ${candidate.addedBy}`;
      card.appendChild(meta);

      candidateList.appendChild(card);
    }
  }

  async function loadCandidates() {
    try {
      currentCandidates = await listCollection(candidatesPath);
      renderCandidates(currentCandidates);
    } catch (error) {
      console.error(error);
      errorText.textContent = '宿泊候補の取得に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  }

  const onCandidateSubmit = async (event) => {
    event.preventDefault();
    errorText.textContent = '';

    const url = urlInput.value.trim();
    const note = noteInput.value.trim();
    if (!url) {
      errorText.textContent = 'URLを入力してください。';
      return;
    }

    submitButton.disabled = true;
    try {
      const id = await addDocument(candidatesPath, {
        url,
        note,
        addedBy: session.name,
        addedAt: serverTimestamp(),
      });
      // src/views/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
      currentCandidates = [...currentCandidates, { id, url, note, addedBy: session.name }];
      renderCandidates(currentCandidates);
      closeCandidateForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = '宿泊候補の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  candidateForm.addEventListener('submit', onCandidateSubmit);

  loadCandidates();

  // --- 確定宿泊 ---
  const toggleStayFormButton = outlet.querySelector('#toggle-stay-form');
  const stayForm = outlet.querySelector('#stay-form');
  const cancelStayFormButton = outlet.querySelector('#cancel-stay-form');
  const stayUrlInput = outlet.querySelector('#stay-url');
  const stayNoteInput = outlet.querySelector('#stay-note');
  const stayCheckInContainer = outlet.querySelector('#stay-checkin-picker');
  const stayCheckOutContainer = outlet.querySelector('#stay-checkout-picker');
  const stayErrorText = outlet.querySelector('#stay-error-text');
  const stayList = outlet.querySelector('#stay-list');
  const staySubmitButton = stayForm.querySelector('button[type="submit"]');

  staySubmitButton.disabled = true;

  // 単一選択モード(docs/ROADMAP.md「27」の3つ目のサブタスク)。既存の<input type="date">の
  // 置き換え。チェックイン/チェックアウトそれぞれ独立したpickerインスタンスを持つ。
  const stayCheckInPicker = createDatePicker(stayCheckInContainer, { mode: 'single' });
  const stayCheckOutPicker = createDatePicker(stayCheckOutContainer, { mode: 'single' });

  function openStayForm() {
    toggleStayFormButton.hidden = true;
    stayForm.hidden = false;
    stayUrlInput.focus();
  }

  function closeStayForm() {
    stayForm.hidden = true;
    toggleStayFormButton.hidden = false;
    stayErrorText.textContent = '';
    stayUrlInput.value = '';
    stayNoteInput.value = '';
    stayCheckInPicker.setValue(null);
    stayCheckOutPicker.setValue(null);
  }

  const onToggleStayFormClick = () => openStayForm();
  toggleStayFormButton.addEventListener('click', onToggleStayFormClick);

  const onCancelStayFormClick = () => closeStayForm();
  cancelStayFormButton.addEventListener('click', onCancelStayFormClick);

  let currentStays = [];

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderStays(stays) {
    stayList.innerHTML = '';

    if (stays.length === 0) {
      stayList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ確定宿泊がありません。</p></div>`;
      return;
    }

    // 期間順(チェックインの早い順)に表示する。
    const sorted = [...stays].sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    for (const stay of sorted) {
      const card = document.createElement('div');
      card.className = 'card';

      const period = document.createElement('h3');
      period.textContent = `${formatDateLabel(stay.checkIn)} 〜 ${formatDateLabel(stay.checkOut)}`;
      card.appendChild(period);

      if (isSafeUrl(stay.url)) {
        const link = document.createElement('a');
        link.className = 'candidate-link';
        link.href = stay.url;
        link.textContent = stay.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.appendChild(link);
      } else {
        const unsafeUrlText = document.createElement('p');
        unsafeUrlText.className = 'candidate-link';
        unsafeUrlText.textContent = stay.url;
        card.appendChild(unsafeUrlText);
      }

      if (stay.note) {
        const note = document.createElement('p');
        note.textContent = stay.note;
        card.appendChild(note);
      }

      const meta = document.createElement('p');
      meta.className = 'subtitle';
      meta.textContent = `追加: ${stay.addedBy}`;
      card.appendChild(meta);

      stayList.appendChild(card);
    }
  }

  async function loadStays() {
    try {
      currentStays = await listCollection(confirmedStaysPath);
      renderStays(currentStays);
    } catch (error) {
      console.error(error);
      stayErrorText.textContent = '確定宿泊の取得に失敗しました。時間をおいて再度お試しください。';
    } finally {
      staySubmitButton.disabled = false;
    }
  }

  const onStaySubmit = async (event) => {
    event.preventDefault();
    stayErrorText.textContent = '';

    const url = stayUrlInput.value.trim();
    const note = stayNoteInput.value.trim();
    const checkIn = stayCheckInPicker.getValue();
    const checkOut = stayCheckOutPicker.getValue();
    if (!url || !checkIn || !checkOut) {
      stayErrorText.textContent = 'URL・チェックイン・チェックアウトを入力してください。';
      return;
    }
    if (checkOut < checkIn) {
      stayErrorText.textContent = 'チェックアウトはチェックイン以降の日付にしてください。';
      return;
    }

    staySubmitButton.disabled = true;
    try {
      const id = await addDocument(confirmedStaysPath, {
        url,
        note,
        checkIn,
        checkOut,
        addedBy: session.name,
      });
      currentStays = [...currentStays, { id, url, note, checkIn, checkOut, addedBy: session.name }];
      renderStays(currentStays);
      closeStayForm();
    } catch (error) {
      console.error(error);
      stayErrorText.textContent = '確定宿泊の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      staySubmitButton.disabled = false;
    }
  };
  stayForm.addEventListener('submit', onStaySubmit);

  loadStays();

  return () => {
    toggleCandidateFormButton.removeEventListener('click', onToggleCandidateFormClick);
    cancelCandidateFormButton.removeEventListener('click', onCancelCandidateFormClick);
    candidateForm.removeEventListener('submit', onCandidateSubmit);
    toggleStayFormButton.removeEventListener('click', onToggleStayFormClick);
    cancelStayFormButton.removeEventListener('click', onCancelStayFormClick);
    stayForm.removeEventListener('submit', onStaySubmit);
    stayCheckInPicker.destroy();
    stayCheckOutPicker.destroy();
  };
}
