// A. 参加画面
// 既存グループへの参加(groups/{code}のget・membersへの追記)と、
// 新規グループ作成(合言葉の発行・グループドキュメント作成)を行う。
// データモデル・セキュリティ方針はdocs/firestore-design.md参照。
import { saveSession } from '../src/session.js';
import { getDocument, setDocument, addToArray, serverTimestamp } from '../src/firestore.js';
import { generatePassphrase } from '../src/passphrase.js';

const MAX_CODE_ATTEMPTS = 5;
const normalizeCode = (code) => code.trim().toUpperCase();

// --- 既存グループへの参加 ---
const joinForm = document.getElementById('join-form');
const errorText = document.getElementById('error-text');

joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorText.textContent = '';

  const name = document.getElementById('name').value.trim();
  const groupCode = normalizeCode(document.getElementById('group-code').value);

  if (!name || !groupCode) {
    errorText.textContent = '名前と合言葉の両方を入力してください。';
    return;
  }

  const submitButton = joinForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const group = await getDocument(`groups/${groupCode}`);
    if (!group) {
      errorText.textContent = 'そのグループコードは見つかりません。合言葉を確認してください。';
      return;
    }

    await addToArray(`groups/${groupCode}`, 'members', name);
    saveSession({ groupCode, name });
    window.location.href = 'trips.html';
  } catch (error) {
    console.error(error);
    errorText.textContent = '通信に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

// --- 新規グループ作成 ---
const createForm = document.getElementById('create-form');
const createErrorText = document.getElementById('create-error-text');
const createdGroup = document.getElementById('created-group');
const createdCode = document.getElementById('created-code');
const copyButton = document.getElementById('copy-code');
const copyFeedback = document.getElementById('copy-feedback');
const proceedButton = document.getElementById('proceed-to-trips');

let createdSession = null;

// 合言葉(ドキュメントID)の衝突をごく低確率で避けるため、既存チェックしてから作成する。
async function issueUnusedGroupCode() {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const candidate = generatePassphrase();
    // 前回の結果を確認してから次の候補を試す必要があるため直列に待つ。
    const existing = await getDocument(`groups/${candidate}`);
    if (!existing) {
      return candidate;
    }
  }
  return null;
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  createErrorText.textContent = '';

  const name = document.getElementById('create-name').value.trim();
  if (!name) {
    createErrorText.textContent = '名前を入力してください。';
    return;
  }

  const submitButton = createForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const groupCode = await issueUnusedGroupCode();
    if (!groupCode) {
      createErrorText.textContent = '合言葉の発行に失敗しました。もう一度お試しください。';
      return;
    }

    await setDocument(`groups/${groupCode}`, {
      createdAt: serverTimestamp(),
      members: [name],
    });

    createdSession = { groupCode, name };
    createdCode.textContent = groupCode;
    createForm.hidden = true;
    createdGroup.hidden = false;
  } catch (error) {
    console.error(error);
    createErrorText.textContent = '通信に失敗しました。時間をおいて再度お試しください。';
  } finally {
    submitButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(createdCode.textContent);
    copyFeedback.textContent = 'コピーしました。';
  } catch (error) {
    console.error(error);
    copyFeedback.textContent = 'コピーできませんでした。お手数ですが手動で選択してコピーしてください。';
  }
});

proceedButton.addEventListener('click', () => {
  if (!createdSession) return;
  saveSession(createdSession);
  window.location.href = 'trips.html';
});
