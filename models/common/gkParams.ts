/**
 * Garman-Kohlhagen 模型中的 d1、d2
 * 外汇版 Black-Scholes：标的为汇率，本币利率 r_d，外币利率 r_f
 */

import type { GKParams } from '../types';

/**
 * 计算 d1
 * d1 = [ln(S/K) + (r_d - r_f + σ²/2)T] / (σ√T)
 */
export function d1(params: GKParams): number {
  const { S, K, T, r_d, r_f, sigma } = params;
  const sigmaSqrtT = sigma * Math.sqrt(T);
  if (sigmaSqrtT === 0) return 0;
  return (Math.log(S / K) + (r_d - r_f + 0.5 * sigma * sigma) * T) / sigmaSqrtT;
}

/**
 * 计算 d2
 * d2 = d1 - σ√T
 */
export function d2(params: GKParams): number {
  const { sigma, T } = params;
  return d1(params) - sigma * Math.sqrt(T);
}
