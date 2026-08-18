// F. 日程調整タブビュー(SPA)
// 候補日ごとの○×△回答、メンバーごとの回答一覧表示、全員回答済みの日のハイライトを行う。
// データモデルはdocs/firestore-design.md「scheduleEntries」参照。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import {
  getDocument,
  listCollection,
  updateDocument,
  setDocumentMerged,
  sanitizeMapKey,
} from '../firestore.js';
import { icons } from '../icons.js';

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

    <form id="date-form" novalidate>
      <div class="field">
        <label for="date-input">候補日</label>
        <input type="date" id="date-input" name="date" required />
      </div>
      <p class="error-text" id="date-error-text"></p>
      <button type="submit">候補日を追加</button>
    </form>

    <div id="schedule-list"></div>
  `;

  const dateForm = outlet.querySelector('#date-form');
  const dateInput = outlet.querySelector('#date-input');
  const dateErrorText = outlet.querySelector('#date-error-text');
  const scheduleList = outlet.querySelector('#schedule-list');
  const submitButton = dateForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

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

  async function loadEntries() {
    try {
      const group = await getDocument(`groups/${session.groupCode}`);
      memberCount = group?.members?.length ?? 0;
      currentEntries = await listCollection(schedulePath);
      renderEntries();
    } catch (error) {
      console.error(error);
      dateErrorText.textContent = '候補日の取得に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  }

  async function setResponse(date, value) {
    dateErrorText.textContent = '';
    try {
      await updateDocument(`${schedulePath}/${date}`, {
        [`responses.${myKey}`]: value,
      });
      const entry = currentEntries.find((item) => item.id === date);
      if (entry) {
        entry.responses = { ...(entry.responses || {}), [myKey]: value };
        renderEntries();
      }
    } catch (error) {
      console.error(error);
      dateErrorText.textContent = '回答の保存に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onDateSubmit = async (event) => {
    event.preventDefault();
    dateErrorText.textContent = '';

    const date = dateInput.value;
    if (!date) {
      dateErrorText.textContent = '日付を選択してください。';
      return;
    }
    if (currentEntries.some((entry) => entry.id === date)) {
      dateErrorText.textContent = 'その日付はすでに候補にあります。';
      return;
    }

    submitButton.disabled = true;
    try {
      await setDocumentMerged(`${schedulePath}/${date}`, { responses: {} });
      dateInput.value = '';
      currentEntries = [...currentEntries, { id: date, responses: {} }];
      renderEntries();
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
    dateForm.removeEventListener('submit', onDateSubmit);
  };
}
