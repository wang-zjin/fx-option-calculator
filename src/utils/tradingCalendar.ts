/**
 * 交易日历：周末 + 中国法定节假日，用于 T+2 起息日/交割日顺延
 * 节假日数据可按国务院办公厅通知每年更新
 */

import { parseDate, formatDateForInput } from './dateUtils';

/** 中国法定节假日（YYYY-MM-DD），含调休放假日；可按年度从政府网更新 */
const HOLIDAYS_CN = new Set<string>([
  // 2025
  '2025-01-01',
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04', '2025-02-05',
  '2025-04-04', '2025-04-05', '2025-04-06',
  '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-31', '2025-06-01', '2025-06-02',
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
  // 2026（据国务院办公厅 2026 年节假日安排）
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
  // 2027 预留
  '2027-01-01', '2027-01-02', '2027-01-03',
  '2027-10-01', '2027-10-02', '2027-10-03', '2027-10-04', '2027-10-05', '2027-10-06', '2027-10-07',
]);

function toDateStr(d: Date): string {
  return formatDateForInput(d);
}

/** 是否为周末（周六、周日） */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** 是否为节假日（使用中国法定节假日集合） */
export function isHoliday(dateStr: string, holidays: Set<string> = HOLIDAYS_CN): boolean {
  return holidays.has(dateStr);
}

/** 是否为交易日（非周末且非节假日） */
export function isTradingDay(dateStr: string, holidays: Set<string> = HOLIDAYS_CN): boolean {
  const d = parseDate(dateStr);
  if (isWeekend(d)) return false;
  return !isHoliday(dateStr, holidays);
}

/**
 * 当前日期起加 N 个交易日（遇周末、节假日顺延）
 */
export function addTradingDays(dateStr: string, n: number, holidays: Set<string> = HOLIDAYS_CN): string {
  let d = parseDate(dateStr);
  let count = 0;
  while (count < n) {
    d.setDate(d.getDate() + 1);
    const str = toDateStr(d);
    if (isTradingDay(str, holidays)) count += 1;
  }
  return toDateStr(d);
}

/** 若日期非交易日，则回退到前一交易日（用于到期日 1M 等解析后落在周末/节假日时） */
export function toPreviousTradingDay(dateStr: string, holidays: Set<string> = HOLIDAYS_CN): string {
  let str = dateStr;
  while (!isTradingDay(str, holidays)) {
    const d = parseDate(str);
    d.setDate(d.getDate() - 1);
    str = toDateStr(d);
  }
  return str;
}

export { HOLIDAYS_CN };
