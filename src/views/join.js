// A. 参加ビュー(SPA)
// 既存グループへの参加(groups/{code}のget・membersへの追記)と、
// 新規グループ作成(合言葉の発行・グループドキュメント作成)を行う。
// 既に参加済みなら旅行一覧へ自動遷移する(docs/screens.md「画面遷移」参照)。
// データモデル・セキュリティ方針はdocs/firestore-design.md参照。
import { navigate } from '../router.js';
import { saveSession, loadSession } from '../session.js';
import { getDocument, setDocument, addToArray, serverTimestamp } from '../firestore.js';
import { generatePassphrase } from '../passphrase.js';
import { icons } from '../icons.js';

const MAX_CODE_ATTEMPTS = 5;
const normalizeCode = (code) => code.trim().toUpperCase();

export function mount(outlet) {
  if (loadSession()) {
    navigate('#/trips');
    return undefined;
  }

  outlet.innerHTML = `
    <p class="subtitle">名前と合言葉を入力して、グループに入りましょう。</p>

    <div class="card">
      <form id="join-form" novalidate>
        <div class="field">
          <label for="name">名前</label>
          <input type="text" id="name" name="name" autocomplete="name" required />
        </div>
        <div class="field">
          <label for="group-code">合言葉</label>
          <input type="text" id="group-code" name="groupCode" autocomplete="off" required />
        </div>
        <p class="error-text" id="error-text"></p>
        <button type="submit">参加する</button>
      </form>
    </div>

    <div class="divider"><span>はじめての方</span></div>

    <section>
      <p class="subtitle">合言葉がまだ無い場合、ここで新しいグループを作れます。</p>
      <form id="create-form" novalidate>
        <div class="field">
          <label for="create-name">名前</label>
          <input type="text" id="create-name" name="createName" autocomplete="name" required />
        </div>
        <div class="field">
          <label for="creator-secret">作成用合言葉</label>
          <input type="text" id="creator-secret" name="creatorSecret" autocomplete="off" required />
        </div>
        <p class="error-text" id="create-error-text"></p>
        <button type="submit" class="btn-secondary">${icons.plus}<span>新しいグループを作る</span></button>
      </form>

      <div class="card" id="created-group" hidden>
        <p class="subtitle">グループを作成しました。この合言葉をメンバーに共有してください。</p>
        <p class="passphrase" id="created-code"></p>
        <button type="button" id="copy-code">合言葉をコピーする</button>
        <p class="copy-feedback" id="copy-feedback"></p>
        <button type="button" id="proceed-to-trips">旅行一覧へ進む</button>
      </div>
    </section>
  `;

  const joinForm = outlet.querySelector('#join-form');
  const errorText = outlet.querySelector('#error-text');

  const onJoinSubmit = async (event) => {
    event.preventDefault();
    errorText.textContent = '';

    const name = outlet.querySelector('#name').value.trim();
    const groupCode = normalizeCode(outlet.querySelector('#group-code').value);

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
      navigate('#/trips');
    } catch (error) {
      console.error(error);
      errorText.textContent = '通信に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  joinForm.addEventListener('submit', onJoinSubmit);

  const createForm = outlet.querySelector('#create-form');
  const createErrorText = outlet.querySelector('#create-error-text');
  const createdGroup = outlet.querySelector('#created-group');
  const createdCode = outlet.querySelector('#created-code');
  const copyButton = outlet.querySelector('#copy-code');
  const copyFeedback = outlet.querySelector('#copy-feedback');
  const proceedButton = outlet.querySelector('#proceed-to-trips');

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

  const onCreateSubmit = async (event) => {
    event.preventDefault();
    createErrorText.textContent = '';

    const name = outlet.querySelector('#create-name').value.trim();
    const creatorSecret = outlet.querySelector('#creator-secret').value;
    if (!name || !creatorSecret) {
      createErrorText.textContent = '名前と作成用合言葉の両方を入力してください。';
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
        creatorSecret,
      });

      createdSession = { groupCode, name };
      createdCode.textContent = groupCode;
      createForm.hidden = true;
      createdGroup.hidden = false;
    } catch (error) {
      console.error(error);
      if (error.code === 'permission-denied') {
        createErrorText.textContent = '作成用合言葉が正しくありません。';
      } else {
        createErrorText.textContent = '通信に失敗しました。時間をおいて再度お試しください。';
      }
    } finally {
      submitButton.disabled = false;
    }
  };
  createForm.addEventListener('submit', onCreateSubmit);

  const onCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(createdCode.textContent);
      copyFeedback.textContent = 'コピーしました。';
    } catch (error) {
      console.error(error);
      copyFeedback.textContent = 'コピーできませんでした。お手数ですが手動で選択してコピーしてください。';
    }
  };
  copyButton.addEventListener('click', onCopyClick);

  const onProceedClick = () => {
    if (!createdSession) return;
    saveSession(createdSession);
    navigate('#/trips');
  };
  proceedButton.addEventListener('click', onProceedClick);

  return () => {
    joinForm.removeEventListener('submit', onJoinSubmit);
    createForm.removeEventListener('submit', onCreateSubmit);
    copyButton.removeEventListener('click', onCopyClick);
    proceedButton.removeEventListener('click', onProceedClick);
  };
}
