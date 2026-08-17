// A. 参加画面
// この段階では画面遷移の骨組みのみを実装する。実際のグループ作成/参加(Firestore連携)は
// 別タスク(docs/ROADMAP.md「1. A. 参加画面」)で実装する。
import { saveSession } from '../src/session.js';

const form = document.getElementById('join-form');
const errorText = document.getElementById('error-text');

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const groupCode = document.getElementById('group-code').value.trim();

  if (!name || !groupCode) {
    errorText.textContent = '名前と合言葉の両方を入力してください。';
    return;
  }

  saveSession({ groupCode, name });
  window.location.href = 'trips.html';
});
