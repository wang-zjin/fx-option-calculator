/**
 * 日期与期限工具：T1 = (到期日−当前日期)/365，T2 = (交割日−起息日)/365
 * 起息/交割 T+2 使用交易日（见 tradingCalendar），周末与节假日顺延
 */

export function parseDate(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) throw new Error('无效日期');
  return d;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** 日历日加 N 天（仅用于到期日 1M/1Y 等；起息/交割 T+2 用 addTradingDays） */
export function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDateForInput(d);
}

/** 加 N 个月（同一天或月末：如 1 月 30 日 +1 月 = 2 月 28 日，避免卷到 3 月） */
export function addMonths(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  if (d.getDate() !== day) {
    d.setDate(0); // 溢出时取目标月最后一天（如 1 月 30 日 +1 月 → 2 月 28 日）
  }
  return formatDateForInput(d);
}

/** 加 N 年 */
export function addYears(dateStr: string, n: number): string {
  const d = parseDate(dateStr);
  d.setFullYear(d.getFullYear() + n);
  return formatDateForInput(d);
}

/** 解析到期日简写：1M=1个月后，1Y=1年后等；返回 null 表示非简写 */
function parseMaturityShorthand(input: string): { months?: number; years?: number } | null {
  const t = input.trim().toUpperCase();
  const m = t.match(/^(\d+)M$/);
  if (m) return { months: Number(m[1]) };
  const y = t.match(/^(\d+)Y$/);
  if (y) return { years: Number(y[1]) };
  return null;
}

/**
 * 将到期日输入解析为 YYYY-MM-DD：支持 1M、1Y 等（相对当前日期），或直接日期
 */
export function resolveMaturityDate(todayStr: string, maturityInput: string): string {
  const sh = parseMaturityShorthand(maturityInput);
  if (sh) {
    if (sh.months != null) return addMonths(todayStr, sh.months);
    if (sh.years != null) return addYears(todayStr, sh.years);
  }
  return maturityInput;
}

/** 判断是否为 YYYY-MM-DD 格式的日期字符串 */
export function isDateString(s: string): boolean {
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/** 年化期限 T1：到期日 − 当前日期，单位年 */
export function t1Years(today: string, maturityDate: string): number {
  const t = parseDate(today);
  const m = parseDate(maturityDate);
  return daysBetween(t, m) / 365;
}

/** 年化期限 T2：交割日 − 起息日，单位年 */
export function t2Years(premiumDate: string, settlementDate: string): number {
  const p = parseDate(premiumDate);
  const s = parseDate(settlementDate);
  return daysBetween(p, s) / 365;
}

export function formatDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 获取今天 YYYY-MM-DD（本地日期） */
export function todayString(): string {
  const d = new Date();
  return formatDateForInput(d);
}
