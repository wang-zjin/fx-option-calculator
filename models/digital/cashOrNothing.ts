/**
 * 数字期权定价（Cash-or-Nothing / Asset-or-Nothing）
 *
 * Cash-or-Nothing：
 * - 本币支付看涨：D·e^{-r_d·T2}·N(d2)，看跌：D·e^{-r_d·T2}·N(-d2)
 * - 外币支付看涨：D·S·e^{-r_f·T}·N(d1)，看跌：D·S·e^{-r_f·T}·N(-d1)（本币计价）
 *
 * Asset-or-Nothing：
 * - 看涨：S·e^{-r_f·T}·N(d1)，看跌：S·e^{-r_f·T}·N(-d1)（支付 1 单位外币，本币计价）
 *
 * 折现期限：价格折现用 T2 ?? T（与 Vanilla 一致）
 */

import type { DigitalParams, DigitalResult, OptionType } from '../types';
import { normalCdf, normalPdf } from '../common/normalCdf';
import { d1, d2 } from '../common/gkParams';
import { discountDomestic, discountForeign } from '../common/discount';

/** 折现期限（交割日−起息日），用于期权费折现 */
function discountTenor(params: DigitalParams): number {
  return params.T2 ?? params.T;
}

// ---------- Cash-or-Nothing：本币支付 ----------

export function priceCashOrNothingCallDomestic(params: DigitalParams): number {
  const { D } = params;
  const T2 = discountTenor(params);
  return D * discountDomestic(params.r_d, T2) * normalCdf(d2(params));
}

export function priceCashOrNothingPutDomestic(params: DigitalParams): number {
  const { D } = params;
  const T2 = discountTenor(params);
  return D * discountDomestic(params.r_d, T2) * normalCdf(-d2(params));
}

// ---------- Cash-or-Nothing：外币支付（到期支付 D 单位外币，本币计价 = D·S_T）----------

export function priceCashOrNothingCallForeign(params: DigitalParams): number {
  const { S, D, r_f, T } = params;
  return D * S * discountForeign(r_f, T) * normalCdf(d1(params));
}

export function priceCashOrNothingPutForeign(params: DigitalParams): number {
  const { S, D, r_f, T } = params;
  return D * S * discountForeign(r_f, T) * normalCdf(-d1(params));
}

// ---------- Cash-or-Nothing 统一入口（按支付货币）----------

export function priceDigitalCall(params: DigitalParams): number {
  const isForeign = params.payoffCurrency === 'foreign';
  return isForeign
    ? priceCashOrNothingCallForeign(params)
    : priceCashOrNothingCallDomestic(params);
}

export function priceDigitalPut(params: DigitalParams): number {
  const isForeign = params.payoffCurrency === 'foreign';
  return isForeign
    ? priceCashOrNothingPutForeign(params)
    : priceCashOrNothingPutDomestic(params);
}

export function priceDigital(params: DigitalParams, optionType: OptionType): number {
  if (params.digitalKind === 'assetOrNothing') {
    return optionType === 'call' ? priceAssetOrNothingCall(params) : priceAssetOrNothingPut(params);
  }
  return optionType === 'call' ? priceDigitalCall(params) : priceDigitalPut(params);
}

// ---------- Asset-or-Nothing（支付 1 单位外币，本币计价）----------

export function priceAssetOrNothingCall(params: DigitalParams): number {
  const { S, r_f, T } = params;
  return S * discountForeign(r_f, T) * normalCdf(d1(params));
}

export function priceAssetOrNothingPut(params: DigitalParams): number {
  const { S, r_f, T } = params;
  return S * discountForeign(r_f, T) * normalCdf(-d1(params));
}

// ---------- Greeks：Cash-or-Nothing 本币 ----------

/** Delta：∂V/∂S。看涨 D*e^{-r_d*T2}*φ(d2)/(S*σ*√T)，看跌取反 */
export function deltaCashDomestic(params: DigitalParams, optionType: OptionType): number {
  const { S, sigma, T } = params;
  const T2 = discountTenor(params);
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  const coeff =
    (params.D * discountDomestic(params.r_d, T2) * normalPdf(d2(params))) /
    (S * sigmaSqrtT);
  return optionType === 'call' ? coeff : -coeff;
}

/** Gamma：∂²V/∂S²。Cash 本币 = -D*e^{-r_d*T2}*φ(d2)*d1/(S²*σ*T) */
export function gammaCashDomestic(params: DigitalParams, optionType: OptionType): number {
  const { S, sigma, T } = params;
  const T2 = discountTenor(params);
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0 || T === 0) return 0;
  const _d1 = d1(params);
  const _d2 = d2(params);
  const term =
    (params.D * discountDomestic(params.r_d, T2) * normalPdf(_d2) * _d1) /
    (S * S * sigma * sigma * T);
  return optionType === 'call' ? -term : term;
}

/** Vega：∂V/∂σ，按 1% 波动率。Cash 本币 = D*e^{-r_d*T2}*φ(d2)*(-d1/σ) */
export function vegaCashDomestic(params: DigitalParams): number {
  const { sigma } = params;
  const T2 = discountTenor(params);
  if (sigma === 0) return 0;
  const _d1 = d1(params);
  const _d2 = d2(params);
  return (
    params.D * discountDomestic(params.r_d, T2) * normalPdf(_d2) * (-_d1 / sigma)
  );
}

