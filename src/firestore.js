// Firestoreへの読み書き用共通モジュール。コレクション構造はdocs/firestore-design.mdを参照。
// UIのDOM操作コードはこのモジュールを経由し、Firebase SDKを直接呼び出さないこと。
import { db } from './firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

export async function getDocument(path) {
  const snapshot = await getDoc(doc(db, path));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function setDocument(path, data) {
  await setDoc(doc(db, path), data);
}

// ドキュメントが無ければ作成、あれば指定フィールドのみマージする(既存フィールドを
// 消さない)。docs/firestore-design.md「日程調整(scheduleEntries)」のように、複数人が
// 同じドキュメントへ同時に書き込む場合はこちらを使う。
export async function setDocumentMerged(path, data) {
  await setDoc(doc(db, path), data, { merge: true });
}

export async function updateDocument(path, data) {
  await updateDoc(doc(db, path), data);
}

// 配列フィールドへの重複なし追記(例: groups/{code}のmembers)。
// 同じ値を複数回渡しても配列に重複追加されない(arrayUnionの仕様)。
export async function addToArray(path, field, value) {
  await updateDoc(doc(db, path), { [field]: arrayUnion(value) });
}

export async function addDocument(collectionPath, data) {
  const ref = await addDoc(collection(db, collectionPath), data);
  return ref.id;
}

export async function listCollection(collectionPath) {
  const snapshot = await getDocs(collection(db, collectionPath));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

// 投票・回答のマップキーに「名前」をそのまま使うと、updateDocumentのドット記法が
// パスの区切りとして解釈されたり、Firestoreで使えない文字が含まれたりする恐れがある
// (docs/firestore-design.md「未確定・要注意点」参照)ため、キーとして使う前に軽く置換する。
export function sanitizeMapKey(key) {
  return key.replace(/[.$/[\]#]/g, '_');
}

export { serverTimestamp };
