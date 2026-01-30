/**
 * 组合期权定价：RR（风险逆转）、海鸥
 * 每腿为欧式 Vanilla，调用 Garman-Kohlhagen；组合价格与 Greeks 为各腿按符号加总。
 */

import { priceAndGreeks } from '../vanilla/garmanKohlhagen';
import type {
  CombinationType,
  CombinationSharedParams,
  CombinationResult,
  RRParams,
  SeagullParams,
  GKParams,
  VanillaResult,
} from '../types';

function buildGKParams(
  shared: CombinationSharedParams,
  K: number,
  sigma: number
): GKParams {
  return {
    S: shared.S,
    K,
    T: shared.T,
    T2: shared.T2,
    r_d: shared.r_d,
    r_f: shared.r_f,
    sigma,
  };
}

/** 单腿结果 × 系数，加总到组合 */
function addLeg(
  acc: CombinationResult,
  coef: number,
  leg: VanillaResult,
  label: string,
  withLegs: boolean
): void {
  acc.price += coef * leg.price;
  acc.delta += coef * leg.delta;
  acc.gamma += coef * (leg.gamma ?? 0);
  acc.vega += coef * leg.vega;
  acc.theta += coef * leg.theta;
  const bump = leg.timeDecayBump ?? 0;
  acc.timeDecayBump = (acc.timeDecayBump ?? 0) + coef * bump;
  acc.rho_d += coef * (leg.rho_d ?? 0);
  acc.rho_f += coef * (leg.rho_f ?? 0);
  if (withLegs && acc.legs) {
    acc.legs.push({
      label,
      price: coef * leg.price,
      delta: coef * leg.delta,
      gamma: coef * (leg.gamma ?? 0),
      vega: coef * leg.vega,
      theta: coef * leg.theta,
      rho_d: coef * (leg.rho_d ?? 0),
      rho_f: coef * (leg.rho_f ?? 0),
    });
  }
}

/** RR（风险逆转）：Long RR = +Call(K_call) − Put(K_put)，Short RR = −Call + Put；两腿共用同一 T/T2，仅 K/σ 不同 */
export function priceRR(
  shared: CombinationSharedParams,
  rr: RRParams,
  options?: { withLegs?: boolean }
): CombinationResult {
  const withLegs = options?.withLegs ?? false;
  const acc: CombinationResult = {
    price: 0,
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
    timeDecayBump: 0,
    rho_d: 0,
    rho_f: 0,
    ...(withLegs ? { legs: [] } : {}),
  };

  const callParams = buildGKParams(shared, rr.strikeCall, rr.sigmaCall);
  const putParams = buildGKParams(shared, rr.strikePut, rr.sigmaPut);
  const legCall = priceAndGreeks(callParams, 'call');
  const legPut = priceAndGreeks(putParams, 'put');

  if (rr.direction === 'long') {
    addLeg(acc, 1, legCall, 'Call(K_call)', withLegs);
    addLeg(acc, -1, legPut, 'Put(K_put)', withLegs);
  } else {
    addLeg(acc, -1, legCall, 'Call(K_call)', withLegs);
    addLeg(acc, 1, legPut, 'Put(K_put)', withLegs);
  }
  return acc;
}

/** 海鸥：+Call(K_high) − Put(K_mid) − Put(K_low) */
export function priceSeagull(
  shared: CombinationSharedParams,
  sg: SeagullParams,
  options?: { withLegs?: boolean }
): CombinationResult {
  const withLegs = options?.withLegs ?? false;
  const acc: CombinationResult = {
    price: 0,
    delta: 0,
    gamma: 0,
    vega: 0,
    theta: 0,
    timeDecayBump: 0,
    rho_d: 0,
    rho_f: 0,
    ...(withLegs ? { legs: [] } : {}),
  };

  const leg1 = priceAndGreeks(
    buildGKParams(shared, sg.strikeCall, sg.sigmaCall),
    'call'
  );
  const leg2 = priceAndGreeks(
    buildGKParams(shared, sg.strikePutMid, sg.sigmaPutMid),
    'put'
  );
  const leg3 = priceAndGreeks(
    buildGKParams(shared, sg.strikePutLow, sg.sigmaPutLow),
    'put'
  );

  addLeg(acc, 1, leg1, 'Call(K_high)', withLegs);
  addLeg(acc, -1, leg2, 'Put(K_mid)', withLegs);
  addLeg(acc, -1, leg3, 'Put(K_low)', withLegs);
  return acc;
}

/** 统一入口：按组合类型调用 RR 或海鸥 */
export function priceCombination(
  type: CombinationType,
  shared: CombinationSharedParams,
  legParams: RRParams | SeagullParams,
  options?: { withLegs?: boolean }
): CombinationResult {
  if (type === 'rr') {
    return priceRR(shared, legParams as RRParams, options);
  }
  return priceSeagull(shared, legParams as SeagullParams, options);
}
