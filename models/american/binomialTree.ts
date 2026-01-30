/**
 * 美式期权定价：Cox-Ross-Rubinstein 二叉树
 * 外汇版：每节点用 r_d、r_f 贴现，与 Garman-Kohlhagen 一致
 * 美式看涨无股息时等于欧式；美式看跌需每节点比较提前行权与持有价值
 */

import type { AmericanParams, AmericanResult, OptionType } from '../types';
import { pricePut as europeanPut, priceCall as europeanCall } from '../vanilla/garmanKohlhagen';

const DEFAULT_STEPS = 200;

function binomialAmericanPut(params: AmericanParams, steps: number): number {
  const { S, K, T, r_d, r_f, sigma } = params;
  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const q = (Math.exp((r_d - r_f) * dt) - d) / (u - d);
  const discount = Math.exp(-r_d * dt);

  const prices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const spot = S * Math.pow(u, steps - i) * Math.pow(d, i);
    prices[i] = Math.max(K - spot, 0);
  }

  for (let n = steps - 1; n >= 0; n--) {
    for (let i = 0; i <= n; i++) {
      const hold = discount * (q * prices[i] + (1 - q) * prices[i + 1]);
      const spot = S * Math.pow(u, n - i) * Math.pow(d, i);
      prices[i] = Math.max(K - spot, hold);
    }
  }
  return prices[0];
}

function binomialAmericanCall(params: AmericanParams, steps: number): number {
  const { S, K, T, r_d, r_f, sigma } = params;
  const dt = T / steps;
  const u = Math.exp(sigma * Math.sqrt(dt));
  const d = 1 / u;
  const q = (Math.exp((r_d - r_f) * dt) - d) / (u - d);
  const discount = Math.exp(-r_d * dt);

  const prices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const spot = S * Math.pow(u, steps - i) * Math.pow(d, i);
    prices[i] = Math.max(spot - K, 0);
  }

  for (let n = steps - 1; n >= 0; n--) {
    for (let i = 0; i <= n; i++) {
      const hold = discount * (q * prices[i] + (1 - q) * prices[i + 1]);
      const spot = S * Math.pow(u, n - i) * Math.pow(d, i);
      prices[i] = Math.max(spot - K, hold);
    }
  }
  return prices[0];
}

/** 数值 Delta：中心差分 (V(S+h)-V(S-h))/(2h) */
function deltaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  hPct: number = 0.001
): number {
  const h = params.S * hPct;
  const up = { ...params, S: params.S + h };
  const down = { ...params, S: params.S - h };
  const priceUp = optionType === 'call' ? binomialAmericanCall(up, steps) : binomialAmericanPut(up, steps);
  const priceDown = optionType === 'call' ? binomialAmericanCall(down, steps) : binomialAmericanPut(down, steps);
  return (priceUp - priceDown) / (2 * h);
}

export function priceAmericanPut(params: AmericanParams): AmericanResult {
  const steps = params.steps ?? DEFAULT_STEPS;
  const americanPrice = binomialAmericanPut(params, steps);
  const europeanPrice = europeanPut(params);
  return {
    price: americanPrice,
    earlyExercisePremium: americanPrice - europeanPrice,
    delta: deltaNumerical(params, 'put', steps),
  };
}

export function priceAmericanCall(params: AmericanParams): AmericanResult {
  const steps = params.steps ?? DEFAULT_STEPS;
  const americanPrice = binomialAmericanCall(params, steps);
  const europeanPrice = europeanCall(params);
  return {
    price: americanPrice,
    earlyExercisePremium: americanPrice - europeanPrice,
    delta: deltaNumerical(params, 'call', steps),
  };
}

export function priceAmerican(params: AmericanParams, optionType: OptionType): AmericanResult {
  return optionType === 'call' ? priceAmericanCall(params) : priceAmericanPut(params);
}
