// D. 企画メモ画面
// 旅行が固まる前の「やりたいこと」の書き溜め。メモの追加・一覧表示(新しい順)を行う。
// データモデルはdocs/firestore-design.md「planningNotes」参照。
import { loadSession } from '../src/session.js';
import { addDocument, listCollection, serverTimestamp } from '../src/firestore.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}

const tripId = new URLSearchParams(window.location.search).get('tripId');
if (!tripId) {
  window.location.href = 'trips.html';
}

document.getElementById('back-link').href = `trip.html?id=${encodeURIComponent(tripId)}`;

const notesPath = `groups/${session.groupCode}/trips/${tripId}/planningNotes`;

const noteForm = document.getElementById('note-form');
const authorInput = document.getElementById('note-author');
const contentInput = document.getElementById('note-content');
const errorText = document.getElementById('note-error-text');
const noteList = document.getElementById('note-list');
const submitButton = noteForm.querySelector('button[type="submit"]');

authorInput.value = session.name;
// 初回一覧取得が終わるまで投稿を止める。先に投稿を許可すると、初回取得の応答が
// 投稿後の楽観的更新より遅れて届いた場合に一覧が古い状態へ巻き戻ってしまうため。
submitButton.disabled = true;

let currentNotes = [];

function formatDate(timestamp) {
  if (!timestamp?.seconds) return '';
  return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
}

function renderNotes(notes) {
  noteList.innerHTML = '';

  if (notes.length === 0) {
    noteList.innerHTML = '<p class="empty-state">まだメモがありません。最初のメモを追加しましょう。</p>';
    return;
  }

  for (const note of notes) {
    const card = document.createElement('div');
    card.className = 'card';

    const meta = document.createElement('p');
    meta.className = 'subtitle';
    meta.textContent = `${note.author} ・ ${formatDate(note.createdAt)}`;

    const content = document.createElement('p');
    content.textContent = note.content;

    card.appendChild(meta);
    card.appendChild(content);
    noteList.appendChild(card);
  }
}

async function loadNotes() {
  try {
    const notes = await listCollection(notesPath);
    notes.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    currentNotes = notes;
    renderNotes(currentNotes);
  } catch (error) {
    console.error(error);
    errorText.textContent = 'メモの取得に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
}

noteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorText.textContent = '';

  const author = authorInput.value.trim();
  const content = contentInput.value.trim();
  if (!author || !content) {
    errorText.textContent = '名前とメモの両方を入力してください。';
    return;
  }

  submitButton.disabled = true;
  try {
    await addDocument(notesPath, {
      author,
      content,
      createdAt: serverTimestamp(),
    });
    contentInput.value = '';
    // 追加直後の一覧再取得は、初回ロードとの応答順序次第で古い結果に上書きされる
    // 競合が起きうるため、再取得せずローカルの一覧に直接追加して描画する。
    currentNotes = [{ author, content, createdAt: { seconds: Date.now() / 1000 } }, ...currentNotes];
    renderNotes(currentNotes);
  } catch (error) {
    console.error(error);
    errorText.textContent = 'メモの追加に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

loadNotes();
