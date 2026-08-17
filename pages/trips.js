// B. 旅行一覧画面
// この段階では画面遷移の骨組みのみを実装する。旅行一覧の取得・新規作成(Firestore連携)は
// 別タスク(docs/ROADMAP.md「2. B. 旅行一覧画面」)で実装する。
import { loadSession } from '../src/session.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
} else {
  document.getElementById('group-subtitle').textContent = `${session.name}さんとして参加中`;
}

const tripList = document.getElementById('trip-list');
tripList.innerHTML = '<p class="empty-state">まだ旅行がありません。「＋ 新しい旅行を作る」から始めましょう。</p>';

document.getElementById('create-trip').addEventListener('click', () => {
  window.location.href = 'trip.html';
});
