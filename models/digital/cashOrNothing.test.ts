/**
 * 数字期权模块验证测试
 * 参考：功能规格、需求书-数字期权模块、Issues/计算模块 调试历史
 */

import { describe, it, expect } from 'vitest';
import {
  priceCashOrNothingCallDomestic,
  priceCashOrNothingPutDomestic,
  priceDigital,
  priceDigitalCall,
  priceDigitalPut,
  priceAndGreeks,
  deltaCashForeign,
} from './cashOrNothing';
import { discountDomestic as discountDomesticCommon } from '../common/discount';
import type { DigitalParams, OptionType } from '../types';

const baseParams: DigitalParams = {
  S: 1.1,
  K: 1.0,
  T: 0.25,
  T2: 0.25,
  r_d: 0.05,
  r_f: 0.03,
  sigma: 0.1,
  D: 1,
  payoffCurrency: 'domestic',
  digitalKind: 'cashOrNothing',
};

describe('数字期权 Cash-or-Nothing 本币', () => {
  it('看涨+看跌价格之和 = D·e^{-r_d·T2}（解析恒等式）', () => {
    const call = priceCashOrNothingCallDomestic(baseParams);
    const put = priceCashOrNothingPutDomestic(baseParams);
    const expected = baseParams.D * discountDomesticCommon(baseParams.r_d, baseParams.T2!);
    expect(call + put).toBeCloseTo(expected, 10);
  });

  it('价格非负', () => {
    expect(priceCashOrNothingCallDomestic(baseParams)).toBeGreaterThanOrEqual(0);
    expect(priceCashOrNothingPutDomestic(baseParams)).toBeGreaterThanOrEqual(0);
  });
});

describe('数字期权 Cash-or-Nothing 统一入口', () => {
  it('digitalKind 默认走 cashOrNothing、payoffCurrency 默认走 domestic', () => {
    const paramsNoKind = { ...baseParams, digitalKind: undefined, payoffCurrency: undefined };
    const call = priceDigitalCall(paramsNoKind as DigitalParams);
    const put = priceDigitalPut(paramsNoKind as DigitalParams);
    const expected = baseParams.D * discountDomesticCommon(baseParams.r_d, baseParams.T2!);
    expect(call + put).toBeCloseTo(expected, 10);
  });

  it('priceDigital(call) 与 priceDigitalCall 一致', () => {
    expect(priceDigital(baseParams, 'call')).toBe(priceDigitalCall(baseParams));
    const foreignParams = { ...baseParams, payoffCurrency: 'foreign' as const };
    expect(priceDigital(foreignParams, 'call')).toBe(priceDigitalCall(foreignParams));
  });

  it('priceDigital(put) 与 priceDigitalPut 一致', () => {
    expect(priceDigital(baseParams, 'put')).toBe(priceDigitalPut(baseParams));
    const foreignParams = { ...baseParams, payoffCurrency: 'foreign' as const };
    expect(priceDigital(foreignParams, 'put')).toBe(priceDigitalPut(foreignParams));
  });
});

describe('数字期权 Cash-or-Nothing 外币 Put Delta 符号', () => {
  it('Put Delta 为 N(-d1) - φ/(σ√T)，典型参数下符号合理', () => {
    const params: DigitalParams = {
      ...baseParams,
      payoffCurrency: 'foreign',
      S: 1.1,
      K: 1.0,
      T: 0.25,
      r_f: 0.03,
      sigma: 0.1,
      D: 1,
    };
    const putDelta = deltaCashForeign(params, 'put');
    // S > K 时数字 Put 价值随 S 升而降，Delta 应为负
    expect(putDelta).toBeLessThan(0);
  });

  it('Put Delta 为有限值且与 Call Delta 符号/量级合理', () => {
    const params: DigitalParams = {
      ...baseParams,
      payoffCurrency: 'foreign',
      S: 0.9,
      K: 1.0,
      T: 0.25,
      D: 1,
    };
    const putDelta = deltaCashForeign(params, 'put');
    const callDelta = deltaCashForeign(params, 'call');
    expect(Number.isFinite(putDelta)).toBe(true);
    expect(Number.isFinite(callDelta)).toBe(true);
    // Call 与 Put 的 Delta 不应相等（数字期权无 put-call parity）
    expect(putDelta).not.toBe(callDelta);
  });
});

describe('数字期权 priceAndGreeks', () => {
  it('返回 price 与 delta，且与单独定价一致', () => {
    const result = priceAndGreeks(baseParams, 'call');
    expect(result.price).toBe(priceDigital(baseParams, 'call'));
    expect(result.delta).toBeDefined();
  });

  it('Cash 本币 有 gamma、vega、theta', () => {
    const result = priceAndGreeks(baseParams, 'put');
    expect(result.gamma).toBeDefined();
    expect(result.vega).toBeDefined();
    expect(result.theta).toBeDefined();
  });
});
