// F. 日程調整タブビュー(SPA)
// 候補日ごとの○×△回答、メンバーごとの回答一覧表示、全員回答済みの日のハイライトを行う。
// データモデルはdocs/firestore-design.md「scheduleEntries」参照。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import {
  getDocument,
  subscribeToCollection,
  updateDocument,
  setDocumentMerged,
  sanitizeMapKey,
} from '../firestore.js';
import { icons } from '../icons.js';
import { createDatePicker } from '../datePicker.js';

const RESPONSE_SYMBOLS = ['○', '△', '×'];

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const schedulePath = `groups/${session.groupCode}/trips/${tripId}/scheduleEntries`;
  const myKey = sanitizeMapKey(session.name);

  outlet.innerHTML = `
    <p class="subtitle">候補日を追加し、○(参加できる)・△(未定)・×(参加できない)で回答しましょう。</p>

    <button type="button" id="toggle-date-form" class="btn-secondary">${icons.plus}<span>候補日を追加</span></button>

    <form id="date-form" novalidate hidden>
      <p class="subtitle">複数の日付をまとめて選択できます。</p>
      <div id="date-picker-container"></div>
      <div id="selected-dates-chips" class="chip-row"></div>
      <p class="error-text" id="date-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-date-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="schedule-list" class="card-grid"></div>
  `;

  const toggleFormButton = outlet.querySelector('#toggle-date-form');
  const dateForm = outlet.querySelector('#date-form');
  const cancelFormButton = outlet.querySelector('#cancel-date-form');
  const datePickerContainer = outlet.querySelector('#date-picker-container');
  const chipsContainer = outlet.querySelector('#selected-dates-chips');
  const dateErrorText = outlet.querySelector('#date-error-text');
  const scheduleList = outlet.querySelector('#schedule-list');
  const submitButton = dateForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  function renderChips(dates) {
    chipsContainer.innerHTML = '';
    for (const date of dates) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = formatDateLabel(date);
      chipsContainer.appendChild(chip);
    }
  }

  // 複数選択モード(docs/ROADMAP.md「27」)。選択された日付はチップで一覧表示する。
  const datePicker = createDatePicker(datePickerContainer, {
    mode: 'multi',
    onChange: renderChips,
  });

  function openForm() {
    toggleFormButton.hidden = true;
    dateForm.hidden = false;
  }

  function closeForm() {
    dateForm.hidden = true;
    toggleFormButton.hidden = false;
    dateErrorText.textContent = '';
    datePicker.setValue([]);
    renderChips([]);
  }

  const onToggleFormClick = () => openForm();
  toggleFormButton.addEventListener('click', onToggleFormClick);

  const onCancelFormClick = () => closeForm();
  cancelFormButton.addEventListener('click', onCancelFormClick);

  let currentEntries = [];
  let memberCount = 0;

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  function renderEntries() {
    scheduleList.innerHTML = '';

    if (currentEntries.length === 0) {
      scheduleList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ候補日がありません。最初の候補日を追加しましょう。</p></div>`;
      return;
    }

    const sorted = [...currentEntries].sort((a, b) => a.id.localeCompare(b.id));

    for (const entry of sorted) {
      const responses = entry.responses || {};
      const isComplete = memberCount > 0 && Object.keys(responses).length >= memberCount;

      const card = document.createElement('div');
      card.className = isComplete ? 'card schedule-complete' : 'card';

      const heading = document.createElement('h3');
      heading.textContent = formatDateLabel(entry.id);
      card.appendChild(heading);

      const myRow = document.createElement('div');
      myRow.className = 'button-row';
      for (const symbol of RESPONSE_SYMBOLS) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = symbol;
        button.className = responses[myKey] === symbol ? '' : 'btn-secondary';
        button.addEventListener('click', () => setResponse(entry.id, symbol));
        myRow.appendChild(button);
      }
      card.appendChild(myRow);

      const responseEntries = Object.entries(responses);
      if (responseEntries.length > 0) {
        const responseText = document.createElement('p');
        responseText.className = 'subtitle';
        responseText.textContent = responseEntries.map(([name, value]) => `${name}: ${value}`).join(' / ');
        card.appendChild(responseText);
      }

      if (isComplete) {
        const completeText = document.createElement('p');
        completeText.className = 'complete-badge';
        completeText.textContent = '全員回答済み';
        card.appendChild(completeText);
      }

      scheduleList.appendChild(card);
    }
  }

  // リアルタイム同期(docs/ROADMAP.md「第8期」参照)。メンバー数(全員回答済み判定に
  // 使う)は候補日一覧とは別のドキュメント(groups/{code})のため、先に一度だけ取得してから
  // 候補日一覧の購読を開始する。以前は追加・回答のたびにローカルの配列を楽観的に
  // 更新していたが、購読による再描画と二重になりちらつきの原因になるため、
  // ローカル更新はやめて購読の再描画だけに一本化した。
  let isFirstSnapshot = true;
  let unsubscribeEntries = null;

  async function loadEntries() {
    try {
      const group = await getDocument(`groups/${session.groupCode}`);
      memberCount = group?.members?.length ?? 0;
    } catch (error) {
      console.error(error);
      // メンバー数が取れなくても候補日一覧自体は表示したいので、0のまま続行する
      // (「全員回答済み」判定が常にfalseになるだけで、致命的ではない)。
    }

    unsubscribeEntries = subscribeToCollection(
      schedulePath,
      (entries) => {
        currentEntries = entries;
        renderEntries();
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          submitButton.disabled = false;
        }
      },
      (error) => {
        console.error(error);
        dateErrorText.textContent = '候補日の取得に失敗しました。時間をおいて再度お試しください。';
        submitButton.disabled = false;
      },
    );
  }

  async function setResponse(date, value) {
    dateErrorText.textContent = '';
    try {
      await updateDocument(`${schedulePath}/${date}`, {
        [`responses.${myKey}`]: value,
      });
      // リアルタイム購読(第8期)が新しい値を届けて再描画するため、
      // ここでのローカル更新は行わない。
    } catch (error) {
      console.error(error);
      dateErrorText.textContent = '回答の保存に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onDateSubmit = async (event) => {
    event.preventDefault();
    dateErrorText.textContent = '';

    const selectedDates = datePicker.getValue();
    if (selectedDates.length === 0) {
      dateErrorText.textContent = '候補日を1つ以上選択してください。';
      return;
    }

    const existingIds = new Set(currentEntries.map((entry) => entry.id));
    const newDates = selectedDates.filter((date) => !existingIds.has(date));

    if (newDates.length === 0) {
      dateErrorText.textContent = '選択した日付はすべてすでに候補にあります。';
      return;
    }

    submitButton.disabled = true;
    try {
      // 既存の重複チェックを維持しつつ、選択された日付それぞれについて
      // setDocumentMergedを呼ぶ(Firestoreスキーマ・書き込み方式は単一選択時と同じ)。
      // 重複していた日付は無言でスキップし、新規分だけ追加する。
      for (const date of newDates) {
        await setDocumentMerged(`${schedulePath}/${date}`, { responses: {} });
      }
      // リアルタイム購読(第8期)が新しいドキュメントを届けて再描画するため、
      // ここでのローカル追加は行わない。
      closeForm();
    } catch (error) {
      console.error(error);
      dateErrorText.textContent = '候補日の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  dateForm.addEventListener('submit', onDateSubmit);

  loadEntries();

  return () => {
    toggleFormButton.removeEventListener('click', onToggleFormClick);
    cancelFormButton.removeEventListener('click', onCancelFormClick);
    dateForm.removeEventListener('submit', onDateSubmit);
    datePicker.destroy();
    if (unsubscribeEntries) unsubscribeEntries();
  };
}
