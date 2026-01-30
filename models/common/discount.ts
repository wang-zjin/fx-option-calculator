/**
 * 折现因子
 * 连续复利：DF = e^{-r*T}
 */

/**
 * 本币折现因子 e^{-r_d * T}
 */
export function discountDomestic(r_d: number, T: number): number {
  return Math.exp(-r_d * T);
}

/**
 * 外币折现因子 e^{-r_f * T}
 */
export function discountForeign(r_f: number, T: number): number {
  return Math.exp(-r_f * T);
}
