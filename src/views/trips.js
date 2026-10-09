// B. 旅行一覧ビュー(SPA)
// グループ内の旅行一覧表示・新規旅行作成を行う。データモデルはdocs/firestore-design.md参照。
// 未参加なら参加画面へ自動遷移する(docs/screens.md「画面遷移」参照)。
import { navigate } from '../router.js';
import { loadSession, clearSession } from '../session.js';
import { getDocument, updateDocument, addDocument, listCollection, serverTimestamp } from '../firestore.js';
import { icons } from '../icons.js';

export function mount(outlet) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  outlet.innerHTML = `
    <div class="trip-name-row card card-dark">
      <h2 id="group-name"></h2>
      <button type="button" id="edit-group-name-button" class="btn-secondary">編集</button>
    </div>
    <form id="edit-group-name-form" class="card name-form" novalidate hidden>
      <div class="name-form-row">
        <label for="group-name-input">グループ名（任意）</label>
        <input type="text" id="group-name-input" class="trip-name-input" name="groupName" />
        <button type="submit">保存</button>
        <button type="button" id="cancel-group-name-button" class="btn-secondary">キャンセル</button>
      </div>
      <p class="error-text" id="group-name-error-text"></p>
    </form>

    <div class="session-row">
      <p class="session-chip" id="group-subtitle">${session.name}さんとして参加中</p>
      <button type="button" id="leave-group" class="btn-secondary">グループを変える</button>
    </div>
    <div id="trip-list" class="card-grid"></div>
    <p class="error-text" id="error-text"></p>
    <button type="button" id="create-trip">${icons.plus}<span>新しい旅行を作る</span></button>
  `;

  const tripList = outlet.querySelector('#trip-list');
  const errorText = outlet.querySelector('#error-text');
  const createButton = outlet.querySelector('#create-trip');
  const tripsPath = `groups/${session.groupCode}/trips`;
  const groupPath = `groups/${session.groupCode}`;

  const groupNameHeading = outlet.querySelector('#group-name');
  const editGroupNameButton = outlet.querySelector('#edit-group-name-button');
  const editGroupNameForm = outlet.querySelector('#edit-group-name-form');
  const groupNameInput = outlet.querySelector('#group-name-input');
  const groupNameErrorText = outlet.querySelector('#group-name-error-text');
  const cancelGroupNameButton = outlet.querySelector('#cancel-group-name-button');

  let currentGroupName = '';

  async function loadGroup() {
    try {
      const group = await getDocument(groupPath);
      currentGroupName = group?.name || '';
      groupNameHeading.textContent = currentGroupName || session.groupCode;
    } catch (error) {
      console.error(error);
      groupNameHeading.textContent = session.groupCode;
    }
  }

  const onEditGroupNameClick = () => {
    groupNameInput.value = currentGroupName;
    groupNameErrorText.textContent = '';
    editGroupNameForm.hidden = false;
    groupNameInput.focus();
  };
  editGroupNameButton.addEventListener('click', onEditGroupNameClick);

  const onCancelGroupNameClick = () => {
    editGroupNameForm.hidden = true;
  };
  cancelGroupNameButton.addEventListener('click', onCancelGroupNameClick);

  const onEditGroupNameSubmit = async (event) => {
    event.preventDefault();
    groupNameErrorText.textContent = '';

    const newName = groupNameInput.value.trim();
    const submitButton = editGroupNameForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await updateDocument(groupPath, { name: newName });
      currentGroupName = newName;
      groupNameHeading.textContent = newName || session.groupCode;
      editGroupNameForm.hidden = true;
    } catch (error) {
      console.error(error);
      groupNameErrorText.textContent = '保存に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  editGroupNameForm.addEventListener('submit', onEditGroupNameSubmit);

  function renderTrips(trips) {
    tripList.innerHTML = '';

    if (trips.length === 0) {
      tripList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだ旅行がありません。「＋ 新しい旅行を作る」から始めましょう。</p></div>`;
      return;
    }

    for (const trip of trips) {
      const link = document.createElement('a');
      link.className = 'card card-link trip-card trip-list-card';
      link.href = `#/trips/${encodeURIComponent(trip.id)}`;

      const textWrap = document.createElement('div');

      const name = document.createElement('h2');
      name.textContent = trip.name || '名称未設定の旅行';
      textWrap.appendChild(name);

      if (trip.createdAt?.seconds) {
        const meta = document.createElement('p');
        meta.className = 'subtitle';
        meta.textContent = `作成日: ${new Date(trip.createdAt.seconds * 1000).toLocaleDateString('ja-JP')}`;
        textWrap.appendChild(meta);
      }

      link.appendChild(textWrap);
      link.insertAdjacentHTML('beforeend', `<span class="trip-card-chevron">${icons.chevron}</span>`);

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

  const leaveButton = outlet.querySelector('#leave-group');
  const onLeaveClick = () => {
    if (!window.confirm('今のグループから抜けて、別の合言葉で参加し直しますか?')) return;
    clearSession();
    navigate('#/');
  };
  leaveButton.addEventListener('click', onLeaveClick);

  loadGroup();
  loadTrips();

  return () => {
    createButton.removeEventListener('click', onCreateClick);
    leaveButton.removeEventListener('click', onLeaveClick);
    editGroupNameButton.removeEventListener('click', onEditGroupNameClick);
    cancelGroupNameButton.removeEventListener('click', onCancelGroupNameClick);
    editGroupNameForm.removeEventListener('submit', onEditGroupNameSubmit);
  };
}
