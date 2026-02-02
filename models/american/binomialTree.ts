/**
 * 美式期权定价：二叉树（CRR）与三叉树
 *
 * === 数学模型（外汇 Garman-Kohlhagen 框架）===
 *
 * 1) Cox-Ross-Rubinstein (CRR) 二叉树
 *    - 每步时长 Δt = T / n，标的 S 上行乘数 u、下行乘数 d：
 *      u = exp(σ√Δt)，  d = 1/u
 *    - 风险中性概率（与 Garman-Kohlhagen 一致，漂移 r_d - r_f）：
 *      q = (exp((r_d - r_f)Δt) - d) / (u - d)
 *    - 单步贴现因子：e^{-r_d·Δt}
 *    - 节点价值：持有价值 = e^{-r_d·Δt} [ q·V_up + (1-q)·V_down ]，
 *      美式行权价值 = max(内在价值, 持有价值)
 *
 * 2) 三叉树（Trinomial）
 *    - 每步三种状态：上行 u、平走 1、下行 d：
 *      u = exp(σ√(2Δt))，  d = 1/u
 *    - 风险中性概率 pu, pm, pd 由一、二阶矩匹配得到：
 *      pu·u + pm·1 + pd·d = exp((r_d - r_f)Δt)
 *      pu·u² + pm + pd·d² = exp(2(r_d - r_f)Δt + σ²Δt)
 *      pu + pm + pd = 1
 *    - 单步贴现：e^{-r_d·Δt}，向后归纳同二叉树
 *
 * 3) 美式看涨：无股息/无离散利息时最优不提前行权，价格 = 欧式看涨。
 *    美式看跌：可能提前行权，价格 ≥ 欧式看跌；可输出早期行权边界 S*(t)。
 */

import type {
  AmericanParams,
  AmericanResult,
  EarlyExerciseBoundaryPoint,
  OptionType,
} from '../types';
import { pricePut as europeanPut, priceCall as europeanCall } from '../vanilla/garmanKohlhagen';

const DEFAULT_STEPS = 200;

// ---------- CRR 二叉树 ----------

function crrAmericanPut(
  params: AmericanParams,
  steps: number
): { price: number; boundary?: EarlyExerciseBoundaryPoint[] } {
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

  const boundary: EarlyExerciseBoundaryPoint[] = [];
  for (let n = steps - 1; n >= 0; n--) {
    let boundaryS: number | null = null;
    for (let i = 0; i <= n; i++) {
      const hold = discount * (q * prices[i] + (1 - q) * prices[i + 1]);
      const spot = S * Math.pow(u, n - i) * Math.pow(d, i);
      const intrinsic = Math.max(K - spot, 0);
      const exercise = intrinsic > hold;
      prices[i] = Math.max(intrinsic, hold);
      if (exercise && boundaryS === null) boundaryS = spot;
    }
    if (boundaryS !== null) {
      boundary.push({ t: (steps - n) * dt, S: boundaryS });
    }
  }
  return { price: prices[0], boundary: boundary.length ? boundary : undefined };
}

