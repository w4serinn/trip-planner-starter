// E. 行き先決め画面
// 候補地の追加、★1〜5投票(自分の投票状態の表示)、平均スコアによる自動ランキング、
// 投票者一覧の表示を行う。データモデルはdocs/firestore-design.md「destinations」参照。
import { loadSession } from '../src/session.js';
import {
  addDocument,
  listCollection,
  updateDocument,
  serverTimestamp,
  sanitizeMapKey,
} from '../src/firestore.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}

const tripId = new URLSearchParams(window.location.search).get('tripId');
if (!tripId) {
  window.location.href = 'trips.html';
}

document.getElementById('back-link').href = `trip.html?id=${encodeURIComponent(tripId)}`;

const destinationsPath = `groups/${session.groupCode}/trips/${tripId}/destinations`;
const myVoterKey = sanitizeMapKey(session.name);

const destinationForm = document.getElementById('destination-form');
const nameInput = document.getElementById('destination-name');
const noteInput = document.getElementById('destination-note');
const errorText = document.getElementById('destination-error-text');
const destinationList = document.getElementById('destination-list');
const submitButton = destinationForm.querySelector('button[type="submit"]');

// 初回一覧取得が終わるまで投稿を止める(pages/notes.jsと同じ理由。取得順序の競合を避けるため)。
submitButton.disabled = true;

let currentDestinations = [];

function averageScore(votes) {
  const scores = Object.values(votes || {});
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function renderDestinations(destinations) {
  destinationList.innerHTML = '';

  if (destinations.length === 0) {
    destinationList.innerHTML = '<p class="empty-state">まだ候補地がありません。最初の候補を追加しましょう。</p>';
    return;
  }

  const ranked = [...destinations].sort((a, b) => averageScore(b.votes) - averageScore(a.votes));

  ranked.forEach((destination, index) => {
    const votes = destination.votes || {};
    const avg = averageScore(votes);
    const myScore = votes[myVoterKey] || 0;
    const voterCount = Object.keys(votes).length;

    const card = document.createElement('div');
    card.className = 'card';

    const heading = document.createElement('h3');
    heading.textContent = `${index + 1}位 ${destination.name}`;
    card.appendChild(heading);

    if (destination.note) {
      const note = document.createElement('p');
      note.className = 'subtitle';
      note.textContent = destination.note;
      card.appendChild(note);
    }

    const scoreText = document.createElement('p');
    scoreText.textContent = `平均スコア: ${voterCount > 0 ? avg.toFixed(1) : '未投票'} (${voterCount}人)`;
    card.appendChild(scoreText);

    const starRow = document.createElement('div');
    starRow.className = 'star-row';
    for (let score = 1; score <= 5; score += 1) {
      const starButton = document.createElement('button');
      starButton.type = 'button';
      starButton.className = 'star-button';
      starButton.textContent = score <= myScore ? '★' : '☆';
      starButton.setAttribute('aria-label', `${score}点で投票`);
      starButton.addEventListener('click', () => castVote(destination.id, score));
      starRow.appendChild(starButton);
    }
    card.appendChild(starRow);

    const voters = Object.entries(votes);
    if (voters.length > 0) {
      const voterText = document.createElement('p');
      voterText.className = 'subtitle';
      voterText.textContent = voters.map(([voter, score]) => `${voter}: ★${score}`).join(' / ');
      card.appendChild(voterText);
    }

    destinationList.appendChild(card);
  });
}

async function loadDestinations() {
  try {
    currentDestinations = await listCollection(destinationsPath);
    renderDestinations(currentDestinations);
  } catch (error) {
    console.error(error);
    errorText.textContent = '候補地の取得に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
}

async function castVote(destinationId, score) {
  errorText.textContent = '';
  try {
    await updateDocument(`${destinationsPath}/${destinationId}`, {
      [`votes.${myVoterKey}`]: score,
    });
    const target = currentDestinations.find((destination) => destination.id === destinationId);
    if (target) {
      target.votes = { ...(target.votes || {}), [myVoterKey]: score };
      renderDestinations(currentDestinations);
    }
  } catch (error) {
    console.error(error);
    errorText.textContent = '投票に失敗しました。時間をおいて再度お試しください。';
  }
}

destinationForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorText.textContent = '';

  const name = nameInput.value.trim();
  const note = noteInput.value.trim();
  if (!name) {
    errorText.textContent = '候補地名を入力してください。';
    return;
  }

  submitButton.disabled = true;
  try {
    const id = await addDocument(destinationsPath, {
      name,
      note,
      addedBy: session.name,
      addedAt: serverTimestamp(),
      votes: {},
    });
    nameInput.value = '';
    noteInput.value = '';
    // notes.jsと同様、再取得せずローカルの一覧へ楽観的に追加する。
    currentDestinations = [...currentDestinations, { id, name, note, addedBy: session.name, votes: {} }];
    renderDestinations(currentDestinations);
  } catch (error) {
    console.error(error);
    errorText.textContent = '候補地の追加に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

loadDestinations();
