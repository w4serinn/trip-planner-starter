// G. 宿泊タブビュー(SPA)
// 宿泊候補の追加(URL・メモ)・一覧表示(投票機能は持たない。docs/requirements.md 7-3参照。
// 決定は口頭・Discord等で行う想定)と、確定宿泊の追加(URL・メモ・チェックイン/アウト日、
// 複数件・飛び飛びの日程に対応)・一覧表示(期間順)を行う。
// データモデルはdocs/firestore-design.md「lodgingCandidates」「confirmedStays」参照。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, listCollection, serverTimestamp } from '../firestore.js';

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
    <p class="subtitle">Airbnb等の候補リンクとメモを並べて比較する場所です(投票機能はありません。決定は口頭やDiscord等で行ってください)。</p>

    <form id="candidate-form" novalidate>
      <div class="field">
        <label for="candidate-url">URL</label>
        <input type="url" id="candidate-url" name="url" required placeholder="https://www.airbnb.jp/..." />
      </div>
      <div class="field">
        <label for="candidate-note">メモ</label>
        <input type="text" id="candidate-note" name="note" />
      </div>
      <p class="error-text" id="candidate-error-text"></p>
      <button type="submit">候補を追加</button>
    </form>

    <div id="candidate-list"></div>

    <h2>確定宿泊</h2>
    <p class="subtitle">実際に泊まる宿を、期間を分けて複数登録できます(日程が飛び飛びでも構いません)。</p>

    <form id="stay-form" novalidate>
      <div class="field">
        <label for="stay-url">URL</label>
        <input type="url" id="stay-url" name="url" required placeholder="https://www.airbnb.jp/..." />
      </div>
      <div class="field">
        <label for="stay-note">メモ</label>
        <input type="text" id="stay-note" name="note" />
      </div>
      <div class="field">
        <label for="stay-checkin">チェックイン</label>
        <input type="date" id="stay-checkin" name="checkIn" required />
      </div>
      <div class="field">
        <label for="stay-checkout">チェックアウト</label>
        <input type="date" id="stay-checkout" name="checkOut" required />
      </div>
      <p class="error-text" id="stay-error-text"></p>
      <button type="submit">確定宿泊を追加</button>
    </form>

    <div id="stay-list"></div>
  `;

  const candidateForm = outlet.querySelector('#candidate-form');
  const urlInput = outlet.querySelector('#candidate-url');
  const noteInput = outlet.querySelector('#candidate-note');
  const errorText = outlet.querySelector('#candidate-error-text');
  const candidateList = outlet.querySelector('#candidate-list');
  const submitButton = candidateForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  let currentCandidates = [];

  function renderCandidates(candidates) {
    candidateList.innerHTML = '';

    if (candidates.length === 0) {
      candidateList.innerHTML = '<p class="empty-state">まだ宿泊候補がありません。最初の候補を追加しましょう。</p>';
      return;
    }

    const sorted = [...candidates].sort((a, b) => (b.addedAt?.seconds ?? 0) - (a.addedAt?.seconds ?? 0));

    for (const candidate of sorted) {
      const card = document.createElement('div');
      card.className = 'card';

      const link = document.createElement('a');
      link.className = 'candidate-link';
      link.href = candidate.url;
      link.textContent = candidate.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.appendChild(link);

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
      urlInput.value = '';
      noteInput.value = '';
      // src/views/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
      currentCandidates = [...currentCandidates, { id, url, note, addedBy: session.name }];
      renderCandidates(currentCandidates);
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
  const stayForm = outlet.querySelector('#stay-form');
  const stayUrlInput = outlet.querySelector('#stay-url');
  const stayNoteInput = outlet.querySelector('#stay-note');
  const stayCheckInInput = outlet.querySelector('#stay-checkin');
  const stayCheckOutInput = outlet.querySelector('#stay-checkout');
  const stayErrorText = outlet.querySelector('#stay-error-text');
  const stayList = outlet.querySelector('#stay-list');
  const staySubmitButton = stayForm.querySelector('button[type="submit"]');

  staySubmitButton.disabled = true;

  let currentStays = [];

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function renderStays(stays) {
    stayList.innerHTML = '';

    if (stays.length === 0) {
      stayList.innerHTML = '<p class="empty-state">まだ確定宿泊がありません。</p>';
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

      const link = document.createElement('a');
      link.className = 'candidate-link';
      link.href = stay.url;
      link.textContent = stay.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.appendChild(link);

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
    const checkIn = stayCheckInInput.value;
    const checkOut = stayCheckOutInput.value;
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
      stayUrlInput.value = '';
      stayNoteInput.value = '';
      stayCheckInInput.value = '';
      stayCheckOutInput.value = '';
      currentStays = [...currentStays, { id, url, note, checkIn, checkOut, addedBy: session.name }];
      renderStays(currentStays);
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
    candidateForm.removeEventListener('submit', onCandidateSubmit);
    stayForm.removeEventListener('submit', onStaySubmit);
  };
}
