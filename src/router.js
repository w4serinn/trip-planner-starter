// SPA用の軽量ハッシュルーター(フレームワーク非依存)。
// ルート定義(パスパターン→マウント関数)を登録し、location.hashの変化に応じて
// 該当するビューを#viewへマウント/アンマウントする。
// パスパターンは"#/trips/:tripId/notes"のように`:name`で動的セグメントを表す。
// マウント関数はクリーンアップ関数(イベントリスナー解除など)を返してよく、
// 次のビューへ切り替わる直前に呼び出される。

const routes = [];
let currentCleanup = null;

function compileRoute(pattern) {
  const paramNames = [];
  const regexSource = pattern
    .replace(/^#/, '')
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${regexSource}$`), paramNames };
}

export function registerRoute(pattern, mount) {
  const { regex, paramNames } = compileRoute(pattern);
  routes.push({ pattern, regex, paramNames, mount });
}

function matchRoute(hash) {
  const path = hash.replace(/^#/, '') || '/';
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      return { route, params };
    }
  }
  return null;
}

async function render() {
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const hash = window.location.hash || '#/';
  const matched = matchRoute(hash);
  const outlet = document.getElementById('view');

  if (!matched) {
    outlet.innerHTML = '<p class="empty-state">ページが見つかりません。</p>';
    return;
  }

  // mount()が必要なら`outlet.dataset.flatTransition`を立て直せるよう、前の
  // ビューの分を先に消しておく(docs/ROADMAP.md「73」参照)。
  delete outlet.dataset.flatTransition;
  const cleanup = await matched.route.mount(outlet, matched.params);
  currentCleanup = typeof cleanup === 'function' ? cleanup : null;

  // 画面切り替えの入場アニメーション(docs/ROADMAP.md「37」「72」)。同じクラスを
  // 連続で付け直してもCSSアニメーションは再生されないため、一度外してリフローを
  // 強制してから付け直す。
  // 2026-08-21(docs/ROADMAP.md「73」): 通常は`view-enter`(perspective+rotateYの
  // 3D風トランジション、`72`)を使うが、`transform`を持つ間#viewはposition: fixedな
  // 子孫要素(例: 雑多メモの画面下部固定バー`#scratch-actions`、`44`)の包含
  // ブロックになってしまい、アニメーション中だけ固定配置が崩れる(CSS仕様上の
  // 制約)。そのような固定要素を含むビューは、mount()内で
  // `outlet.dataset.flatTransition = 'true'`を立てることで、transformを使わない
  // opacityのみの`view-enter-flat`にフォールバックできる。
  outlet.classList.remove('view-enter', 'view-enter-flat');
  void outlet.offsetWidth;
  outlet.classList.add(outlet.dataset.flatTransition ? 'view-enter-flat' : 'view-enter');
}

// 同じハッシュへのnavigateでも(hashchangeが発火しないため)強制的に再描画する。
export function navigate(hash) {
  if (window.location.hash === hash) {
    render();
  } else {
    window.location.hash = hash;
  }
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
