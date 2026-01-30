/**
 * 表单持久化：localStorage 读写，刷新/关页后恢复
 */

const KEY_VANILLA = 'fx-opt-vanilla-form';
const KEY_COMBINATION = 'fx-opt-combination-form';

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
