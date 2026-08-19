// D. 企画メモタブビュー(SPA)
// 旅行1件につき1つの共有テキスト(trips/{tripId}.planningNotesText)を、みんなで
// 自由に書き足していく(hackmd的な1枚メモ)。入力はデバウンスして自動保存する。
// 同時編集時の競合(後勝ち上書き)は許容する(docs/screens.md「設計判断」参照)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { subscribeToDocument, updateDocument } from '../firestore.js';

const SAVE_DEBOUNCE_MS = 1200;

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const tripPath = `groups/${session.groupCode}/trips/${tripId}`;

  outlet.innerHTML = `
    <p class="subtitle">旅行が固まる前の「やりたいこと」を、みんなで自由に書き足していきましょう。入力は自動的に保存されます。</p>

    <div class="card card-dark">
      <textarea id="planning-notes" rows="16" placeholder="ここに自由に書き込んでください..." disabled></textarea>
      <p class="error-text" id="notes-error-text"></p>
      <p class="copy-feedback" id="notes-saved-text"></p>
    </div>
  `;

  const notesTextarea = outlet.querySelector('#planning-notes');
  const errorText = outlet.querySelector('#notes-error-text');
  const savedText = outlet.querySelector('#notes-saved-text');

  let saveTimer = null;
  let lastSavedValue = '';

  async function flushSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const value = notesTextarea.value;
    if (value === lastSavedValue) return;

    errorText.textContent = '';
    try {
      await updateDocument(tripPath, { planningNotesText: value });
      lastSavedValue = value;
      savedText.textContent = '保存しました。';
    } catch (error) {
      console.error(error);
      errorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onNotesInput = () => {
    savedText.textContent = '';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
  };
  notesTextarea.addEventListener('input', onNotesInput);

  // リアルタイム同期(docs/ROADMAP.md「第8期」参照)。他の参加者の更新を購読し、
  // 自分が編集中(未保存の変更がある、またはテキストエリアにフォーカス中)の間は
  // 上書きしない(入力中のカーソル位置・未保存分を壊さないため)。
  let isFirstSnapshot = true;
  const unsubscribe = subscribeToDocument(
    tripPath,
    (trip) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        if (!trip) {
          navigate('#/trips');
          return;
        }
        lastSavedValue = trip.planningNotesText || '';
        notesTextarea.value = lastSavedValue;
        notesTextarea.disabled = false;
        return;
      }

      const remoteValue = trip?.planningNotesText || '';
      const hasUnsavedLocalEdit = saveTimer !== null;
      const isFocused = document.activeElement === notesTextarea;
      if (hasUnsavedLocalEdit || isFocused || remoteValue === lastSavedValue) return;
      lastSavedValue = remoteValue;
      notesTextarea.value = remoteValue;
    },
    (error) => {
      console.error(error);
      errorText.textContent = 'メモの取得に失敗しました。時間をおいて再度お試しください。';
      notesTextarea.disabled = false;
    },
  );

  return () => {
    notesTextarea.removeEventListener('input', onNotesInput);
    unsubscribe();
    // タブ離脱時、デバウンス待ちの未保存分があれば取りこぼさないよう即座に保存する。
    flushSave();
  };
}
