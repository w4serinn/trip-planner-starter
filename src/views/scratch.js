// 雑多メモタブビュー(SPA)
// 旅行1件につき1つの共有テキスト(trips/{tripId}.scratchText)に、みんなで自由に書きなぐる
// ブレインダンプ用の置き場。入力はデバウンスして自動保存する(src/views/notes.jsと同じ方式)。
// テキストエリアで選択した範囲を、「→企画メモへ」「→しおりへ」ボタンで振り分けられる。
// 詳細はdocs/firestore-design.md「雑多メモの振り分け方式の再設計」参照。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { getDocument, updateDocument, addDocument } from '../firestore.js';
import { icons } from '../icons.js';

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

  outlet.innerHTML = `
    <p class="subtitle">まず自由に書きなぐって、後から「企画メモ」や「しおり」に振り分けましょう。入力は自動的に保存されます。</p>

    <div class="card">
      <textarea id="scratch-text" rows="16" placeholder="ここに自由に書き込んでください..." disabled></textarea>
      <div class="button-row">
        <button type="button" id="to-notes-button" class="btn-secondary">${icons.notes}<span>→企画メモへ</span></button>
        <button type="button" id="to-itinerary-button" class="btn-secondary">${icons.itinerary}<span>→しおりへ</span></button>
      </div>
      <p class="error-text" id="scratch-error-text"></p>
      <p class="copy-feedback" id="scratch-saved-text"></p>
    </div>

    <form id="to-itinerary-form" class="card" novalidate hidden>
      <p class="subtitle">選択した内容をしおりの項目として追加します。日付を選んでください。</p>
      <div class="field">
        <label for="to-itinerary-date">日付</label>
        <input type="date" id="to-itinerary-date" name="date" required />
      </div>
      <p class="error-text" id="to-itinerary-error-text"></p>
      <div class="button-row">
        <button type="submit">作成する</button>
        <button type="button" id="to-itinerary-cancel" class="btn-secondary">キャンセル</button>
      </div>
    </form>
  `;

  const scratchTextarea = outlet.querySelector('#scratch-text');
  const errorText = outlet.querySelector('#scratch-error-text');
  const savedText = outlet.querySelector('#scratch-saved-text');
  const toNotesButton = outlet.querySelector('#to-notes-button');
  const toItineraryButton = outlet.querySelector('#to-itinerary-button');
  const toItineraryForm = outlet.querySelector('#to-itinerary-form');
  const toItineraryDateInput = outlet.querySelector('#to-itinerary-date');
  const toItineraryErrorText = outlet.querySelector('#to-itinerary-error-text');
  const toItineraryCancelButton = outlet.querySelector('#to-itinerary-cancel');

  let saveTimer = null;
  let lastSavedValue = '';
  // 「→しおりへ」は日付選択を挟むため、選択範囲をボタン押下時点で保持しておく。
  let pendingItineraryRange = null;

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

  async function loadScratch() {
    try {
      const trip = await getDocument(tripPath);
      if (!trip) {
        navigate('#/trips');
        return;
      }
      lastSavedValue = trip.scratchText || '';
      scratchTextarea.value = lastSavedValue;
    } catch (error) {
      console.error(error);
      errorText.textContent = '雑多メモの取得に失敗しました。時間をおいて再度お試しください。';
    } finally {
      scratchTextarea.disabled = false;
    }
  }

  function getSelection() {
    const start = scratchTextarea.selectionStart;
    const end = scratchTextarea.selectionEnd;
    if (start === end) return null;
    return { start, end, text: scratchTextarea.value.slice(start, end) };
  }

  // 選択範囲だけをローカルの値から取り除き、保存済みとして即座に確定する
  // (デバウンス待ちにせず、振り分け操作の一部として同期的に保存を確定させるため)。
  function removeSelectionLocally(selection) {
    const newValue = scratchTextarea.value.slice(0, selection.start) + scratchTextarea.value.slice(selection.end);
    scratchTextarea.value = newValue;
    return newValue;
  }

  const onToNotesClick = async () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = '企画メモへ移動するテキストを選択してください。';
      return;
    }

    toNotesButton.disabled = true;
    try {
      const trip = await getDocument(tripPath);
      const currentNotes = trip?.planningNotesText || '';
      const separator = currentNotes && !currentNotes.endsWith('\n') ? '\n' : '';
      const newNotes = `${currentNotes}${separator}${selection.text}`;
      const newScratchValue = removeSelectionLocally(selection);

      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await updateDocument(tripPath, {
        planningNotesText: newNotes,
        scratchText: newScratchValue,
      });
      lastSavedValue = newScratchValue;
      savedText.textContent = '企画メモへ移動しました。';
    } catch (error) {
      console.error(error);
      errorText.textContent = '企画メモへの移動に失敗しました。時間をおいて再度お試しください。';
    } finally {
      toNotesButton.disabled = false;
    }
  };
  toNotesButton.addEventListener('click', onToNotesClick);

  const onToItineraryClick = () => {
    errorText.textContent = '';
    const selection = getSelection();
    if (!selection) {
      errorText.textContent = 'しおりへ移動するテキストを選択してください。';
      return;
    }
    pendingItineraryRange = selection;
    toItineraryErrorText.textContent = '';
    toItineraryDateInput.value = '';
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

    const date = toItineraryDateInput.value;
    if (!date) {
      toItineraryErrorText.textContent = '日付を選択してください。';
      return;
    }

    const submitButton = toItineraryForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await addDocument(itemsPath, {
        title: pendingItineraryRange.text,
        date,
        time: '',
        locationUrl: '',
        note: '',
        addedBy: session.name,
      });

      const newScratchValue = removeSelectionLocally(pendingItineraryRange);
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      await updateDocument(tripPath, { scratchText: newScratchValue });
      lastSavedValue = newScratchValue;

      pendingItineraryRange = null;
      toItineraryForm.hidden = true;
      savedText.textContent = 'しおりへ移動しました。';
    } catch (error) {
      console.error(error);
      toItineraryErrorText.textContent = 'しおりへの追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  toItineraryForm.addEventListener('submit', onToItinerarySubmit);

  loadScratch();

  return () => {
    scratchTextarea.removeEventListener('input', onScratchInput);
    toNotesButton.removeEventListener('click', onToNotesClick);
    toItineraryButton.removeEventListener('click', onToItineraryClick);
    toItineraryCancelButton.removeEventListener('click', onToItineraryCancel);
    toItineraryForm.removeEventListener('submit', onToItinerarySubmit);
    // タブ離脱時、デバウンス待ちの未保存分があれば取りこぼさないよう即座に保存する。
    flushSave();
  };
}
