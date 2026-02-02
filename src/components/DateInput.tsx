/**
 * 日期输入：支持手输与日历选择，统一各页日期控件样式
 * - 普通日期（当前日期、起息日、交割日）：input type="date" + 右侧日历图标触发选择
 * - 到期日（maturityMode）：input type="text" 支持 YYYY-MM-DD 或 1M/1Y + 日历图标
 */

import React, { useRef, useCallback } from 'react';

const baseInputStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.875rem',
  flex: 1,
  minWidth: 0,
};

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.875rem',
  background: '#fff',
};

const iconButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#555',
};

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** 到期日模式：文本框可输入 YYYY-MM-DD 或 1M/1Y，onBlur 时由父组件解析 */
  maturityMode?: boolean;
  onBlur?: () => void;
  min?: string;
  max?: string;
  id?: string;
  title?: string;
  style?: React.CSSProperties;
};

export function DateInput({
  value,
  onChange,
  maturityMode = false,
  onBlur,
  min,
  max,
  id,
  title,
  style,
}: DateInputProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openPicker = useCallback(() => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
    }
  }, []);

  if (maturityMode) {
    const isStrictDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return (
      <div style={{ ...wrapperStyle, ...style }} title={title}>
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="YYYY-MM-DD 或 1M、1Y"
          style={{
            ...baseInputStyle,
            border: 'none',
            borderRadius: 0,
          }}
        />
        <input
          ref={dateInputRef}
          type="date"
          aria-hidden="true"
          tabIndex={-1}
          value={isStrictDate ? value : ''}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: 'absolute',
            opacity: 0,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
        <button type="button" onClick={openPicker} style={iconButtonStyle} title="选择日期">
          <CalendarIcon />
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle, ...style }} title={title}>
      <input
        ref={dateInputRef}
        type="date"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        style={{
          ...baseInputStyle,
          border: 'none',
          borderRadius: 0,
          WebkitAppearance: 'none',
        }}
        className="date-input-native"
      />
      <button type="button" onClick={openPicker} style={iconButtonStyle} title="选择日期">
        <CalendarIcon />
      </button>
    </div>
  );
}
