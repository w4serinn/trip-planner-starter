// 雑多メモタブビュー(SPA)
// 旅行1件につき1つの共有テキスト(trips/{tripId}.scratchText)に、みんなで自由に書きなぐる
// ブレインダンプ用の置き場。入力はデバウンスして自動保存する(src/views/notes.jsと同じ方式)。
// テキストエリアで選択した範囲を、「→企画メモへ」「→行き先決めへ」「→しおりへ」
// 「→宿泊へ」ボタンで振り分けられる(日程調整は自由記述の入れ場所が無いため対象外)。
// 詳細はdocs/firestore-design.md「雑多メモの振り分け方式の再設計」参照。
// 企画メモ(src/views/notes.js)と見た目がほぼ同じで役割の違いが伝わりにくいとの
// 指摘を受け、アイコン見出しで視覚的に差別化している(docs/ROADMAP.md「48」)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { getDocument, subscribeToDocument, updateDocument, addDocument, serverTimestamp } from '../firestore.js';
import { icons } from '../icons.js';
import { createDatePicker } from '../datePicker.js';
import { HOUR_OPTIONS, MINUTE_OPTIONS, buildTimeString } from '../timeSelect.js';

const SAVE_DEBOUNCE_MS = 1200;

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const tripPath = `groups/${session.groupCode}/trips/${tripId}`;
  const itemsPath = `${tripPath}/itineraryItems`;
  const destinationsPath = `${tripPath}/destinations`;
  const lodgingCandidatesPath = `${tripPath}/lodgingCandidates`;

  outlet.innerHTML = `
    <p class="subtitle">まず自由に書きなぐって、後から他のタブに振り分けましょう。入力は自動的に保存されます。</p>

    <div class="card card-dark">
      <h3 class="icon-heading">${icons.scratch}<span>雑多メモ</span></h3>
      <textarea id="scratch-text" rows="16" placeholder="ここに自由に書き込んでください..." disabled></textarea>
      <div class="scratch-actions" id="scratch-actions">
        <div class="button-row">
          <button type="button" id="to-notes-button" class="btn-secondary">${icons.notes}<span>→企画メモへ</span></button>
          <button type="button" id="to-destinations-button" class="btn-secondary">${icons.destinations}<span>→行き先決めへ</span></button>
        </div>
        <div class="button-row">
          <button type="button" id="to-itinerary-button" class="btn-secondary">${icons.itinerary}<span>→しおりへ</span></button>
          <button type="button" id="to-lodging-button" class="btn-secondary">${icons.lodging}<span>→宿泊へ</span></button>
        </div>
      </div>
      <p class="error-text" id="scratch-error-text"></p>
      <p class="copy-feedback" id="scratch-saved-text"></p>
    </div>

    <form id="to-itinerary-form" class="card" novalidate hidden>
      <p class="subtitle">選択した内容をしおりの項目として追加します。日付を選んでください。</p>
      <div class="field">
        <label>日付</label>
        <div id="to-itinerary-date-picker"></div>
      </div>
      <div class="field">
        <label for="to-itinerary-time-ampm">時間目安(任意)</label>
        <div class="time-select-row">
          <select id="to-itinerary-time-ampm" name="timeAmPm">
            <option value="">--</option>
            <option value="AM">午前</option>
            <option value="PM">午後</option>
          </select>
          <select id="to-itinerary-time-hour" name="timeHour">
            <option value="">時</option>
            ${HOUR_OPTIONS.map((h) => `<option value="${h}">${h}</option>`).join('')}
          </select>
          <select id="to-itinerary-time-minute" name="timeMinute">
            <option value="">分</option>
            ${MINUTE_OPTIONS.map((m) => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="to-itinerary-location">場所リンク(任意)</label>
        <input type="url" id="to-itinerary-location" name="locationUrl" placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div class="field">
        <label for="to-itinerary-note">メモ(任意)</label>
        <input type="text" id="to-itinerary-note" name="note" />
      </div>
      <p class="error-text" id="to-itinerary-error-text"></p>
      <div class="button-row">
        <button type="submit">作成する</button>
        <button type="button" id="to-itinerary-cancel" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <form id="to-lodging-form" class="card" novalidate hidden>
      <p class="subtitle">選択した内容を宿泊候補のメモとして追加します。URLを入力してください。</p>
      <div class="field">
        <label for="to-lodging-url">URL</label>
        <input type="url" id="to-lodging-url" name="url" required placeholder="https://www.airbnb.jp/..." />
      </div>
      <p class="error-text" id="to-lodging-error-text"></p>
      <div class="button-row">
        <button type="submit">作成する</button>
        <button type="button" id="to-lodging-cancel" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="scratch-actions-spacer"></div>
  `;

  // タブ遷移アニメーション(docs/ROADMAP.md「72」)はtransformを使うため、有効な間
  // #viewがposition: fixedな#scratch-actions(直上の「44」)の包含ブロックになって
  // しまい、画面下部固定が一瞬崩れる(docs/ROADMAP.md「73」参照)。src/router.jsに
  // transformを使わないフォールバック用の遷移を使わせる。
  outlet.dataset.flatTransition = 'true';

  const scratchTextarea = outlet.querySelector('#scratch-text');
  const scratchActions = outlet.querySelector('#scratch-actions');
  const scratchActionsSpacer = outlet.querySelector('#scratch-actions-spacer');
  const errorText = outlet.querySelector('#scratch-error-text');
  const savedText = outlet.querySelector('#scratch-saved-text');
  const toNotesButton = outlet.querySelector('#to-notes-button');
  const toDestinationsButton = outlet.querySelector('#to-destinations-button');
  const toItineraryButton = outlet.querySelector('#to-itinerary-button');
  const toItineraryForm = outlet.querySelector('#to-itinerary-form');
  const toItineraryDatePickerContainer = outlet.querySelector('#to-itinerary-date-picker');
  const toItineraryTimeAmPmSelect = outlet.querySelector('#to-itinerary-time-ampm');
  const toItineraryTimeHourSelect = outlet.querySelector('#to-itinerary-time-hour');
  const toItineraryTimeMinuteSelect = outlet.querySelector('#to-itinerary-time-minute');
  const toItineraryLocationInput = outlet.querySelector('#to-itinerary-location');
  const toItineraryNoteInput = outlet.querySelector('#to-itinerary-note');
  const toItineraryErrorText = outlet.querySelector('#to-itinerary-error-text');
  const toItineraryCancelButton = outlet.querySelector('#to-itinerary-cancel');
  const toLodgingButton = outlet.querySelector('#to-lodging-button');
  const toLodgingForm = outlet.querySelector('#to-lodging-form');
  const toLodgingUrlInput = outlet.querySelector('#to-lodging-url');
  const toLodgingErrorText = outlet.querySelector('#to-lodging-error-text');
  const toLodgingCancelButton = outlet.querySelector('#to-lodging-cancel');

  // 単一選択モード(docs/ROADMAP.md「35」)。src/views/itinerary.jsの#item-date-pickerと
  // 同じ実装パターン(フォーム開閉時のリセット、アンマウント時のdestroy())を踏襲する。
  const toItineraryDatePicker = createDatePicker(toItineraryDatePickerContainer, { mode: 'single' });

  let saveTimer = null;
  let lastSavedValue = '';
  // 「→しおりへ」「→宿泊へ」は追加入力を挟むため、選択範囲をボタン押下時点で保持しておく。
  let pendingItineraryRange = null;
  let pendingLodgingRange = null;

  async function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const value = scratchTextarea.value;
    if (value === lastSavedValue) return;

    errorText.textContent = '';
    try {
      await updateDocument(tripPath, { scratchText: value });
      lastSavedValue = value;
      savedText.textContent = '保存しました。';
    } catch (error) {
      console.error(error);
      errorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onScratchInput = () => {
    savedText.textContent = '';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  };
  scratchTextarea.addEventListener('input', onScratchInput);

  // リアルタイム同期(docs/ROADMAP.md「第8期」参照)。他の参加者の更新を購読し、
  // 自分が編集中(未保存の変更がある)間は上書きしない(入力中の未保存分を壊さないため)。
  // フォーカスの有無自体は無関係(未保存の変更が無ければ、フォーカス中でも反映してよい。
  // docs/ROADMAP.md「33」)。
  let isFirstSnapshot = true;
  const unsubscribeScratch = subscribeToDocument(
    tripPath,
    (trip) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        if (!trip) {
          navigate('#/trips');
          return;
        }
        lastSavedValue = trip.scratchText || '';
        scratchTextarea.value = lastSavedValue;
        scratchTextarea.disabled = false;
        return;
      }

      const remoteValue = trip?.scratchText || '';
      const hasUnsavedLocalEdit = saveTimer !== null;
      if (hasUnsavedLocalEdit || remoteValue === lastSavedValue) return;
      lastSavedValue = remoteValue;
      scratchTextarea.value = remoteValue;
    },
    (error) => {
      console.error(error);
      errorText.textContent = '雑多メモの取得に失敗しました。時間をおいて再度お試しください。';
      scratchTextarea.disabled = false;
    },
  );

  function getSelection() {
    const start = scratchTextarea.selectionStart;
    const end = scratchTextarea.selectionEnd;
    if (start === end) return null;
    return { start, end, text: scratchTextarea.value.slice(start, end) };
  }

  const onToNotesClick = async () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = '企画メモへコピーするテキストを選択してください。';
      return;
    }

    toNotesButton.disabled = true;
    try {
      const trip = await getDocument(tripPath);
      const currentNotes = trip?.planningNotesText || '';
      const separator = currentNotes && !currentNotes.endsWith('\n') ? '\n' : '';
      const newNotes = `${currentNotes}${separator}${selection.text}`;

      await updateDocument(tripPath, { planningNotesText: newNotes });
      savedText.textContent = '企画メモへコピーしました。';
    } catch (error) {
      console.error(error);
      errorText.textContent = '企画メモへのコピーに失敗しました。時間をおいて再度お試しください。';
    } finally {
      toNotesButton.disabled = false;
    }
  };
  toNotesButton.addEventListener('click', onToNotesClick);

  const onToDestinationsClick = async () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = '行き先決めへコピーするテキストを選択してください。';
      return;
    }

    toDestinationsButton.disabled = true;
    try {
      await addDocument(destinationsPath, {
        name: selection.text,
        note: '',
        addedBy: session.name,
        addedAt: serverTimestamp(),
        votes: {},
      });
      savedText.textContent = '行き先決めへコピーしました。';
    } catch (error) {
      console.error(error);
      errorText.textContent = '行き先決めへのコピーに失敗しました。時間をおいて再度お試しください。';
    } finally {
      toDestinationsButton.disabled = false;
    }
  };
  toDestinationsButton.addEventListener('click', onToDestinationsClick);

  const onToItineraryClick = () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = 'しおりへコピーするテキストを選択してください。';
      return;
    }
    pendingItineraryRange = selection;
    toItineraryErrorText.textContent = '';
    toItineraryDatePicker.setValue(null);
    toItineraryTimeAmPmSelect.value = '';
    toItineraryTimeHourSelect.value = '';
    toItineraryTimeMinuteSelect.value = '';
    toItineraryLocationInput.value = '';
    toItineraryNoteInput.value = '';
    toItineraryForm.hidden = false;
  };
  toItineraryButton.addEventListener('click', onToItineraryClick);

  const onToItineraryCancel = () => {
    pendingItineraryRange = null;
    toItineraryForm.hidden = true;
  };
  toItineraryCancelButton.addEventListener('click', onToItineraryCancel);

  const onToItinerarySubmit = async (event) => {
    event.preventDefault();
    toItineraryErrorText.textContent = '';

    if (!pendingItineraryRange) {
      toItineraryForm.hidden = true;
      return;
    }

    const date = toItineraryDatePicker.getValue();
    if (!date) {
      toItineraryErrorText.textContent = '日付を選択してください。';
      return;
    }

    const amPm = toItineraryTimeAmPmSelect.value;
    const hour = toItineraryTimeHourSelect.value;
    const minute = toItineraryTimeMinuteSelect.value;
    const timeFieldsFilled = [amPm, hour, minute].filter((v) => v !== '').length;
    if (timeFieldsFilled > 0 && timeFieldsFilled < 3) {
      toItineraryErrorText.textContent = '時間を指定する場合は、午前/午後・時・分をすべて選択してください。';
      return;
    }
    const time = timeFieldsFilled === 3 ? buildTimeString(amPm, hour, minute) : '';
    const locationUrl = toItineraryLocationInput.value.trim();
    const note = toItineraryNoteInput.value.trim();

    const submitButton = toItineraryForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await addDocument(itemsPath, {
        title: pendingItineraryRange.text,
        date,
        time,
        locationUrl,
        note,
        addedBy: session.name,
      });

      pendingItineraryRange = null;
      toItineraryForm.hidden = true;
      savedText.textContent = 'しおりへコピーしました。';
    } catch (error) {
      console.error(error);
      toItineraryErrorText.textContent = 'しおりへの追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  toItineraryForm.addEventListener('submit', onToItinerarySubmit);

  const onToLodgingClick = () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = '宿泊へコピーするテキストを選択してください。';
      return;
    }
    pendingLodgingRange = selection;
    toLodgingErrorText.textContent = '';
    toLodgingUrlInput.value = '';
    toLodgingForm.hidden = false;
  };
  toLodgingButton.addEventListener('click', onToLodgingClick);

  const onToLodgingCancel = () => {
    pendingLodgingRange = null;
    toLodgingForm.hidden = true;
  };
  toLodgingCancelButton.addEventListener('click', onToLodgingCancel);

  const onToLodgingSubmit = async (event) => {
    event.preventDefault();
    toLodgingErrorText.textContent = '';

    if (!pendingLodgingRange) {
      toLodgingForm.hidden = true;
      return;
    }

    const url = toLodgingUrlInput.value.trim();
    if (!url) {
      toLodgingErrorText.textContent = 'URLを入力してください。';
      return;
    }

    const submitButton = toLodgingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await addDocument(lodgingCandidatesPath, {
        url,
        note: pendingLodgingRange.text,
        addedBy: session.name,
        addedAt: serverTimestamp(),
      });

      pendingLodgingRange = null;
      toLodgingForm.hidden = true;
      savedText.textContent = '宿泊へコピーしました。';
    } catch (error) {
      console.error(error);
      toLodgingErrorText.textContent = '宿泊への追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  toLodgingForm.addEventListener('submit', onToLodgingSubmit);

  // 振り分けボタンを画面下部に固定表示にする対応(docs/ROADMAP.md「44」)。
  // モバイル(768px未満)でのみ.scratch-actionsがposition: fixedになる(pages/shared.css
  // 参照)ため、その分の高さを最後尾のスペーサーで確保し、末尾のコンテンツが
  // バーに隠れないようにする。加えて、スマホの入力キーボード表示中はバーと
  // キーボードが重なってしまうため、visualViewportの高さがウィンドウ高さに対して
  // 大きく縮んだ場合(=キーボードが出ている)は.keyboard-openを付けてバーを
  // 画面外へスライドさせる。
  const isMobileWidth = () => window.matchMedia('(width < 768px)').matches;
  const KEYBOARD_HEIGHT_RATIO_THRESHOLD = 0.75;

  const updateActionsSpacerHeight = () => {
    scratchActionsSpacer.style.height = isMobileWidth() ? `${scratchActions.offsetHeight}px` : '0px';
  };
  updateActionsSpacerHeight();
  window.addEventListener('resize', updateActionsSpacerHeight);

  const updateKeyboardOpenState = () => {
    if (!window.visualViewport || !isMobileWidth()) {
      scratchActions.classList.remove('keyboard-open');
      return;
    }
    const ratio = window.visualViewport.height / window.innerHeight;
    scratchActions.classList.toggle('keyboard-open', ratio < KEYBOARD_HEIGHT_RATIO_THRESHOLD);
  };
  window.visualViewport?.addEventListener('resize', updateKeyboardOpenState);

  return () => {
    window.removeEventListener('resize', updateActionsSpacerHeight);
    window.visualViewport?.removeEventListener('resize', updateKeyboardOpenState);
    scratchTextarea.removeEventListener('input', onScratchInput);
    toNotesButton.removeEventListener('click', onToNotesClick);
    toDestinationsButton.removeEventListener('click', onToDestinationsClick);
    toItineraryButton.removeEventListener('click', onToItineraryClick);
    toItineraryCancelButton.removeEventListener('click', onToItineraryCancel);
    toItineraryForm.removeEventListener('submit', onToItinerarySubmit);
    toLodgingButton.removeEventListener('click', onToLodgingClick);
    toLodgingCancelButton.removeEventListener('click', onToLodgingCancel);
    toLodgingForm.removeEventListener('submit', onToLodgingSubmit);
    toItineraryDatePicker.destroy();
    unsubscribeScratch();
    // タブ離脱時、デバウンス待ちの未保存分があれば取りこぼさないよう即座に保存する。
    flushSave();
  };
}
