import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  buildTrailPoints,
  pointsToPathD,
  buildFootprintsAlongPath,
  createFootprintTrail,
} from './footprintTrail.js';

describe('createSeededRandom', () => {
  it('同じseedなら同じ乱数列を返す(再現性)', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('異なるseedなら異なる乱数列を返す(ランダム性)', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('0以上1未満の値を返す', () => {
    const random = createSeededRandom(123);
    for (let i = 0; i < 20; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('buildTrailPoints', () => {
  it('始点・終点のxは中心(11)で固定、y座標は0〜heightに均等割りされる', () => {
    const random = createSeededRandom(1);
    const points = buildTrailPoints(random, { segments: 4, height: 100 });
    expect(points).toHaveLength(5); // 始点 + (segments-1)個の折れ点 + 終点
    expect(points[0]).toEqual({ x: 11, y: 0 });
    expect(points[points.length - 1]).toEqual({ x: 11, y: 100 });
    expect(points.map((p) => p.y)).toEqual([0, 25, 50, 75, 100]);
  });

  it('中間点のxはwobbleRatioで指定した範囲(中心±maxOffset)からはみ出さない', () => {
    const random = createSeededRandom(7);
    const wobbleRatio = 0.6;
    const points = buildTrailPoints(random, { segments: 5, wobbleRatio, height: 100 });
    const maxOffset = (22 / 2) * wobbleRatio;
    for (const p of points.slice(1, -1)) {
      expect(p.x).toBeGreaterThanOrEqual(11 - maxOffset);
      expect(p.x).toBeLessThanOrEqual(11 + maxOffset);
    }
  });

  it('異なるseedなら異なる軌跡になる(同じ形の繰り返しにしないという要件)', () => {
    const pointsA = buildTrailPoints(createSeededRandom(1), { segments: 4 });
    const pointsB = buildTrailPoints(createSeededRandom(2), { segments: 4 });
    expect(pointsA).not.toEqual(pointsB);
  });
});

describe('pointsToPathD', () => {
  it('始点をMoveTo、以降をLineToにした文字列を生成する', () => {
    const d = pointsToPathD([{ x: 11, y: 0 }, { x: 5, y: 50 }, { x: 11, y: 100 }]);
    expect(d).toBe('M11.0 0.0 L5.0 50.0 L11.0 100.0');
  });
});

describe('buildFootprintsAlongPath', () => {
  it('指定した数の足あとを経路上に均等配置する', () => {
    const points = [{ x: 11, y: 0 }, { x: 11, y: 100 }];
    const footprints = buildFootprintsAlongPath(points, 3);
    expect(footprints).toHaveLength(3);
    // 直線区間なので、y座標は総延長100を4等分した位置(25, 50, 75)に来るはず
    expect(footprints.map((f) => Math.round(f.y))).toEqual([25, 50, 75]);
  });

  it('奇数番目と偶数番目で左右に交互にずれる(片足ずつの足あとらしさ)', () => {
    const points = [{ x: 11, y: 0 }, { x: 11, y: 100 }];
    const footprints = buildFootprintsAlongPath(points, 2);
    expect(footprints[0].x).toBeLessThan(11); // 1番目(奇数)は左
    expect(footprints[1].x).toBeGreaterThan(11); // 2番目(偶数)は右
  });

  it('経路の折れ点がゼロ距離でも無限ループや例外にならない', () => {
    const points = [{ x: 11, y: 0 }, { x: 11, y: 0 }, { x: 11, y: 100 }];
    expect(() => buildFootprintsAlongPath(points, 3)).not.toThrow();
  });
});

describe('createFootprintTrail', () => {
  it('pathDとfootprintsをまとめて返す', () => {
    const trail = createFootprintTrail(createSeededRandom(5), { footprintCount: 2 });
    expect(trail.pathD).toMatch(/^M/);
    expect(trail.footprints).toHaveLength(2);
  });

  it('footprintCountを省略すると3件になる', () => {
    const trail = createFootprintTrail(createSeededRandom(5));
    expect(trail.footprints).toHaveLength(3);
  });
});
