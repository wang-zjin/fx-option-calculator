/**
 * 亚式期权定价：算术平均用蒙特卡洛；几何平均可选解析闭式
 * 收益：均价看涨 max(A_T - K, 0)，均价看跌 max(K - A_T, 0)
 */

import type { AsianParams, AsianResult, OptionType } from '../types';
import { discountDomestic } from '../common/discount';
import { normalCdf } from '../common/normalCdf';

const DEFAULT_PATHS = 50000;

/** 标准正态随机数（Box-Muller） */
function randomNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** 单路径几何平均 */
function pathGeometricAvg(
  S0: number,
  r_d: number,
  r_f: number,
  sigma: number,
  T: number,
  N: number
): number {
  const dt = T / N;
  const drift = (r_d - r_f - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);
  let logSum = Math.log(S0);
  let S = S0;
  for (let i = 1; i <= N; i++) {
    S = S * Math.exp(drift + vol * randomNormal());
    logSum += Math.log(S);
  }
  return Math.exp(logSum / (N + 1));
}

/** 单路径算术平均 */
function pathArithmeticAvg(
  S0: number,
  r_d: number,
  r_f: number,
  sigma: number,
  T: number,
  N: number
): number {
  const dt = T / N;
  const drift = (r_d - r_f - 0.5 * sigma * sigma) * dt;
  const vol = sigma * Math.sqrt(dt);
  let sum = S0;
  let S = S0;
  for (let i = 1; i <= N; i++) {
    S = S * Math.exp(drift + vol * randomNormal());
    sum += S;
  }
  return sum / (N + 1);
}

/**
 * 蒙特卡洛亚式期权定价
 * 采样次数 = observationCount（如 252 个交易日）
 */
export function priceAsianMC(
  params: AsianParams,
  optionType: OptionType,
  numPaths: number = DEFAULT_PATHS
): AsianResult {
  const { S, K, T, r_d, r_f, sigma, avgType, observationCount } = params;
  const N = Math.max(1, observationCount);
  const pathAvg = avgType === 'geometric' ? pathGeometricAvg : pathArithmeticAvg;
  const payoffs: number[] = [];

  for (let p = 0; p < numPaths; p++) {
    const A = pathAvg(S, r_d, r_f, sigma, T, N);
    const payoff = optionType === 'call' ? Math.max(A - K, 0) : Math.max(K - A, 0);
    payoffs.push(payoff);
  }

  const D_d = discountDomestic(r_d, T);
  const mean = payoffs.reduce((a, b) => a + b, 0) / numPaths;
  const price = D_d * mean;
  const variance = payoffs.reduce((s, x) => s + (x - mean) ** 2, 0) / (numPaths - 1);
  const standardError = D_d * Math.sqrt(variance / numPaths);
  const z95 = 1.96;
  const confidenceInterval: [number, number] = [
    price - z95 * standardError,
    price + z95 * standardError,
  ];

  return {
    price,
    standardError,
    confidenceInterval,
  };
}

/**
 * 几何平均亚式期权解析近似（闭式）
 * 几何平均在 Black-Scholes 框架下有闭式解
 */
export function priceAsianGeometric(
  params: AsianParams,
  optionType: OptionType
): AsianResult {
  const { S, K, T, r_d, r_f, sigma, observationCount } = params;
  const N = Math.max(1, observationCount);
  // 几何平均的波动率与漂移修正（离散采样）
  const sigmaAvg = sigma * Math.sqrt((2 * N + 1) / (6 * (N + 1)));
  const muAvg = r_d - r_f - 0.5 * sigma * sigma + 0.5 * sigmaAvg * sigmaAvg;
  const T_eff = T * (N + 1) / (2 * N);
  const S_avg0 = S * Math.exp((muAvg - (r_d - r_f)) * (T - T_eff));
  const d1_g = (Math.log(S_avg0 / K) + (r_d - r_f + 0.5 * sigmaAvg * sigmaAvg) * T_eff) / (sigmaAvg * Math.sqrt(T_eff));
  const d2_g = d1_g - sigmaAvg * Math.sqrt(T_eff);
  const D_d = discountDomestic(r_d, T_eff);
  const D_f = Math.exp(-r_f * T_eff);
  const pv =
    optionType === 'call'
      ? S_avg0 * D_f * normalCdf(d1_g) - K * D_d * normalCdf(d2_g)
      : K * D_d * normalCdf(-d2_g) - S_avg0 * D_f * normalCdf(-d1_g);
  return { price: pv };
}

export function priceAsian(
  params: AsianParams,
  optionType: OptionType,
  useMC: boolean = true,
  numPaths?: number
): AsianResult {
  if (params.avgType === 'geometric' && !useMC) {
    return priceAsianGeometric(params, optionType);
  }
  return priceAsianMC(params, optionType, numPaths);
}
