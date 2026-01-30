/**
 * 货币对模板与惯例：Vanilla 定价与组合期权定价共用
 * 切换货币对时填入即期、执行价、利率、波动率、名义本金等，便于只改尾数
 */

export const CURRENCY_PAIRS = ['EURUSD', 'USDJPY', 'GBPUSD', 'AUDUSD', 'USDCNY', '其他'] as const;

export type CurrencyTemplate = {
  spot: number;
  strike: number;
  r_d: number;
  r_f: number;
  sigma: number;
  notional: number;
};

export const CURRENCY_TEMPLATES: Record<string, CurrencyTemplate> = {
  EURUSD: { spot: 1.08, strike: 1.07, r_d: 0.04, r_f: 0.025, sigma: 0.06, notional: 1_000_000 },
  USDJPY: { spot: 149.5, strike: 149.0, r_d: 0.035, r_f: 0.005, sigma: 0.08, notional: 1_000_000 },
  GBPUSD: { spot: 1.27, strike: 1.26, r_d: 0.045, r_f: 0.04, sigma: 0.07, notional: 1_000_000 },
  AUDUSD: { spot: 0.655, strike: 0.65, r_d: 0.045, r_f: 0.04, sigma: 0.09, notional: 1_000_000 },
  USDCNY: { spot: 7.25, strike: 7.20, r_d: 0.0155, r_f: 0.035, sigma: 0.025, notional: 1_000_000 },
  其他: { spot: 1, strike: 1, r_d: 0.03, r_f: 0.02, sigma: 0.05, notional: 1_000_000 },
};

/** 货币对惯例：本币/外币代码，用于输出标签（Premium、Vega 头寸等） */
export const CURRENCY_CONVENTION: Record<string, { domestic: string; foreign: string }> = {
  EURUSD: { domestic: 'USD', foreign: 'EUR' },
  USDJPY: { domestic: 'JPY', foreign: 'USD' },
  GBPUSD: { domestic: 'USD', foreign: 'GBP' },
  AUDUSD: { domestic: 'USD', foreign: 'AUD' },
  USDCNY: { domestic: 'CNY', foreign: 'USD' },
  其他: { domestic: '本币', foreign: '外币' },
};
