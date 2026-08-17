// C. 旅行詳細トップ画面
// この段階では画面遷移の骨組みのみを実装する。旅行データの取得・編集や
// D〜H各機能画面へのリンク(Firestore連携)は別タスク(docs/ROADMAP.md「3. C. 旅行詳細トップ画面」)
// で実装する。
import { loadSession } from '../src/session.js';

const session = loadSession();
if (!session) {
  window.location.href = 'index.html';
}
