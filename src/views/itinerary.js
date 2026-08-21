// H. しおりタブビュー(SPA)
// しおり項目の追加・編集・削除(やること名・日付・時間目安(任意)・場所リンク(任意)・
// 移動手段(任意)・メモ(任意))と、日付グルーピング＋各日内での時間順自動ソート表示を行う。
// データモデルはdocs/firestore-design.md「itineraryItems」参照。
// 時間入力は<input type="time">のネイティブUIではなく、「午前/午後」「時(0〜12)」
// 「分(00/15/30/45)」の3セレクトボックスにする(docs/ROADMAP.md「15」)。保存する
// データ形式("HH:MM"の24時間表記文字列)自体は変えない。時間セレクトのロジックは
// src/timeSelect.jsに切り出し、src/views/scratch.jsの簡易フォームと共用する
// (docs/ROADMAP.md「38」)。日付見出しはクリックで開閉できるアコーディオンにし
// (docs/ROADMAP.md「59」)、現在時刻に最も近い未来の予定を強調表示する
// (docs/ROADMAP.md「60」)。移動手段は交通手段の予約調整機能(Won't)とは別の、単なる
// 自由記述メモ(docs/ROADMAP.md「61」・docs/requirements.md5.1参照)。メモ欄は
// プレーンテキストだが、含まれるURLはリンク化する(docs/ROADMAP.md「65」)。
// 同じ日の中で時間未設定の項目が複数あるとき、▲▼ボタンで手動並び替えできる
// (docs/ROADMAP.md「58」。ネイティブのドラッグ&ドロップAPIはモバイルでの対応が
// 弱く、この案件はモバイル中心(docs/requirements.md「6. 非機能要件」)のため、
// タッチ操作でも確実に動く上下ボタン方式にした)。並び順は`order`(数値)フィールドに
// 保存する(docs/firestore-design.md「itineraryItems」参照)。
import { navigate } from '../router.js';
import { loadSession } from '../session.js';
import { addDocument, updateDocument, updateDocumentsBatch, deleteDocument, subscribeToCollection } from '../firestore.js';
import { icons } from '../icons.js';
import { isSafeUrl } from '../url.js';
import { createDatePicker } from '../datePicker.js';
import { HOUR_OPTIONS, MINUTE_OPTIONS, buildTimeString, parseTimeString } from '../timeSelect.js';
import { appendLinkifiedText } from '../linkify.js';
import { createFootprintTrail } from '../footprintTrail.js';

// 時間未入力の項目をその日の最後に並べるための番兵値(実際の"HH:MM"より必ず後ろに来る)。
const NO_TIME_SENTINEL = '99:99';

