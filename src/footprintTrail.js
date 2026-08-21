// しおりタイムラインの項目間をつなぐ連結線(docs/ROADMAP.md「80」)用の
// DOM非依存な純粋関数。直線ではなく、ランダムに左右へ揺れるジグザグの小道を
// 生成し、その軌跡上に足あとの位置・向きを点在させる。呼び出し側でPRNG
// (0以上1未満の乱数を返す関数)を渡すことで、テスト時は再現可能な乱数、
// 実利用時はMath.random()等の毎回変わる乱数を使い分けられる
// (「軌跡は同じ形にならないようにランダム化してほしい」との人間の要望)。

const VIEW_WIDTH = 22;

// 決定的な擬似乱数生成器(mulberry32)。同じseedなら同じ乱数列を返すため、
// vitestでの再現性検証に使う。実利用時は`() => Math.random()`をそのまま渡してよい。
export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ジグザグ経路の折れ点(始点・終点含む)をランダムに生成する。
// x座標はVIEW_WIDTH(22)の中心から`wobbleRatio`ぶんの範囲内に収める
// (表示崩れ・はみ出し防止のため範囲外には出さない)。
export function buildTrailPoints(random, { segments = 4, wobbleRatio = 0.6, height = 100 } = {}) {
  const centerX = VIEW_WIDTH / 2;
  const maxOffset = (VIEW_WIDTH / 2) * wobbleRatio;
  const points = [{ x: centerX, y: 0 }];
  for (let i = 1; i < segments; i += 1) {
    const y = (height * i) / segments;
    const x = centerX + (random() * 2 - 1) * maxOffset;
    points.push({ x, y });
  }
  points.push({ x: centerX, y: height });
  return points;
}

// 折れ点の配列をSVGの<path d="...">用の文字列(直線でつなぐL命令)に変換する。
export function pointsToPathD(points) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

// 折れ点で構成される経路の総延長をcount等分した位置に、足あとの座標・回転角
// (度、経路の進行方向に合わせる)を配置する。1つ飛ばしで左右にずらし、
// 片足ずつ交互に踏んだような足あとらしさを出す。
export function buildFootprintsAlongPath(points, count) {
  const segLengths = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt((dx * dx) + (dy * dy));
    segLengths.push(len);
    totalLength += len;
  }

  const footprints = [];
  for (let i = 1; i <= count; i += 1) {
    const targetDist = (totalLength * i) / (count + 1);
    let accumulated = 0;
    for (let s = 0; s < segLengths.length; s += 1) {
      const isLastSegment = s === segLengths.length - 1;
      if (accumulated + segLengths[s] >= targetDist || isLastSegment) {
        const segStart = points[s];
        const segEnd = points[s + 1];
        const segProgress = segLengths[s] === 0 ? 0 : (targetDist - accumulated) / segLengths[s];
        const clampedProgress = Math.min(Math.max(segProgress, 0), 1);
        const x = segStart.x + ((segEnd.x - segStart.x) * clampedProgress);
        const y = segStart.y + ((segEnd.y - segStart.y) * clampedProgress);
        const angle = Math.atan2(segEnd.y - segStart.y, segEnd.x - segStart.x) * (180 / Math.PI);
        const sideOffset = i % 2 === 0 ? 1.6 : -1.6;
        footprints.push({ x: x + sideOffset, y, rotation: angle + 90 });
        break;
      }
      accumulated += segLengths[s];
    }
  }
  return footprints;
}

// ジグザグ経路(pathD)と、その上に配置する足あと(footprints)をまとめて生成する。
export function createFootprintTrail(random, options = {}) {
  const points = buildTrailPoints(random, options);
  return {
    pathD: pointsToPathD(points),
    footprints: buildFootprintsAlongPath(points, options.footprintCount ?? 3),
  };
}
