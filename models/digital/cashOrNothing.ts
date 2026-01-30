/**
 * 数字期权（Cash-or-Nothing）解析定价
 * 看涨：D * e^{-r_d*T} * N(d2)
 * 看跌：D * e^{-r_d*T} * N(-d2)
 * 支付货币为外币时需乘以到期远期汇率折到本币（此处先做本币支付 D）
 */

import type { DigitalParams, DigitalResult, OptionType } from '../types';
import { normalCdf, normalPdf } from '../common/normalCdf';
import { d2 } from '../common/gkParams';
import { discountDomestic } from '../common/discount';

export function priceDigitalCall(params: DigitalParams): number {
  const { D, r_d, T } = params;
  const _d2 = d2(params);
  return D * discountDomestic(r_d, T) * normalCdf(_d2);
}

export function priceDigitalPut(params: DigitalParams): number {
  const { D, r_d, T } = params;
  const _d2 = d2(params);
  return D * discountDomestic(r_d, T) * normalCdf(-_d2);
}

export function priceDigital(params: DigitalParams, optionType: OptionType): number {
  return optionType === 'call' ? priceDigitalCall(params) : priceDigitalPut(params);
}

/**
 * 数字期权 Delta（在 K 附近很大）
 * 看涨：D*e^{-r_d*T}*φ(d2)/(S*σ*√T)
 * 看跌：-D*e^{-r_d*T}*φ(d2)/(S*σ*√T)
 */
export function deltaDigital(params: DigitalParams, optionType: OptionType): number {
  const { S, sigma, T } = params;
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  const _d2 = d2(params);
  const coeff = (params.D * discountDomestic(params.r_d, params.T) * normalPdf(_d2)) / (S * sigmaSqrtT);
  return optionType === 'call' ? coeff : -coeff;
}

export function priceAndDelta(params: DigitalParams, optionType: OptionType): DigitalResult {
  return {
    price: priceDigital(params, optionType),
    delta: deltaDigital(params, optionType),
  };
}
