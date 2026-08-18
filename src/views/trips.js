// B. 旅行一覧ビュー(SPA)
// グループ内の旅行一覧表示・新規旅行作成を行う。データモデルはdocs/firestore-design.md参照。
// 未参加なら参加画面へ自動遷移する(docs/screens.md「画面遷移」参照)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, listCollection, serverTimestamp } from '../firestore.js';

export function mount(outlet) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  outlet.innerHTML = `
    <p class="subtitle" id="group-subtitle">${session.name}さんとして参加中</p>
    <div id="trip-list"></div>
    <p class="error-text" id="error-text"></p>
    <button type="button" id="create-trip">＋ 新しい旅行を作る</button>
  `;

  const tripList = outlet.querySelector('#trip-list');
  const errorText = outlet.querySelector('#error-text');
  const createButton = outlet.querySelector('#create-trip');
  const tripsPath = `groups/${session.groupCode}/trips`;

  function renderTrips(trips) {
    tripList.innerHTML = '';

    if (trips.length === 0) {
      tripList.innerHTML = '<p class="empty-state">まだ旅行がありません。「＋ 新しい旅行を作る」から始めましょう。</p>';
      return;
    }

    for (const trip of trips) {
      const link = document.createElement('a');
      link.className = 'card card-link';
      link.href = `#/trips/${encodeURIComponent(trip.id)}`;

      const name = document.createElement('h2');
      name.textContent = trip.name || '名称未設定の旅行';
      link.appendChild(name);

      tripList.appendChild(link);
    }
  }

  async function loadTrips() {
    try {
      const trips = await listCollection(tripsPath);
      trips.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      renderTrips(trips);
    } catch (error) {
      console.error(error);
      errorText.textContent = '旅行一覧の取得に失敗しました。時間をおいて再度お試しください。';
    }
  }

  const onCreateClick = async () => {
    errorText.textContent = '';
    createButton.disabled = true;
    try {
      const tripId = await addDocument(tripsPath, {
        name: '新しい旅行',
        createdAt: serverTimestamp(),
      });
      navigate(`#/trips/${encodeURIComponent(tripId)}`);
    } catch (error) {
      console.error(error);
      errorText.textContent = '旅行の作成に失敗しました。時間をおいて再度お試しください。';
      createButton.disabled = false;
    }
  };
  createButton.addEventListener('click', onCreateClick);

  loadTrips();

  return () => {
    createButton.removeEventListener('click', onCreateClick);
  };
}
