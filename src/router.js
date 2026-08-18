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

  const cleanup = await matched.route.mount(outlet, matched.params);
  currentCleanup = typeof cleanup === 'function' ? cleanup : null;
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
