// G. 宿泊画面(宿泊候補部分)
// 宿泊候補の追加(URL・メモ)と一覧表示を行う。投票機能は持たない
// (docs/requirements.md 7-3参照。決定は口頭・Discord等で行う想定)。
// 確定宿泊(confirmedStays)は別タスクで実装する。
// データモデルはdocs/firestore-design.md「lodgingCandidates」参照。
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

const candidatesPath = `groups/${session.groupCode}/trips/${tripId}/lodgingCandidates`;

const candidateForm = document.getElementById('candidate-form');
const urlInput = document.getElementById('candidate-url');
const noteInput = document.getElementById('candidate-note');
const errorText = document.getElementById('candidate-error-text');
const candidateList = document.getElementById('candidate-list');
const submitButton = candidateForm.querySelector('button[type="submit"]');

// 初回一覧取得が終わるまで投稿を止める(pages/notes.jsと同じ理由。取得順序の競合を避けるため)。
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

candidateForm.addEventListener('submit', async (event) => {
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
    // pages/notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
    currentCandidates = [...currentCandidates, { id, url, note, addedBy: session.name }];
    renderCandidates(currentCandidates);
  } catch (error) {
    console.error(error);
    errorText.textContent = '宿泊候補の追加に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

loadCandidates();
