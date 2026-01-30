/**
 * 标准正态分布 CDF N(x)
 * 用于 Garman-Kohlhagen、数字期权等解析公式
 * A&S 26.2.17：x≥0 时 N(x)=1-φ(x)·y，x<0 时 N(x)=φ(x)·y
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** 标准正态 PDF φ(x) */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * 标准正态 CDF N(x)，采用 Abramowitz & Stegun 26.2.17 近似
 * 精度足够用于期权定价；对 x<0 正确返回 N(x)=φ(x)·y（原实现误用 1-y 导致近平价 Delta 接近 100%）
 */
export function normalCdf(x: number): number {
  if (x >= 6) return 1;
  if (x <= -6) return 0;

  const a = 0.2316419;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const absX = Math.abs(x);
  const t = 1 / (1 + a * absX);
  const phi = Math.exp(-0.5 * x * x) / SQRT_2PI;
  const y = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

  return x >= 0 ? 1 - phi * y : phi * y;
}
