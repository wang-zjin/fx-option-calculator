/**
 * 表单持久化：localStorage 读写，刷新/关页后恢复
 * 按币种记忆：切换币种时保留当前币种配置，切回时恢复该币种上次的即期、波动率等
 */

const KEY_VANILLA = 'fx-opt-vanilla-form';
const KEY_VANILLA_BY_CURRENCY = 'fx-opt-vanilla-by-currency';
const KEY_COMBINATION = 'fx-opt-combination-form';
const KEY_COMBINATION_BY_CURRENCY = 'fx-opt-combination-by-currency';

export function getVanillaForm<T>(defaultValue: T): T {
  try {
    const raw = localStorage.getItem(KEY_VANILLA);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'currencyPair' in parsed && 'spot' in parsed) {
      return parsed as T;
    }
  } catch {
    // ignore
  }
  return defaultValue;
}

export function setVanillaForm(data: unknown): void {
  try {
    localStorage.setItem(KEY_VANILLA, JSON.stringify(data));
  } catch {
    // ignore quota / private mode
  }
}

/** 按币种读取 Vanilla 表单缓存（切换回该币种时恢复） */
export function getVanillaForms(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY_VANILLA_BY_CURRENCY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

export function setVanillaForms(forms: Record<string, unknown>): void {
  try {
    localStorage.setItem(KEY_VANILLA_BY_CURRENCY, JSON.stringify(forms));
  } catch {
    // ignore
  }
}

export function getCombinationForm<T>(defaultValue: T): T {
  try {
    const raw = localStorage.getItem(KEY_COMBINATION);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'shared' in parsed &&
      'rr' in parsed &&
      'seagull' in parsed
    ) {
      return parsed as T;
    }
  } catch {
    // ignore
  }
  return defaultValue;
}

export function setCombinationForm(data: unknown): void {
  try {
    localStorage.setItem(KEY_COMBINATION, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** 按币种读取组合表单缓存（切换回该币种时恢复 shared/rr/seagull 等） */
export function getCombinationForms(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(KEY_COMBINATION_BY_CURRENCY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

export function setCombinationForms(forms: Record<string, unknown>): void {
  try {
    localStorage.setItem(KEY_COMBINATION_BY_CURRENCY, JSON.stringify(forms));
  } catch {
    // ignore
  }
}
