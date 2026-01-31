/**
 * 美式期权定价模块验证测试
 * 参考：功能规格、需求书-美式期权模块
 * 理论：无股息时美式看涨 = 欧式看涨；美式看跌 >= 欧式看跌
 */

import { describe, it, expect } from 'vitest';
import {
  priceAmericanPut,
  priceAmericanCall,
  priceAmerican,
} from './binomialTree';
import { priceCall as europeanCall, pricePut as europeanPut } from '../vanilla/garmanKohlhagen';
import type { AmericanParams } from '../types';

const baseParams: AmericanParams = {
  S: 100,
  K: 100,
  T: 0.25,
  r_d: 0.05,
  r_f: 0.02,
  sigma: 0.2,
  steps: 200,
  treeType: 'crr',
};

describe('美式期权 vs 欧式期权', () => {
  it('无股息时美式看涨 ≈ 欧式看涨（树收敛）', () => {
    const american = priceAmericanCall(baseParams);
    const european = europeanCall(baseParams);
    const relErr = Math.abs(american.price - european) / (european || 1e-10);
    expect(relErr).toBeLessThan(0.01);
    expect(american.earlyExercisePremium).toBeDefined();
    expect(american.earlyExercisePremium!).toBeLessThanOrEqual(0.001);
  });

  it('美式看跌 >= 欧式看跌', () => {
    const american = priceAmericanPut(baseParams);
    const european = europeanPut(baseParams);
    expect(american.price).toBeGreaterThanOrEqual(european - 1e-10);
    expect(american.earlyExercisePremium).toBeDefined();
    expect(american.earlyExercisePremium!).toBeGreaterThanOrEqual(-1e-10);
  });

  it('美式看跌 ITM 时提前行权价值可为正', () => {
    const itmParams: AmericanParams = { ...baseParams, S: 90, K: 100 };
    const american = priceAmericanPut(itmParams);
    const european = europeanPut(itmParams);
    expect(american.price).toBeGreaterThanOrEqual(european - 1e-10);
  });
});

describe('美式期权 priceAmerican 分发', () => {
  it('call 与 priceAmericanCall 一致', () => {
    expect(priceAmerican(baseParams, 'call').price).toBe(
      priceAmericanCall(baseParams).price
    );
  });

  it('put 与 priceAmericanPut 一致', () => {
    expect(priceAmerican(baseParams, 'put').price).toBe(
      priceAmericanPut(baseParams).price
    );
  });
});

describe('美式期权输出结构', () => {
  it('返回 price、earlyExercisePremium、delta、gamma、vega、theta', () => {
    const put = priceAmericanPut(baseParams);
    expect(put.price).toBeGreaterThanOrEqual(0);
    expect(typeof put.earlyExercisePremium).toBe('number');
    expect(typeof put.delta).toBe('number');
    expect(typeof put.gamma).toBe('number');
    expect(typeof put.vega).toBe('number');
    expect(typeof put.theta).toBe('number');
  });

  it('美式看跌可返回早期行权边界', () => {
    const put = priceAmericanPut({ ...baseParams, steps: 50 });
    if (put.earlyExerciseBoundary && put.earlyExerciseBoundary.length > 0) {
      const pt = put.earlyExerciseBoundary[0];
      expect(pt).toHaveProperty('t');
      expect(pt).toHaveProperty('S');
      expect(pt.S).toBeGreaterThan(0);
      expect(pt.t).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('三叉树与二叉树', () => {
  it('三叉树与二叉树价格同量级（同一参数）', () => {
    const crrPut = priceAmericanPut(baseParams);
    const triPut = priceAmericanPut({ ...baseParams, treeType: 'trinomial' });
    const relDiff = Math.abs(crrPut.price - triPut.price) / (crrPut.price || 1e-10);
    expect(relDiff).toBeLessThan(0.15);
  });

  it('三叉树看涨与欧式看涨同量级（矩匹配可能裁剪概率）', () => {
    const american = priceAmericanCall({ ...baseParams, treeType: 'trinomial' });
    const european = europeanCall(baseParams);
    const relErr = Math.abs(american.price - european) / (european || 1e-10);
    expect(relErr).toBeLessThan(0.15);
  });
});

describe('边界与步数', () => {
  it('步数增加时价格收敛（看跌）', () => {
    const p50 = priceAmericanPut({ ...baseParams, steps: 50 }).price;
    const p200 = priceAmericanPut({ ...baseParams, steps: 200 }).price;
    const p500 = priceAmericanPut({ ...baseParams, steps: 500 }).price;
    expect(Math.abs(p200 - p500)).toBeLessThanOrEqual(Math.abs(p50 - p200) + 0.01);
  });

  it('T 很小时美式看跌价格接近内在价值', () => {
    const shortT: AmericanParams = { ...baseParams, T: 0.01, steps: 20 };
    const put = priceAmericanPut(shortT);
    const intrinsic = Math.max(shortT.K - shortT.S, 0);
    expect(put.price).toBeGreaterThanOrEqual(intrinsic - 0.01);
    expect(put.price).toBeLessThanOrEqual(intrinsic + 2);
  });
});
