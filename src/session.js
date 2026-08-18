// グループ参加セッション(合言葉・名前)をブラウザに保持する。
// Firestoreへの読み書きは行わない(それは src/firestore.js の責務)。
const STORAGE_KEY = 'trip-planner:session';

export function saveSession({ groupCode, name }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ groupCode, name }));
}

export function loadSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
