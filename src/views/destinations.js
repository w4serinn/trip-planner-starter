// E. 行き先決めタブビュー(SPA)
// 候補地の追加、★1〜5投票(自分の投票状態の表示)、平均スコアによる自動ランキング、
// 投票者一覧の表示を行う。データモデルはdocs/firestore-design.md「destinations」参照。
// メモ欄はプレーンテキストだが、含まれるURLはリンク化する(docs/ROADMAP.md「65」)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import {
  addDocument,
  subscribeToCollection,
  updateDocument,
  serverTimestamp,
  sanitizeMapKey,
} from '../firestore.js';
import { icons } from '../icons.js';
import { appendLinkifiedText } from '../linkify.js';

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const destinationsPath = `groups/${session.groupCode}/trips/${tripId}/destinations`;
  const myVoterKey = sanitizeMapKey(session.name);

  outlet.innerHTML = `
    <p class="subtitle">候補地を追加し、★1〜5で投票しましょう。平均スコアの高い順に表示されます。</p>

    <button type="button" id="toggle-destination-form" class="btn-secondary">${icons.plus}<span>候補地を追加</span></button>

    <form id="destination-form" novalidate hidden>
      <div class="field">
        <label for="destination-name">候補地名</label>
        <input type="text" id="destination-name" name="name" required />
      </div>
      <div class="field">
        <label for="destination-note">メモ</label>
        <input type="text" id="destination-note" name="note" />
      </div>
      <p class="error-text" id="destination-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-destination-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="destination-list" class="card-grid"></div>
  `;

  const toggleFormButton = outlet.querySelector('#toggle-destination-form');
  const destinationForm = outlet.querySelector('#destination-form');
  const cancelFormButton = outlet.querySelector('#cancel-destination-form');
  const nameInput = outlet.querySelector('#destination-name');
  const noteInput = outlet.querySelector('#destination-note');
  const errorText = outlet.querySelector('#destination-error-text');
  const destinationList = outlet.querySelector('#destination-list');
  const submitButton = destinationForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  function openForm() {
    toggleFormButton.hidden = true;
    destinationForm.hidden = false;
    nameInput.focus();
  }

  function closeForm() {
    destinationForm.hidden = true;
    toggleFormButton.hidden = false;
    errorText.textContent = '';
    nameInput.value = '';
    noteInput.value = '';
  }

  const onToggleFormClick = () => openForm();
  toggleFormButton.addEventListener('click', onToggleFormClick);

  const onCancelFormClick = () => closeForm();
  cancelFormButton.addEventListener('click', onCancelFormClick);

  let currentDestinations = [];

  function averageScore(votes) {
    const scores = Object.values(votes || {});
    if (scores.length === 0) return 0;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  function renderDestinations(destinations) {
    destinationList.innerHTML = '';

    if (destinations.length === 0) {
      destinationList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ候補地がありません。最初の候補を追加しましょう。</p></div>`;
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

      const headingRow = document.createElement('div');
      headingRow.className = 'destination-heading-row';

      const rankBadge = document.createElement('span');
      rankBadge.className = index === 0 && voterCount > 0 ? 'rank-badge rank-badge-top' : 'rank-badge';
      rankBadge.textContent = `${index + 1}位`;
      headingRow.appendChild(rankBadge);

      const heading = document.createElement('h3');
      heading.textContent = destination.name;
      headingRow.appendChild(heading);

      card.appendChild(headingRow);

      if (destination.note) {
        const note = document.createElement('p');
        note.className = 'subtitle';
        appendLinkifiedText(note, destination.note);
        card.appendChild(note);
      }

      const scoreText = document.createElement('p');
      scoreText.textContent = `平均スコア: ${voterCount > 0 ? avg.toFixed(1) : '未投票'} (${voterCount}人)`;
      card.appendChild(scoreText);

      const scoreBar = document.createElement('div');
      scoreBar.className = 'score-bar';
      const scoreBarFill = document.createElement('div');
      scoreBarFill.className = 'score-bar-fill';
      scoreBarFill.style.width = `${Math.max(0, Math.min(100, (avg / 5) * 100))}%`;
      scoreBar.appendChild(scoreBarFill);
      card.appendChild(scoreBar);

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

  // リアルタイム同期(docs/ROADMAP.md「第8期」参照)。以前は追加・投票のたびに
  // ローカルの配列を楽観的に更新していたが、購読による再描画と二重になり
  // ちらつきの原因になるため、ローカル更新はやめて購読の再描画だけに一本化した。
  let isFirstSnapshot = true;
  const unsubscribeDestinations = subscribeToCollection(
    destinationsPath,
    (destinations) => {
      currentDestinations = destinations;
      renderDestinations(currentDestinations);
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        submitButton.disabled = false;
      }
    },
    (error) => {
      console.error(error);
      errorText.textContent = '候補地の取得に失敗しました。時間をおいて再度お試しください。';
      submitButton.disabled = false;
    },
  );

  async function castVote(destinationId, score) {
    errorText.textContent = '';
    try {
      await updateDocument(`${destinationsPath}/${destinationId}`, {
        [`votes.${myVoterKey}`]: score,
      });
    } catch (error) {
      console.error(error);
      errorText.textContent = '投票に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onDestinationSubmit = async (event) => {
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
      await addDocument(destinationsPath, {
        name,
        note,
        addedBy: session.name,
        addedAt: serverTimestamp(),
        votes: {},
      });
      closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = '候補地の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  destinationForm.addEventListener('submit', onDestinationSubmit);

  return () => {
    toggleFormButton.removeEventListener('click', onToggleFormClick);
    cancelFormButton.removeEventListener('click', onCancelFormClick);
    destinationForm.removeEventListener('submit', onDestinationSubmit);
    unsubscribeDestinations();
  };
}
