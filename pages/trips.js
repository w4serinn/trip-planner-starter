// B. 旅行一覧画面
// グループ内の旅行一覧表示・新規旅行作成を行う。データモデルはdocs/firestore-design.md参照。
import { loadSession } from '../src/session.js';
import { addDocument, listCollection, serverTimestamp } from '../src/firestore.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}

document.getElementById('group-subtitle').textContent = `${session.name}さんとして参加中`;

const tripList = document.getElementById('trip-list');
const errorText = document.getElementById('error-text');
const createButton = document.getElementById('create-trip');
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
    link.href = `trip.html?id=${encodeURIComponent(trip.id)}`;

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

createButton.addEventListener('click', async () => {
  errorText.textContent = '';
  createButton.disabled = true;
  try {
    const tripId = await addDocument(tripsPath, {
      name: '新しい旅行',
      createdAt: serverTimestamp(),
    });
    window.location.href = `trip.html?id=${encodeURIComponent(tripId)}`;
  } catch (error) {
    console.error(error);
    errorText.textContent = '旅行の作成に失敗しました。時間をおいて再度お試しください。';
    createButton.disabled = false;
  }
});

loadTrips();