function crrAmericanCall(params: AmericanParams, steps: number): number {
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

// ---------- 三叉树（矩匹配）----------

function trinomialProbs(
  r_d: number,
  r_f: number,
  sigma: number,
  dt: number
): { pu: number; pm: number; pd: number; u: number; d: number } {
  const u = Math.exp(sigma * Math.sqrt(2 * dt));
  const d = 1 / u;
  const m = Math.exp((r_d - r_f) * dt);
  const v = m * m * Math.exp(sigma * sigma * dt);
  const A = u - 1;
  const B = d - 1;
  const C = u * u - 1;
  const D = d * d - 1;
  const denom = A * D - B * C;
  const pu = ((m - 1) * D - (v - 1) * B) / denom;
  const pd = ((v - 1) * A - (m - 1) * C) / denom;
  const pm = 1 - pu - pd;
  return { pu: Math.max(0, Math.min(1, pu)), pm: Math.max(0, Math.min(1, pm)), pd: Math.max(0, Math.min(1, pd)), u, d };
}

function trinomialAmericanPut(
  params: AmericanParams,
  steps: number
): { price: number; boundary?: EarlyExerciseBoundaryPoint[] } {
  const { S, K, T, r_d, r_f, sigma } = params;
  const dt = T / steps;
  const { pu, pm, pd, u, d } = trinomialProbs(r_d, r_f, sigma, dt);
  const discount = Math.exp(-r_d * dt);

  const nNodes = 2 * steps + 1;
  let prices: number[] = new Array(nNodes);
  for (let i = 0; i < nNodes; i++) {
    const j = i - steps;
    const spot = S * Math.pow(u, Math.max(0, j)) * Math.pow(d, Math.max(0, -j));
    prices[i] = Math.max(K - spot, 0);
  }

  const boundary: EarlyExerciseBoundaryPoint[] = [];
  for (let n = steps - 1; n >= 0; n--) {
    const width = 2 * n + 1;
    const next: number[] = new Array(width);
    let boundaryS: number | null = null;
    for (let i = 0; i < width; i++) {
      const hold =
        discount * (pu * prices[i] + pm * prices[i + 1] + pd * prices[i + 2]);
      const j = i - n;
      const spot = S * Math.pow(u, Math.max(0, j)) * Math.pow(d, Math.max(0, -j));
      const intrinsic = Math.max(K - spot, 0);
      if (intrinsic > hold) boundaryS = spot;
      next[i] = Math.max(intrinsic, hold);
    }
    prices = next;
    if (boundaryS !== null) {
      boundary.push({ t: (steps - n) * dt, S: boundaryS });
    }
  }
  return { price: prices[0], boundary: boundary.length ? boundary : undefined };
}

function trinomialAmericanCall(params: AmericanParams, steps: number): number {
  const { S, K, T, r_d, r_f, sigma } = params;
  const dt = T / steps;
  const { pu, pm, pd, u, d } = trinomialProbs(r_d, r_f, sigma, dt);
  const discount = Math.exp(-r_d * dt);

  const nNodes = 2 * steps + 1;
  let prices: number[] = new Array(nNodes);
  for (let i = 0; i < nNodes; i++) {
    const j = i - steps;
    const spot = S * Math.pow(u, Math.max(0, j)) * Math.pow(d, Math.max(0, -j));
    prices[i] = Math.max(spot - K, 0);
  }

  for (let n = steps - 1; n >= 0; n--) {
    const width = 2 * n + 1;
    const next: number[] = new Array(width);
    for (let i = 0; i < width; i++) {
      const hold =
        discount * (pu * prices[i] + pm * prices[i + 1] + pd * prices[i + 2]);
      const j = i - n;
      const spot = S * Math.pow(u, Math.max(0, j)) * Math.pow(d, Math.max(0, -j));
      next[i] = Math.max(spot - K, hold);
    }
    prices = next;
  }
  return prices[0];
}

// ---------- 树类型分发 ----------

function americanPutPrice(
  params: AmericanParams,
  steps: number
): { price: number; boundary?: EarlyExerciseBoundaryPoint[] } {
  return params.treeType === 'trinomial'
    ? trinomialAmericanPut(params, steps)
    : crrAmericanPut(params, steps);
}

function americanCallPrice(params: AmericanParams, steps: number): number {
  return params.treeType === 'trinomial'
    ? trinomialAmericanCall(params, steps)
    : crrAmericanCall(params, steps);
}

// ---------- 数值 Greeks ----------

/** S 的 bump：0.00001（即 S 的十万分之一） */
const BUMP_S_PCT = 0.00001;
/** 波动率 σ 的 bump：0.0001（即 1bp） */
const BUMP_SIGMA = 0.0001;

function priceAmericanPutRaw(
  params: AmericanParams,
  steps: number
): { price: number; boundary?: EarlyExerciseBoundaryPoint[] } {
  return americanPutPrice(params, steps);
}

function priceAmericanCallRaw(params: AmericanParams, steps: number): number {
  return americanCallPrice(params, steps);
}

function deltaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  hPct: number = BUMP_S_PCT
): number {
  const h = params.S * hPct;
  const up = { ...params, S: params.S + h };
  const down = { ...params, S: params.S - h };
  const priceUp =
    optionType === 'call'
      ? priceAmericanCallRaw(up, steps)
      : priceAmericanPutRaw(up, steps).price;
  const priceDown =
    optionType === 'call'
      ? priceAmericanCallRaw(down, steps)
      : priceAmericanPutRaw(down, steps).price;
  return (priceUp - priceDown) / (2 * h);
}

function gammaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  hPct: number = BUMP_S_PCT
): number {
  const h = params.S * hPct;
  const up = { ...params, S: params.S + h };
  const down = { ...params, S: params.S - h };
  const priceUp =
    optionType === 'call'
      ? priceAmericanCallRaw(up, steps)
      : priceAmericanPutRaw(up, steps).price;
  const priceDown =
    optionType === 'call'
      ? priceAmericanCallRaw(down, steps)
      : priceAmericanPutRaw(down, steps).price;
  const priceC = optionType === 'call'
    ? priceAmericanCallRaw(params, steps)
    : priceAmericanPutRaw(params, steps).price;
  const gammaRaw = (priceUp - 2 * priceC + priceDown) / (h * h);
  return gammaRaw * 0.01 * params.S;
}

/** Vega：∂V/∂σ，按 1% 波动率变化（与 Vanilla 一致，除以 100） */
function vegaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  bumpSigma: number = BUMP_SIGMA
): number {
  const up = { ...params, sigma: params.sigma + bumpSigma };
  const priceUp =
    optionType === 'call'
      ? priceAmericanCallRaw(up, steps)
      : priceAmericanPutRaw(up, steps).price;
  const priceC =
    optionType === 'call'
      ? priceAmericanCallRaw(params, steps)
      : priceAmericanPutRaw(params, steps).price;
  const vegaRaw = (priceUp - priceC) / bumpSigma;
  return vegaRaw / 100;
}

function thetaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  bumpDay: number = 1
): number {
  const bumpT = bumpDay / 365;
  const TDown = Math.max(1e-6, params.T - bumpT);
  const paramsDown = { ...params, T: TDown };
  const stepsDown = Math.max(2, Math.round((TDown / params.T) * steps));
  const priceDown =
    optionType === 'call'
      ? priceAmericanCallRaw(paramsDown, stepsDown)
      : priceAmericanPutRaw(paramsDown, stepsDown).price;
  const priceC =
    optionType === 'call'
      ? priceAmericanCallRaw(params, steps)
      : priceAmericanPutRaw(params, steps).price;
  return (priceDown - priceC) / bumpDay;
}

/** Vanna：∂²V/(∂S∂σ)，按 1% vol（与 Vanilla 一致，除以 100） */
function vannaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  hPct: number = BUMP_S_PCT,
  bumpSigma: number = BUMP_SIGMA
): number {
  const h = params.S * hPct;
  const sigmaDown = Math.max(params.sigma - bumpSigma, 1e-6);
  const pp = { ...params, S: params.S + h, sigma: params.sigma + bumpSigma };
  const pm = { ...params, S: params.S - h, sigma: params.sigma + bumpSigma };
  const mp = { ...params, S: params.S + h, sigma: sigmaDown };
  const mm = { ...params, S: params.S - h, sigma: sigmaDown };
  const price = (p: AmericanParams) =>
    optionType === 'call' ? priceAmericanCallRaw(p, steps) : priceAmericanPutRaw(p, steps).price;
  const vannaRaw = (price(pp) - price(pm) - price(mp) + price(mm)) / (4 * h * bumpSigma);
  return vannaRaw / 100;
}

/** Volga：∂²V/∂σ²，按 1% vol（与 Vanilla 一致，除以 100） */
function volgaNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  bumpSigma: number = BUMP_SIGMA
): number {
  const sigmaDown = Math.max(params.sigma - bumpSigma, 1e-6);
  const up = { ...params, sigma: params.sigma + bumpSigma };
  const down = { ...params, sigma: sigmaDown };
  const priceUp = optionType === 'call' ? priceAmericanCallRaw(up, steps) : priceAmericanPutRaw(up, steps).price;
  const priceDown = optionType === 'call' ? priceAmericanCallRaw(down, steps) : priceAmericanPutRaw(down, steps).price;
  const priceC = optionType === 'call' ? priceAmericanCallRaw(params, steps) : priceAmericanPutRaw(params, steps).price;
  const volgaRaw = (priceUp - 2 * priceC + priceDown) / (bumpSigma * bumpSigma);
  return volgaRaw / 100;
}

