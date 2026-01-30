/**
 * Garman-Kohlhagen 模型：外汇欧式香草期权定价与 Greeks
 * 看涨：C = S*e^{-r_f*T2}*N(d1) - K*e^{-r_d*T2}*N(d2)
 * 看跌：P = K*e^{-r_d*T2}*N(-d2) - S*e^{-r_f*T2}*N(-d1)
 * d1/d2 用 T1（到期−今日），折现用 T2（交割−起息）；未传 T2 时用 T1。
 */

import type { GKParams, OptionType, VanillaResult } from '../types';
import { normalCdf, normalPdf } from '../common/normalCdf';
import { d1, d2 } from '../common/gkParams';
import { discountDomestic, discountForeign } from '../common/discount';

/** 折现期限：T2 存在时用 T2，否则用 T */
function discountT(params: GKParams): number {
  return params.T2 ?? params.T;
}

export function priceCall(params: GKParams): number {
  const { S, K, r_d, r_f } = params;
  const T2 = discountT(params);
  const _d1 = d1(params);
  const _d2 = d2(params);
  const D_d = discountDomestic(r_d, T2);
  const D_f = discountForeign(r_f, T2);
  return S * D_f * normalCdf(_d1) - K * D_d * normalCdf(_d2);
}

export function pricePut(params: GKParams): number {
  const { S, K, r_d, r_f } = params;
  const T2 = discountT(params);
  const _d1 = d1(params);
  const _d2 = d2(params);
  const D_d = discountDomestic(r_d, T2);
  const D_f = discountForeign(r_f, T2);
  return K * D_d * normalCdf(-_d2) - S * D_f * normalCdf(-_d1);
}

export function price(params: GKParams, optionType: OptionType): number {
  return optionType === 'call' ? priceCall(params) : pricePut(params);
}

/** Delta：∂V/∂S。看涨 Δ = e^{-r_f*T2}*N(d1)，看跌 Δ = e^{-r_f*T2}*(N(d1)-1)；折现用 T2 */
export function delta(params: GKParams, optionType: OptionType): number {
  const { r_f } = params;
  const D_f = discountForeign(r_f, discountT(params));
  const _d1 = d1(params);
  if (optionType === 'call') return D_f * normalCdf(_d1);
  return D_f * (normalCdf(_d1) - 1);
}

/** Gamma：∂²V/∂S²，按 1% 即期变化（与 Fenics 等一致，除以 100） */
export function gamma(params: GKParams): number {
  const { S, r_f, sigma, T } = params;
  const D_f = discountForeign(r_f, discountT(params));
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  const gammaRaw = (D_f * normalPdf(d1(params))) / (S * sigmaSqrtT);
  return gammaRaw / 100;
}

/** Vega：∂V/∂σ，按 1% 波动率变化（与 Fenics 一致：spot*n(d1)*sqrt(T)*exp(-r_f*T2)/100） */
export function vega(params: GKParams): number {
  const { S, r_f, T } = params;
  const D_f = discountForeign(r_f, discountT(params));
  const _d1 = d1(params);
  const vegaRaw = S * D_f * Math.sqrt(T) * normalPdf(_d1);
  return vegaRaw / 100;
}

/** Vanna：∂²V/(∂S∂σ)，按 1% vol；看涨看跌公式相同；与 Vega/Gamma 一致除以 100 */
export function vanna(params: GKParams): number {
  const { S, sigma, T } = params;
  const _d1 = d1(params);
  const _d2 = d2(params);
  const D_f = discountForeign(params.r_f, discountT(params));
  if (sigma === 0) return 0;
  const vannaRaw = -S * D_f * Math.sqrt(T) * normalPdf(_d1) * (_d2 / sigma);
  return vannaRaw / 100;
}

/** Volga/VolGamma：∂²V/∂σ²，按 1% vol；基于已除以 100 的 Vega */
export function volga(params: GKParams): number {
  const { sigma } = params;
  if (sigma === 0) return 0;
  const v = vega(params);
  const _d1 = d1(params);
  const _d2 = d2(params);
  return (v * _d1 * _d2) / sigma;
}

/** Theta：∂V/∂t 按 1 天（即 (∂V/∂t)/365）；折现用 T2 */
export function theta(params: GKParams, optionType: OptionType): number {
  const { S, K, r_d, r_f, sigma, T } = params;
  const _d1 = d1(params);
  const _d2 = d2(params);
  const Tdisc = discountT(params);
  const D_d = discountDomestic(r_d, Tdisc);
  const D_f = discountForeign(r_f, Tdisc);
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  const term = (-S * D_f * normalPdf(_d1) * sigma) / (2 * Math.sqrt(T));
  const thetaPerYear =
    optionType === 'call'
      ? term + r_f * S * D_f * normalCdf(_d1) - r_d * K * D_d * normalCdf(_d2)
      : term - r_f * S * D_f * normalCdf(-_d1) + r_d * K * D_d * normalCdf(-_d2);
  return thetaPerYear / 365;
}

/** Rho_d：∂V/∂r_d；Call 为正、Put 为负；折现用 T2 */
export function rhoD(params: GKParams, optionType: OptionType): number {
  const { K } = params;
  const Tdisc = discountT(params);
  const D_d = discountDomestic(params.r_d, Tdisc);
  const _d2 = d2(params);
  if (optionType === 'call') return K * Tdisc * D_d * normalCdf(_d2);
  return -K * Tdisc * D_d * normalCdf(-_d2);
}

/** Rho_f：对外币利率的敏感度；折现用 T2 */
export function rhoF(params: GKParams, optionType: OptionType): number {
  const { S } = params;
  const Tdisc = discountT(params);
  const D_f = discountForeign(params.r_f, Tdisc);
  const _d1 = d1(params);
  if (optionType === 'call') return -S * Tdisc * D_f * normalCdf(_d1);
  return S * Tdisc * D_f * normalCdf(-_d1);
}

/** Time Decay：Bump T1 ±1 天，(V(T1-1/365)-V(T1+1/365))/2，与 Fenics/QuantLib Bump T1 一致 */
export function timeDecayBumpT1(params: GKParams, optionType: OptionType): number {
  const dt = 1 / 365;
  const pUp = { ...params, T: params.T - dt };
  const pDown = { ...params, T: params.T + dt };
  const vUp = price(pUp, optionType);
  const vDown = price(pDown, optionType);
  return (vUp - vDown) / 2;
}

export function greeks(params: GKParams, optionType: OptionType): Omit<VanillaResult, 'price'> {
  return {
    delta: delta(params, optionType),
    gamma: gamma(params),
    vega: vega(params),
    theta: theta(params, optionType),
    timeDecayBump: timeDecayBumpT1(params, optionType),
    rho_d: rhoD(params, optionType),
    rho_f: rhoF(params, optionType),
    vanna: vanna(params),
    volga: volga(params),
  };
}

export function priceAndGreeks(
  params: GKParams,
  optionType: OptionType
): VanillaResult {
  return {
    price: price(params, optionType),
    ...greeks(params, optionType),
  };
}
