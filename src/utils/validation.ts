/**
 * 表单校验：日期顺序、数值范围
 * 到期日支持 YYYY-MM-DD 或 1M、1Y 等简写（相对当前日期解析）
 */

import { resolveMaturityDate, isDateString } from './dateUtils';

export type ValidationError = Record<string, string>;

export function validateVanillaInput(form: {
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  strike: number;
  r_d: number;
  r_f: number;
  notional: number;
  sigma: number;
}): ValidationError {
  const err: ValidationError = {};
  const maturityResolved = resolveMaturityDate(form.today, form.maturityDate);
  if (!isDateString(maturityResolved)) {
    err.maturityDate = '到期日须为 YYYY-MM-DD 或 1M、1Y 等（如 1M、2M、1Y）';
  }
  const today = new Date(form.today).getTime();
  const premium = new Date(form.premiumDate).getTime();
  const maturity = new Date(maturityResolved).getTime();
  const settlement = new Date(form.settlementDate).getTime();

  if (Number.isNaN(today)) err.today = '当前日期无效';
  if (Number.isNaN(premium)) err.premiumDate = '起息日无效';
  if (Number.isNaN(settlement)) err.settlementDate = '交割日无效';

  if (today > premium) err.premiumDate = err.premiumDate || '起息日必须 ≥ 当前日期';
  if (today > maturity) err.maturityDate = err.maturityDate || '到期日必须 ≥ 当前日期';
  if (premium > maturity) err.maturityDate = err.maturityDate || '到期日必须 ≥ 起息日';
  if (maturity > settlement) err.settlementDate = err.settlementDate || '交割日必须 ≥ 到期日';

  if (form.spot <= 0) err.spot = '即期价格须 > 0';
  if (form.strike <= 0) err.strike = '执行价须 > 0';
  if (form.notional <= 0) err.notional = '名义本金须 > 0';
  if (form.sigma <= 0) err.sigma = '波动率须 > 0';
  if (form.sigma > 2) err.sigma = err.sigma || '波动率建议 ≤ 200%';

  return err;
}

/** 美式期权输入校验：共享与 Vanilla 一致，树步数 2–1000 */
export function validateAmericanInput(form: {
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  strike: number;
  r_d: number;
  r_f: number;
  notional: number;
  sigma: number;
  steps: number;
  treeType?: 'crr' | 'trinomial';
}): ValidationError {
  const err = validateVanillaInput(form);
  const steps = Math.floor(form.steps);
  if (Number.isNaN(steps) || steps < 2) err.steps = '树步数须 ≥ 2';
  if (steps > 1000) err.steps = err.steps || '树步数建议 ≤ 1000，过大影响性能';
  return err;
}

/** 数字期权输入校验：共享与 Vanilla 一致，Cash-or-Nothing 时 D > 0 */
export function validateDigitalInput(form: {
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  strike: number;
  r_d: number;
  r_f: number;
  notional: number;
  sigma: number;
  digitalKind: 'cashOrNothing' | 'assetOrNothing';
  D: number;
}): ValidationError {
  const err = validateVanillaInput(form);
  if (form.digitalKind === 'cashOrNothing' && form.D <= 0) err.D = '支付金额 D 须 > 0';
  return err;
}

/** 组合期权共享输入校验（无单一执行价/波动率） */
export function validateCombinationSharedInput(form: {
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  r_d: number;
  r_f: number;
  notional: number;
}): ValidationError {
  const err: ValidationError = {};
  const maturityResolved = resolveMaturityDate(form.today, form.maturityDate);
  if (!isDateString(maturityResolved)) {
    err.maturityDate = '到期日须为 YYYY-MM-DD 或 1M、1Y 等（如 1M、2M、1Y）';
  }
  const today = new Date(form.today).getTime();
  const premium = new Date(form.premiumDate).getTime();
  const maturity = new Date(maturityResolved).getTime();
  const settlement = new Date(form.settlementDate).getTime();

  if (Number.isNaN(today)) err.today = '当前日期无效';
  if (Number.isNaN(premium)) err.premiumDate = '起息日无效';
  if (Number.isNaN(settlement)) err.settlementDate = '交割日无效';

  if (today > premium) err.premiumDate = err.premiumDate || '起息日必须 ≥ 当前日期';
  if (today > maturity) err.maturityDate = err.maturityDate || '到期日必须 ≥ 当前日期';
  if (premium > maturity) err.maturityDate = err.maturityDate || '到期日必须 ≥ 起息日';
  if (maturity > settlement) err.settlementDate = err.settlementDate || '交割日必须 ≥ 到期日';

  if (form.spot <= 0) err.spot = '即期价格须 > 0';
  if (form.notional <= 0) err.notional = '名义本金须 > 0';
  return err;
}

/** RR 腿校验：执行价与波动率须为正，不强制 strike 与 spot 关系 */
export function validateRRInput(_spot: number, rr: { strikeCall: number; strikePut: number; sigmaCall: number; sigmaPut: number }): ValidationError {
  const err: ValidationError = {};
  if (rr.strikeCall <= 0) err.strikeCall = 'Call 执行价须 > 0';
  if (rr.strikePut <= 0) err.strikePut = 'Put 执行价须 > 0';
  if (rr.sigmaCall <= 0) err.sigmaCall = 'Call 波动率须 > 0';
  if (rr.sigmaPut <= 0) err.sigmaPut = 'Put 波动率须 > 0';
  return err;
}

/** 海鸥腿校验：执行价须为正且 K_low < K_mid，不强制与即期关系 */
export function validateSeagullInput(_spot: number, sg: { strikeCall: number; strikePutMid: number; strikePutLow: number; sigmaCall: number; sigmaPutMid: number; sigmaPutLow: number }): ValidationError {
  const err: ValidationError = {};
  if (sg.strikePutLow >= sg.strikePutMid) err.strikePutLow = 'Put 执行价（低）须 < Put 执行价（中）';
  if (sg.strikeCall <= 0) err.strikeCall = 'Call 执行价须 > 0';
  if (sg.strikePutMid <= 0) err.strikePutMid = 'Put 执行价（中）须 > 0';
  if (sg.strikePutLow <= 0) err.strikePutLow = err.strikePutLow || 'Put 执行价（低）须 > 0';
  if (sg.sigmaCall <= 0) err.sigmaCall = 'Call 波动率须 > 0';
  if (sg.sigmaPutMid <= 0) err.sigmaPutMid = 'Put 中腿波动率须 > 0';
  if (sg.sigmaPutLow <= 0) err.sigmaPutLow = 'Put 低腿波动率须 > 0';
  return err;
}