/** Theta：∂V/∂t，按 1 天。Cash 本币：∂V/∂T = D*(-r_d)*e^{-r_d*T2}*N(d2) + D*e^{-r_d*T2}*φ(d2)*∂d2/∂T，∂d2/∂T = (r_d-r_f-0.5σ²)/(σ√T) - d2/(2T) */
export function thetaCashDomestic(params: DigitalParams, optionType: OptionType): number {
  const { r_d, r_f, sigma, T } = params;
  const T2 = discountTenor(params);
  const _d2 = d2(params);
  const sqrtT = Math.sqrt(T);
  if (sqrtT === 0 || T === 0) return 0;
  const D_d = discountDomestic(r_d, T2);
  const term1 = -r_d * params.D * D_d * (optionType === 'call' ? normalCdf(_d2) : normalCdf(-_d2));
  const d2_dT = (r_d - r_f - 0.5 * sigma * sigma) / (sigma * sqrtT) - _d2 / (2 * T);
  const term2 =
    params.D * D_d * normalPdf(_d2) * (optionType === 'call' ? 1 : -1) * d2_dT;
  return (term1 + term2) / 365;
}

// ---------- Greeks：Cash-or-Nothing 外币 ----------

/** Delta：Call V = D*S*e^{-r_f*T}*N(d1) => ∂V/∂S = D*e^{-r_f*T}*[N(d1)+φ/(σ√T)]；Put V = D*S*e^{-r_f*T}*N(-d1) => ∂V/∂S = D*e^{-r_f*T}*[N(-d1)-φ/(σ√T)] */
export function deltaCashForeign(params: DigitalParams, optionType: OptionType): number {
  const { r_f, sigma, T } = params;
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  const _d1 = d1(params);
  const D_f = discountForeign(r_f, T);
  const n = normalCdf(_d1);
  const phi = normalPdf(_d1);
  if (optionType === 'call') {
    return params.D * D_f * (n + phi / sigmaSqrtT);
  }
  return params.D * D_f * (normalCdf(-_d1) - phi / sigmaSqrtT);
}

/** Vega：外币 Cash 与 Vanilla 类似，V = D*S*e^{-r_f*T}*N(d1) => ∂V/∂σ = D*S*e^{-r_f*T}*√T*φ(d1)*(-d2/σ) 不对。∂d1/∂σ = -d2/σ，所以 ∂V/∂σ = D*S*e^{-r_f*T}*φ(d1)*(-d2/σ) */
export function vegaCashForeign(params: DigitalParams): number {
  const { S, r_f, sigma, T } = params; // S used in params.D * S * ...
  if (sigma === 0) return 0;
  const _d1 = d1(params);
  const _d2 = d2(params);
  return (
    params.D * S * discountForeign(r_f, T) * normalPdf(_d1) * (-_d2 / sigma)
  );
}

// ---------- Greeks：Asset-or-Nothing（与 Vanilla 单单位外币的 Delta/Gamma/Vega 一致）----------

export function deltaAssetOrNothing(params: DigitalParams, optionType: OptionType): number {
  const { r_f, T } = params;
  const D_f = discountForeign(r_f, T);
  const _d1 = d1(params);
  if (optionType === 'call') return D_f * normalCdf(_d1);
  return D_f * (normalCdf(_d1) - 1);
}

export function gammaAssetOrNothing(params: DigitalParams): number {
  const { S, r_f, sigma, T } = params;
  const D_f = discountForeign(r_f, T);
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  return (D_f * normalPdf(d1(params))) / (S * sigmaSqrtT);
}

export function vegaAssetOrNothing(params: DigitalParams): number {
  const { S, r_f, T } = params;
  return S * discountForeign(r_f, T) * Math.sqrt(params.T) * normalPdf(d1(params));
}

// ---------- 统一 Delta / Greeks 入口 ----------

export function deltaDigital(params: DigitalParams, optionType: OptionType): number {
  if (params.digitalKind === 'assetOrNothing') {
    return deltaAssetOrNothing(params, optionType);
  }
  return params.payoffCurrency === 'foreign'
    ? deltaCashForeign(params, optionType)
    : deltaCashDomestic(params, optionType);
}

/** Gamma：即期变动 1% 时 Delta 的变化；内部为 ∂²V/∂S²，出口乘以 0.01×S */
export function gammaDigital(params: DigitalParams, optionType: OptionType): number | undefined {
  const { S } = params;
  let raw: number | undefined;
  if (params.digitalKind === 'assetOrNothing') raw = gammaAssetOrNothing(params);
  else if (params.payoffCurrency === 'foreign') return undefined; // 可选后续补充
  else raw = gammaCashDomestic(params, optionType);
  return raw * 0.01 * S;
}

export function vegaDigital(params: DigitalParams): number | undefined {
  if (params.digitalKind === 'assetOrNothing') return vegaAssetOrNothing(params);
  return params.payoffCurrency === 'foreign' ? vegaCashForeign(params) : vegaCashDomestic(params);
}

export function thetaDigital(params: DigitalParams, optionType: OptionType): number | undefined {
  if (params.digitalKind === 'assetOrNothing') return undefined;
  if (params.payoffCurrency === 'foreign') return undefined;
  return thetaCashDomestic(params, optionType);
}

// ---------- 一口价 + 全 Greeks ----------

export function priceAndGreeks(params: DigitalParams, optionType: OptionType): DigitalResult {
  const price = priceDigital(params, optionType);
  const result: DigitalResult = { price, delta: deltaDigital(params, optionType) };
  const gamma = gammaDigital(params, optionType);
  if (gamma !== undefined) result.gamma = gamma;
  const vega = vegaDigital(params);
  if (vega !== undefined) result.vega = vega;
  const theta = thetaDigital(params, optionType);
  if (theta !== undefined) result.theta = theta;
  return result;
}

/** 保留旧名兼容 */
export function priceAndDelta(params: DigitalParams, optionType: OptionType): DigitalResult {
  return priceAndGreeks(params, optionType);
}