/** Time Decay：Bump T ±1 天，(V(T−1/365)−V(T+1/365))/2，与 Vanilla Bump T1 一致 */
function timeDecayBumpNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number
): number {
  const dt = 1 / 365;
  const TUp = params.T + dt;
  const TDown = Math.max(1e-6, params.T - dt);
  const stepsUp = Math.max(2, Math.round((TUp / params.T) * steps));
  const stepsDown = Math.max(2, Math.round((TDown / params.T) * steps));
  const paramsUp = { ...params, T: TUp };
  const paramsDown = { ...params, T: TDown };
  const priceUp = optionType === 'call' ? priceAmericanCallRaw(paramsUp, stepsUp) : priceAmericanPutRaw(paramsUp, stepsUp).price;
  const priceDown = optionType === 'call' ? priceAmericanCallRaw(paramsDown, stepsDown) : priceAmericanPutRaw(paramsDown, stepsDown).price;
  return (priceDown - priceUp) / 2;
}

/** Rho_d：∂V/∂r_d，按 1% 利率（与 Vanilla 一致，除以 100） */
function rhoDNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  bumpR: number = 0.01
): number {
  const up = { ...params, r_d: params.r_d + bumpR };
  const priceUp = optionType === 'call' ? priceAmericanCallRaw(up, steps) : priceAmericanPutRaw(up, steps).price;
  const priceC = optionType === 'call' ? priceAmericanCallRaw(params, steps) : priceAmericanPutRaw(params, steps).price;
  const raw = (priceUp - priceC) / bumpR;
  return raw / 100;
}

/** Rho_f（Phi）：∂V/∂r_f，按 1% 利率（与 Vanilla 一致，除以 100） */
function rhoFNumerical(
  params: AmericanParams,
  optionType: OptionType,
  steps: number,
  bumpR: number = 0.01
): number {
  const up = { ...params, r_f: params.r_f + bumpR };
  const priceUp = optionType === 'call' ? priceAmericanCallRaw(up, steps) : priceAmericanPutRaw(up, steps).price;
  const priceC = optionType === 'call' ? priceAmericanCallRaw(params, steps) : priceAmericanPutRaw(params, steps).price;
  const raw = (priceUp - priceC) / bumpR;
  return raw / 100;
}

// ---------- 对外 API ----------

export function priceAmericanPut(params: AmericanParams): AmericanResult {
  const steps = params.steps ?? DEFAULT_STEPS;
  const { price: americanPrice, boundary } = priceAmericanPutRaw(params, steps);
  const europeanPrice = europeanPut(params);
  const result: AmericanResult = {
    price: americanPrice,
    earlyExercisePremium: americanPrice - europeanPrice,
    delta: deltaNumerical(params, 'put', steps),
    gamma: gammaNumerical(params, 'put', steps),
    vega: vegaNumerical(params, 'put', steps),
    theta: thetaNumerical(params, 'put', steps),
    vanna: vannaNumerical(params, 'put', steps),
    volga: volgaNumerical(params, 'put', steps),
    timeDecayBump: timeDecayBumpNumerical(params, 'put', steps),
    rho_d: rhoDNumerical(params, 'put', steps),
    rho_f: rhoFNumerical(params, 'put', steps),
  };
  if (boundary?.length) result.earlyExerciseBoundary = boundary;
  return result;
}

export function priceAmericanCall(params: AmericanParams): AmericanResult {
  const steps = params.steps ?? DEFAULT_STEPS;
  const americanPrice = priceAmericanCallRaw(params, steps);
  const europeanPrice = europeanCall(params);
  return {
    price: americanPrice,
    earlyExercisePremium: americanPrice - europeanPrice,
    delta: deltaNumerical(params, 'call', steps),
    gamma: gammaNumerical(params, 'call', steps),
    vega: vegaNumerical(params, 'call', steps),
    theta: thetaNumerical(params, 'call', steps),
    vanna: vannaNumerical(params, 'call', steps),
    volga: volgaNumerical(params, 'call', steps),
    timeDecayBump: timeDecayBumpNumerical(params, 'call', steps),
    rho_d: rhoDNumerical(params, 'call', steps),
    rho_f: rhoFNumerical(params, 'call', steps),
  };
}

export function priceAmerican(
  params: AmericanParams,
  optionType: OptionType
): AmericanResult {
  return optionType === 'call'
    ? priceAmericanCall(params)
    : priceAmericanPut(params);
}
