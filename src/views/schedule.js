// F. 日程調整タブビュー(SPA)
// 候補日ごとの○×△回答、メンバーごとの回答一覧表示、全員回答済み/自分が未回答の日の
// ハイライト(docs/ROADMAP.md「53」)、全候補日への一括回答(docs/ROADMAP.md「54」)、
// ○×△の内訳サマリー表示(docs/ROADMAP.md「63」)を行う。
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
import { createDatePicker, addMonths, toDateString, parseDateString } from '../datePicker.js';
import { buildOverviewCells } from '../scheduleOverview.js';

const RESPONSE_SYMBOLS = ['○', '△', '×'];
const OVERVIEW_STATUS_LABELS = { ok: '○', ng: '×', pending: '△' };
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function todayDateString() {
  const today = new Date();
  return toDateString(today.getFullYear(), today.getMonth(), today.getDate());
}

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

    <div class="card" id="schedule-overview-card">
      <h3 class="icon-heading">${icons.schedule}<span>候補日カレンダー</span></h3>
      <p class="subtitle">候補日が多いときに、月ごとの状況をひと目で確認できます。</p>
      <div class="schedule-overview-legend">
        <span><span class="schedule-overview-dot schedule-overview-dot-ok"></span>○ 全員参加可能</span>
        <span><span class="schedule-overview-dot schedule-overview-dot-ng"></span>× 誰か参加不可</span>
        <span><span class="schedule-overview-dot schedule-overview-dot-pending"></span>△ 検討中・未回答あり</span>
      </div>
      <div id="schedule-overview" class="date-picker"></div>
    </div>

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

    <div id="bulk-response-row" class="button-row" hidden>
      <button type="button" id="bulk-maru" class="btn-secondary">全部○にする</button>
      <button type="button" id="bulk-sankaku" class="btn-secondary">全部△にする</button>
      <button type="button" id="bulk-batsu" class="btn-secondary">全部×にする</button>
    </div>

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
  const bulkResponseRow = outlet.querySelector('#bulk-response-row');
  const bulkButtons = [...bulkResponseRow.querySelectorAll('button')];
  const overviewContainer = outlet.querySelector('#schedule-overview');

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

  // 俯瞰ビュー(docs/ROADMAP.md「52」)の表示中の年月。初回データ取得時、候補日が
  // あればその最も早い候補日の月へ自動的に合わせる(それ以降はユーザーの月送り操作を
  // 尊重し、再描画のたびに戻したりしない)。
  const todayStr = todayDateString();
  let overviewYear = parseDateString(todayStr).year;
  let overviewMonth = parseDateString(todayStr).month;
  let overviewInitialized = false;

  function renderOverview() {
    overviewContainer.innerHTML = '';
    overviewContainer.classList.add('date-picker');

    const header = document.createElement('div');
    header.className = 'date-picker-header';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'date-picker-nav';
    prevButton.textContent = '‹';
    prevButton.setAttribute('aria-label', '前の月');
    prevButton.addEventListener('click', () => {
      ({ year: overviewYear, month: overviewMonth } = addMonths(overviewYear, overviewMonth, -1));
      renderOverview();
    });

    const label = document.createElement('span');
    label.className = 'date-picker-label';
    label.textContent = `${overviewYear}年${overviewMonth + 1}月`;

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'date-picker-nav';
    nextButton.textContent = '›';
    nextButton.setAttribute('aria-label', '次の月');
    nextButton.addEventListener('click', () => {
      ({ year: overviewYear, month: overviewMonth } = addMonths(overviewYear, overviewMonth, 1));
      renderOverview();
    });

    header.appendChild(prevButton);
    header.appendChild(label);
    header.appendChild(nextButton);
    overviewContainer.appendChild(header);

    const weekdayRow = document.createElement('div');
    weekdayRow.className = 'date-picker-grid date-picker-weekdays';
    for (const weekdayLabel of WEEKDAY_LABELS) {
      const cell = document.createElement('span');
      cell.textContent = weekdayLabel;
      weekdayRow.appendChild(cell);
    }
    overviewContainer.appendChild(weekdayRow);

    const entriesByDate = new Map(currentEntries.map((entry) => [entry.id, entry]));
    const cells = buildOverviewCells(overviewYear, overviewMonth, entriesByDate, memberCount);

    const grid = document.createElement('div');
    grid.className = 'date-picker-grid';
    for (const cell of cells) {
      if (cell === null) {
        grid.appendChild(document.createElement('span'));
        continue;
      }
      const daySpan = document.createElement('span');
      daySpan.className = 'schedule-overview-day';
      if (cell.dateStr === todayStr) daySpan.classList.add('schedule-overview-day-today');
      if (cell.status) daySpan.classList.add(`schedule-overview-day-${cell.status}`);
      daySpan.textContent = String(cell.day);
      daySpan.title = cell.status
        ? `${cell.dateStr}: ${OVERVIEW_STATUS_LABELS[cell.status]}`
        : cell.dateStr;
      grid.appendChild(daySpan);
    }
    overviewContainer.appendChild(grid);
  }

  renderOverview();

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  function renderEntries() {
    scheduleList.innerHTML = '';
    bulkResponseRow.hidden = currentEntries.length === 0;

    if (currentEntries.length === 0) {
      scheduleList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ候補日がありません。最初の候補日を追加しましょう。</p></div>`;
      return;
    }

    const sorted = [...currentEntries].sort((a, b) => a.id.localeCompare(b.id));

    for (const entry of sorted) {
      const responses = entry.responses || {};
      const isComplete = memberCount > 0 && Object.keys(responses).length >= memberCount;
      const isUnanswered = !responses[myKey];

      const card = document.createElement('div');
      const cardClasses = ['card'];
      if (isComplete) cardClasses.push('schedule-complete');
      // isCompleteが真ならmyKey分の回答も含まれているはずなので、
      // 全員回答済みと自分が未回答は基本的に同時には起きない。
      if (isUnanswered) cardClasses.push('schedule-unanswered');
      card.className = cardClasses.join(' ');

      const heading = document.createElement('h3');
      heading.textContent = formatDateLabel(entry.id);
      card.appendChild(heading);

      // 内訳サマリー(docs/ROADMAP.md「63」)。候補日が多いと各カードの回答者名を
      // 1件ずつ読まないと状況がわからないため、○×△の集計を先に一目で見せる。
      const responseValues = Object.values(responses);
      if (responseValues.length > 0) {
        const counts = { '○': 0, '△': 0, '×': 0 };
        for (const value of responseValues) {
          if (counts[value] !== undefined) counts[value] += 1;
        }
        const tally = document.createElement('p');
        tally.className = 'subtitle';
        tally.textContent = RESPONSE_SYMBOLS.map((symbol) => `${symbol}${counts[symbol]}`).join(' ');
        card.appendChild(tally);
      }

      if (isUnanswered) {
        const unansweredText = document.createElement('p');
        unansweredText.className = 'unanswered-badge';
        unansweredText.textContent = 'あなたは未回答です';
        card.appendChild(unansweredText);
      }

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
          // 初回取得時のみ、候補日があればその最も早い候補日の月へ俯瞰ビューを合わせる
          // (それ以降はユーザーが月送りした表示を尊重し、再描画のたびに戻さない)。
          if (!overviewInitialized && entries.length > 0) {
            const earliestDate = [...entries].map((entry) => entry.id).sort()[0];
            ({ year: overviewYear, month: overviewMonth } = parseDateString(earliestDate));
          }
          overviewInitialized = true;
        }
        renderOverview();
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

  // 候補日全体への一括回答(docs/ROADMAP.md「54」)。候補日が多いときに1件ずつ
  // ボタンを押す手間を減らす。既存のsetResponse(単一日付の回答)をそのまま流用する。
  async function setAllResponses(value) {
    dateErrorText.textContent = '';
    for (const button of bulkButtons) button.disabled = true;
    try {
      await Promise.all(currentEntries.map((entry) => setResponse(entry.id, value)));
    } finally {
      for (const button of bulkButtons) button.disabled = false;
    }
  }

  const onBulkMaruClick = () => setAllResponses('○');
  const onBulkSankakuClick = () => setAllResponses('△');
  const onBulkBatsuClick = () => setAllResponses('×');
  outlet.querySelector('#bulk-maru').addEventListener('click', onBulkMaruClick);
  outlet.querySelector('#bulk-sankaku').addEventListener('click', onBulkSankakuClick);
  outlet.querySelector('#bulk-batsu').addEventListener('click', onBulkBatsuClick);

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
    outlet.querySelector('#bulk-maru').removeEventListener('click', onBulkMaruClick);
    outlet.querySelector('#bulk-sankaku').removeEventListener('click', onBulkSankakuClick);
    outlet.querySelector('#bulk-batsu').removeEventListener('click', onBulkBatsuClick);
    datePicker.destroy();
    if (unsubscribeEntries) unsubscribeEntries();
  };
}