export function mount(outlet, params) {
  const session = loadSession();
  if (!session) {
    navigate('#/');
    return undefined;
  }

  const { tripId } = params;
  const itemsPath = `groups/${session.groupCode}/trips/${tripId}/itineraryItems`;

  outlet.innerHTML = `
    <p class="subtitle">現地で何をするかを書き貯めましょう。日付ごとにまとまり、各日の中は時間の早い順に並びます。</p>

    <button type="button" id="toggle-item-form" class="btn-secondary">${icons.plus}<span>しおり項目を追加</span></button>

    <form id="item-form" novalidate hidden>
      <div class="field">
        <label for="item-title">やること</label>
        <input type="text" id="item-title" name="title" required />
      </div>
      <div class="field">
        <label>日付</label>
        <div id="item-date-picker"></div>
      </div>
      <div class="field">
        <label for="item-time-ampm">時間目安(任意)</label>
        <div class="time-select-row">
          <select id="item-time-ampm" name="timeAmPm">
            <option value="">--</option>
            <option value="AM">午前</option>
            <option value="PM">午後</option>
          </select>
          <select id="item-time-hour" name="timeHour">
            <option value="">時</option>
            ${HOUR_OPTIONS.map((h) => `<option value="${h}">${h}</option>`).join('')}
          </select>
          <select id="item-time-minute" name="timeMinute">
            <option value="">分</option>
            ${MINUTE_OPTIONS.map((m) => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label for="item-location">場所リンク(任意)</label>
        <input type="url" id="item-location" name="locationUrl" placeholder="https://maps.app.goo.gl/..." />
      </div>
      <div class="field">
        <label for="item-transportation">移動手段(任意)</label>
        <input type="text" id="item-transportation" name="transportation" placeholder="電車で移動、レンタカー等" />
      </div>
      <div class="field">
        <label for="item-note">メモ(任意)</label>
        <input type="text" id="item-note" name="note" />
      </div>
      <p class="error-text" id="item-error-text"></p>
      <div class="button-row">
        <button type="submit">追加する</button>
        <button type="button" id="cancel-item-form" class="btn-secondary">キャンセル</button>
      </div>
    </form>

    <div id="item-list"></div>
  `;

  const toggleFormButton = outlet.querySelector('#toggle-item-form');
  const itemForm = outlet.querySelector('#item-form');
  const cancelFormButton = outlet.querySelector('#cancel-item-form');
  const titleInput = outlet.querySelector('#item-title');
  const datePickerContainer = outlet.querySelector('#item-date-picker');
  const timeAmPmSelect = outlet.querySelector('#item-time-ampm');
  const timeHourSelect = outlet.querySelector('#item-time-hour');
  const timeMinuteSelect = outlet.querySelector('#item-time-minute');
  const locationInput = outlet.querySelector('#item-location');
  const transportationInput = outlet.querySelector('#item-transportation');
  const noteInput = outlet.querySelector('#item-note');
  const errorText = outlet.querySelector('#item-error-text');
  const itemList = outlet.querySelector('#item-list');
  const submitButton = itemForm.querySelector('button[type="submit"]');

  // 初回一覧取得が終わるまで投稿を止める(src/views/notes.jsと同じ理由。取得順序の競合を避けるため)。
  submitButton.disabled = true;

  // 単一選択モード(docs/ROADMAP.md「27」の3つ目のサブタスク)。既存の<input type="date">の
  // 置き換え。
  const datePicker = createDatePicker(datePickerContainer, { mode: 'single' });

  // 編集中の項目ID(docs/ROADMAP.md「39」)。nullなら新規追加モード。
  let editingItemId = null;

  // 直前に▲/▼で並び替えた項目ID(docs/ROADMAP.md「78」)。次のrenderItems呼び出し
  // (Firestoreの購読が新しいorderを届けたタイミング)で該当カードへハイライト
  // 点滅クラスを1回だけ付与し、使い終わったらnullに戻す。
  let justMovedItemId = null;

  function openForm() {
    toggleFormButton.hidden = true;
    itemForm.hidden = false;
    titleInput.focus();
  }

  // 既存項目の内容をフォームへ流し込み、編集モードとして開く。
  // 追加フォームを再利用するため、Firestoreへの書き込み処理(onItemSubmit)は
  // editingItemIdの有無でaddDocument/updateDocumentを切り替える。
  function openFormForEdit(item) {
    editingItemId = item.id;
    submitButton.textContent = '保存する';
    titleInput.value = item.title;
    datePicker.setValue(item.date);
    const { amPm, hour, minute } = parseTimeString(item.time);
    timeAmPmSelect.value = amPm;
    timeHourSelect.value = hour;
    timeMinuteSelect.value = minute;
    locationInput.value = item.locationUrl || '';
    transportationInput.value = item.transportation || '';
    noteInput.value = item.note || '';
    openForm();
  }

  function closeForm() {
    itemForm.hidden = true;
    toggleFormButton.hidden = false;
    errorText.textContent = '';
    titleInput.value = '';
    datePicker.setValue(null);
    timeAmPmSelect.value = '';
    timeHourSelect.value = '';
    timeMinuteSelect.value = '';
    locationInput.value = '';
    transportationInput.value = '';
    noteInput.value = '';
    editingItemId = null;
    submitButton.textContent = '追加する';
  }

  const onToggleFormClick = () => openForm();
  toggleFormButton.addEventListener('click', onToggleFormClick);

  const onCancelFormClick = () => closeForm();
  cancelFormButton.addEventListener('click', onCancelFormClick);

  let currentItems = [];

  // 開閉状態(docs/ROADMAP.md「59」)。閉じている日付の集合。renderItems()呼び出しを
  // またいで状態を保つため、この関数の外側(mountのスコープ)で保持する。
  const collapsedDates = new Set();

  function toggleDateCollapse(date) {
    if (collapsedDates.has(date)) collapsedDates.delete(date);
    else collapsedDates.add(date);
    renderItems(currentItems);
  }

  function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  }

  // 項目の日時をタイムスタンプ化する(時間目安が未入力の項目は「その日のいつか」
  // としてその日の終わり(23:59)扱いにする。一覧表示の並び順(NO_TIME_SENTINEL)と
  // 同じ考え方)。docs/ROADMAP.md「60」「75」で共用する。
  function itemTimestamp(item) {
    return new Date(`${item.date}T${item.time || '23:59'}:00`).getTime();
  }

  // 現在時刻に最も近い未来の予定を探す(docs/ROADMAP.md「60」)。
  function findNextItem(items, now) {
    let next = null;
    let nextTime = Infinity;
    for (const item of items) {
      const time = itemTimestamp(item);
      if (Number.isNaN(time) || time < now) continue;
      if (time < nextTime) {
        next = item;
        nextTime = time;
      }
    }
    return next;
  }

  // 項目間をつなぐ足あと付きの小道(docs/ROADMAP.md「80」)。src/footprintTrail.jsの
  // DOM非依存な軌跡生成ロジックを使い、SVGのマークアップ文字列を組み立てる。
  // 経路(緑の線、--color-successを想定してcurrentColorで継承)・足あと(小道の
  // 進行方向に合わせて回転)ともstroke/fillはcurrentColor経由にし、色そのものは
  // CSS側(.timeline-trail)のcolorプロパティで指定する(トークン経由のルールを守る)。
  // 呼び出しのたびにMath.randomで軌跡を生成し直すため、再描画のたびに形が変わる
  // (「同じ軌跡にならないように」との要望)。
  function buildTrailSvg() {
    // 2026-08-22(docs/ROADMAP.md「85」): 人間から「足跡は緑の線はいらない、
    // 足跡のみを軌跡上に配置」とのフィードバックを受け、軌跡の<path>(線)を
    // 描画しないようにした。src/footprintTrail.jsのpathD算出ロジック自体は
    // 変更していない(足あとの位置・向きは経路上の点から算出するため、
    // 内部的には引き続き使われている。呼び出し側でpathDを使わないだけ)。
    // 2026-08-21(docs/ROADMAP.md「90」): 線を消した後、足あと3件だけでは
    // 「足跡が少なすぎる」との指摘を受け、6件に増やした。
    const { footprints } = createFootprintTrail(Math.random, { footprintCount: 6 });
    const footprintMarks = footprints
      .map(({ x, y, rotation }) => `
        <g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(0.15) translate(-12 -14)">
          <ellipse cx="12" cy="14" rx="4.2" ry="6.2" fill="currentColor" stroke="none" />
          <circle cx="8.4" cy="5.6" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="12" cy="4.4" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="15.6" cy="5.6" r="1.3" fill="currentColor" stroke="none" />
        </g>`)
      .join('');
    return `
      <svg class="timeline-trail" viewBox="0 0 22 100" preserveAspectRatio="none" aria-hidden="true">
        ${footprintMarks}
      </svg>`;
  }

  // 同じ日の中での並び替え(docs/ROADMAP.md「87」、docs/firestore-design.md
  // 「しおり項目の並び替え(全項目対象)」参照)。その日の全項目の`order`が
  // 未設定(＝一度も並び替え/追加操作で触られていない「未着手の日」)なら、
  // 従来通り時刻順(未設定はNO_TIME_SENTINELで末尾)にフォールバックする。
  // それ以外(＝並び替えや、並び替え後の追加で1件でも`order`が振られた
  // 「着手済みの日」)は、時間の有無を問わず`order`昇順で並べる。並び替え・
  // 追加のたびに対象日の全項目へ`order`を振り直すため、同じ日の中で
  // 「一部の項目だけorderがある」という中間状態にはならない。
  function compareItems(a, b) {
    if (a.order == null && b.order == null) {
      return (a.time || NO_TIME_SENTINEL).localeCompare(b.time || NO_TIME_SENTINEL);
    }
    return (a.order ?? 0) - (b.order ?? 0);
  }

  // 表示順(orderedItems)の中で、時刻の前後関係が崩れている項目のIDを集める
  // (docs/ROADMAP.md「87」)。それまでで最も遅い時間より前の時間を持つ項目を
  // 検出する(例: 10:00の項目の後に9:00の項目が来ている場合、9:00の項目側)。
  // renderItems(移動後の警告バッジ表示)とmoveItem(移動前の確認、`92`)の
  // 両方で使う共通ロジック。
  function findTimeInconsistentIds(orderedItems) {
    const ids = new Set();
    let latestSeenTime = null;
    for (const i of orderedItems) {
      if (!i.time) continue;
      if (latestSeenTime !== null && i.time < latestSeenTime) {
        ids.add(i.id);
      } else {
        latestSeenTime = i.time;
      }
    }
    return ids;
  }

  // dayItems(その日のitem一覧、表示順)の中で、指定した項目を1つ上/下
  // (direction: -1 or 1)へ移動する。時間設定の有無を問わずその日の全項目が対象
  // (docs/ROADMAP.md「87」。以前は時間未設定の項目同士でのみ移動できた)。
  // 並び替えのたびに対象全員のorderを0,1,2,...に振り直すことで、既存項目の
  // order未設定(undefined、0扱い)が混在していても一貫した順序に収束させる。
  async function moveItem(dayItems, item, direction) {
    const index = dayItems.findIndex((i) => i.id === item.id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= dayItems.length) return;

    const reordered = [...dayItems];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    // 移動後に時刻の前後矛盾が生じる場合、確定前に警告して続行するか確認する
    // (docs/ROADMAP.md「92」。以前は移動を確定させた後の表示で気付く方式だった)。
    // 矛盾があっても移動自体はブロックしない(`87`の要望通り)ため、確認して
    // 続行できるダイアログにする。
    if (findTimeInconsistentIds(reordered).size > 0) {
      const proceed = window.confirm(
        'この移動を行うと、時間の前後関係が入れ替わってしまう項目が発生します。このまま移動しますか?',
      );
      if (!proceed) return;
    }

    errorText.textContent = '';
    justMovedItemId = item.id;
    try {
      // 複数件のorderを1回のコミットにまとめる(docs/ROADMAP.md「86」)。個別にupdateDocumentを
      // 呼ぶと購読(onSnapshot)側の再描画が複数回走り、ハイライト演出(item-moved-flash)が
      // 次の再描画で即座に塗り替えられて見えなくなる不具合があったため。
      await updateDocumentsBatch(
        reordered.map((i, newOrder) => ({ path: `${itemsPath}/${i.id}`, data: { order: newOrder } })),
      );
      // リアルタイム購読(docs/ROADMAP.md「32」)が新しい値を届けて再描画するため、
      // ここでのローカル更新は行わない。
    } catch (error) {
      console.error(error);
      errorText.textContent = '並び替えの保存に失敗しました。時間をおいて再度お試しください。';
      justMovedItemId = null;
    }
  }

  // 誤操作防止のため、ブラウザ標準の確認ダイアログを挟んでから削除する
  // (docs/ROADMAP.md「39」)。
  const onDeleteItemClick = async (item, deleteButton) => {
    if (!window.confirm(`「${item.title}」を削除しますか?`)) return;
    deleteButton.disabled = true;
    try {
      await deleteDocument(`${itemsPath}/${item.id}`);
      if (editingItemId === item.id) closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = 'しおり項目の削除に失敗しました。時間をおいて再度お試しください。';
      deleteButton.disabled = false;
    }
  };

  function renderItems(items) {
    itemList.innerHTML = '';

    if (items.length === 0) {
      itemList.innerHTML = `<div class="empty-state">${icons.empty}<p>まだしおり項目がありません。最初の項目を追加しましょう。</p></div>`;
      return;
    }

    const now = Date.now();
    const nextItem = findNextItem(items, now);

    const groups = new Map();
    for (const item of items) {
      if (!groups.has(item.date)) groups.set(item.date, []);
      groups.get(item.date).push(item);
    }

    const sortedDates = [...groups.keys()].sort();

    for (const date of sortedDates) {
      const isCollapsed = collapsedDates.has(date);

      const heading = document.createElement('div');
      heading.className = 'itinerary-day-heading';
      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');
      heading.setAttribute('aria-expanded', String(!isCollapsed));
      const headingText = document.createElement('h2');
      headingText.textContent = formatDateLabel(date);
      heading.appendChild(headingText);
      const chevron = document.createElement('span');
      chevron.className = isCollapsed ? 'itinerary-day-chevron itinerary-day-chevron-collapsed' : 'itinerary-day-chevron';
      chevron.innerHTML = icons.chevron;
      heading.appendChild(chevron);
      const onHeadingActivate = (event) => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleDateCollapse(date);
      };
      heading.addEventListener('click', onHeadingActivate);
      heading.addEventListener('keydown', onHeadingActivate);
      itemList.appendChild(heading);

      const dayItems = groups.get(date).sort(compareItems);

      // 手動並び替えの結果、時刻の前後関係が崩れた項目を検出する(docs/ROADMAP.md「87」)。
      // 保存はブロックせず、警告表示のみ(移動前の確認は`92`、moveItem側で行う)。
      const timeWarningIds = findTimeInconsistentIds(dayItems);

      const timeline = document.createElement('div');
      timeline.className = 'timeline';
      timeline.hidden = isCollapsed;

      dayItems.forEach((item, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';

        const isNext = nextItem?.id === item.id;
        const itemTime = itemTimestamp(item);
        const isPast = !isNext && !Number.isNaN(itemTime) && itemTime < now;

        // 2026-08-20(docs/ROADMAP.md「68」): 外部レビューで「丸バッジではなく足あと/
        // 旗のアイコンにする」と提案され、連番の数字バッジから道のりを表すアイコンに
        // 変更した。
        // 2026-08-21(docs/ROADMAP.md「75」): 人間から「次=旗、過去/未来はそれぞれ
        // 別のアイコンに」とのフィードバックを受け、次の予定(flag)・過去(すでに
        // 終わった予定、checkmark)・未来(次の予定より後、waypoint)の3種類に
        // 分けた。footprintは項目間の連結線上の軌跡装飾(`80`)専用にする。
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        const badge = document.createElement('span');
        badge.className = 'timeline-marker-badge';
        badge.innerHTML = isNext ? icons.flag : isPast ? icons.checkmark : icons.waypoint;
        marker.appendChild(badge);
        // 日をまたぐ場合(その日最後の項目)は連結線を表示しない(従来のCSS版と同じ挙動)。
        if (index < dayItems.length - 1) {
          marker.insertAdjacentHTML('beforeend', buildTrailSvg());
        }
        timelineItem.appendChild(marker);

        const content = document.createElement('div');
        content.className = isNext ? 'timeline-content card timeline-content-next' : 'timeline-content card';
        // 直前に並び替えた項目なら、一瞬ハイライトして変化に気付かせる
        // (docs/ROADMAP.md「78」)。1回使ったらリセットし、以降の無関係な
        // 再描画では光らないようにする。
        if (item.id === justMovedItemId) {
          content.classList.add('item-moved-flash');
          justMovedItemId = null;
        }

        if (isNext) {
          const nextBadge = document.createElement('span');
          nextBadge.className = 'next-badge';
          nextBadge.textContent = '次の予定';
          content.appendChild(nextBadge);
        }

        const title = document.createElement('h3');
        title.textContent = item.time ? `${item.time} ${item.title}` : item.title;
        content.appendChild(title);

        if (timeWarningIds.has(item.id)) {
          const warning = document.createElement('p');
          warning.className = 'item-time-warning';
          warning.textContent = '⚠ 時間の前後が入れ替わっています';
          content.appendChild(warning);
        }

        if (item.locationUrl) {
          if (isSafeUrl(item.locationUrl)) {
            const link = document.createElement('a');
            link.className = 'candidate-link';
            link.href = item.locationUrl;
            link.textContent = item.locationUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            content.appendChild(link);
          } else {
            const unsafeUrlText = document.createElement('p');
            unsafeUrlText.className = 'candidate-link';
            unsafeUrlText.textContent = item.locationUrl;
            content.appendChild(unsafeUrlText);
          }
        }

        if (item.transportation) {
          const transportation = document.createElement('p');
          transportation.textContent = `移動手段: ${item.transportation}`;
          content.appendChild(transportation);
        }

        if (item.note) {
          const note = document.createElement('p');
          appendLinkifiedText(note, item.note);
          content.appendChild(note);
        }

        const meta = document.createElement('p');
        meta.className = 'subtitle';
        meta.textContent = `追加: ${item.addedBy}`;
        content.appendChild(meta);

        // 時間設定の有無を問わず、その日の全項目が並び替え対象(docs/ROADMAP.md「87」。
        // 以前は時間未設定の項目同士でのみ▲▼を表示していた)。
        if (dayItems.length > 1) {
          const moveRow = document.createElement('div');
          moveRow.className = 'button-row';

          const moveUpButton = document.createElement('button');
          moveUpButton.type = 'button';
          moveUpButton.className = 'btn-secondary';
          moveUpButton.textContent = '▲ 上へ';
          moveUpButton.disabled = index === 0;
          moveUpButton.addEventListener('click', () => moveItem(dayItems, item, -1));
          moveRow.appendChild(moveUpButton);

          const moveDownButton = document.createElement('button');
          moveDownButton.type = 'button';
          moveDownButton.className = 'btn-secondary';
          moveDownButton.textContent = '▼ 下へ';
          moveDownButton.disabled = index === dayItems.length - 1;
          moveDownButton.addEventListener('click', () => moveItem(dayItems, item, 1));
          moveRow.appendChild(moveDownButton);

          content.appendChild(moveRow);
        }

        const itemActions = document.createElement('div');
        itemActions.className = 'button-row';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn-secondary';
        editButton.textContent = '編集';
        editButton.addEventListener('click', () => openFormForEdit(item));
        itemActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn-secondary';
        deleteButton.textContent = '削除';
        deleteButton.addEventListener('click', () => onDeleteItemClick(item, deleteButton));
        itemActions.appendChild(deleteButton);

        content.appendChild(itemActions);

        timelineItem.appendChild(content);
        timeline.appendChild(timelineItem);
      });

      itemList.appendChild(timeline);
    }
  }

  // 「次の予定」(docs/ROADMAP.md「60」)はデータの変更が無くても時間経過だけで
  // 変わりうるため、1分ごとに再描画して追随させる。setIntervalはeslint設定の
  // グローバル一覧に無いため、既に許可されているsetTimeoutの自己再スケジュールで
  // 代用する。
  let nextItemRefreshTimer = null;
  function scheduleNextItemRefresh() {
    nextItemRefreshTimer = setTimeout(() => {
      renderItems(currentItems);
      scheduleNextItemRefresh();
    }, 60000);
  }
  scheduleNextItemRefresh();

  // リアルタイム同期(docs/ROADMAP.md「32」参照)。以前は追加のたびにローカルの配列を
  // 楽観的に更新していたが、購読による再描画と二重になりちらつきの原因になるため、
  // ローカル更新はやめて購読の再描画だけに一本化した。
  let isFirstSnapshot = true;
  const unsubscribeItems = subscribeToCollection(
    itemsPath,
    (items) => {
      currentItems = items;
      renderItems(currentItems);
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        submitButton.disabled = false;
      }
    },
    (error) => {
      console.error(error);
      errorText.textContent = 'しおり項目の取得に失敗しました。時間をおいて再度お試しください。';
      submitButton.disabled = false;
    },
  );

  const onItemSubmit = async (event) => {
    event.preventDefault();
    errorText.textContent = '';

    const title = titleInput.value.trim();
    const date = datePicker.getValue();
    const amPm = timeAmPmSelect.value;
    const hour = timeHourSelect.value;
    const minute = timeMinuteSelect.value;
    const locationUrl = locationInput.value.trim();
    const transportation = transportationInput.value.trim();
    const note = noteInput.value.trim();
    if (!title || !date) {
      errorText.textContent = 'やること名と日付を入力してください。';
      return;
    }

    const timeFieldsFilled = [amPm, hour, minute].filter((v) => v !== '').length;
    if (timeFieldsFilled > 0 && timeFieldsFilled < 3) {
      errorText.textContent = '時間を指定する場合は、午前/午後・時・分をすべて選択してください。';
      return;
    }
    const time = timeFieldsFilled === 3 ? buildTimeString(amPm, hour, minute) : '';

    submitButton.disabled = true;
    try {
      if (editingItemId) {
        // 編集時はaddedBy(追加者)を書き換えない。
        await updateDocument(`${itemsPath}/${editingItemId}`, { title, date, time, locationUrl, transportation, note });
      } else {
        // 追加先の日が「着手済みの日」(1件でも明示的なorderを持つ)場合、新規項目の
        // 時間目安から挿入位置を推定し、その日の全項目のorderを振り直す
        // (docs/ROADMAP.md「87」)。「未着手の日」への追加はorder操作不要
        // (追加後も全項目order未設定のまま、時刻順で正しく表示されるため)。
        const dayItems = currentItems.filter((i) => i.date === date).sort(compareItems);
        if (dayItems.some((i) => i.order != null)) {
          const insertIndex = dayItems.findIndex(
            (i) => (time || NO_TIME_SENTINEL).localeCompare(i.time || NO_TIME_SENTINEL) < 0,
          );
          const newItemIndex = insertIndex === -1 ? dayItems.length : insertIndex;
          const shifts = dayItems
            .slice(newItemIndex)
            .map((i, offset) => ({ path: `${itemsPath}/${i.id}`, data: { order: newItemIndex + 1 + offset } }));
          if (shifts.length > 0) await updateDocumentsBatch(shifts);
          await addDocument(itemsPath, {
            title, date, time, locationUrl, transportation, note, addedBy: session.name, order: newItemIndex,
          });
        } else {
          await addDocument(itemsPath, { title, date, time, locationUrl, transportation, note, addedBy: session.name });
        }
      }
      closeForm();
    } catch (error) {
      console.error(error);
      errorText.textContent = editingItemId
        ? 'しおり項目の更新に失敗しました。時間をおいて再度お試しください。'
        : 'しおり項目の追加に失敗しました。時間をおいて再度お試しください。';
    } finally {
      submitButton.disabled = false;
    }
  };
  itemForm.addEventListener('submit', onItemSubmit);

  return () => {
    toggleFormButton.removeEventListener('click', onToggleFormClick);
    cancelFormButton.removeEventListener('click', onCancelFormClick);
    itemForm.removeEventListener('submit', onItemSubmit);
    datePicker.destroy();
    clearTimeout(nextItemRefreshTimer);
    unsubscribeItems();
  };
}
