import { useState, useCallback } from 'react';
import { priceDigitalWithGreeks } from '@models';
import type { DigitalParams, DigitalResult, OptionType, LongOrShort } from '@models';
import { t1Years, t2Years, todayString, addMonths, resolveMaturityDate } from '../utils/dateUtils';
import { addTradingDays, toPreviousTradingDay } from '../utils/tradingCalendar';
import { validateDigitalInput } from '../utils/validation';
import { CURRENCY_PAIRS, CURRENCY_TEMPLATES } from '../constants/currencyTemplates';

type DigitalKind = 'cashOrNothing' | 'assetOrNothing';
type PayoffCurrency = 'domestic' | 'foreign';

type FormState = {
  currencyPair: string;
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  strike: number;
  r_d: number;
  r_f: number;
  notional: number;
  longOrShort: LongOrShort;
  optionType: OptionType;
  sigma: number;
  digitalKind: DigitalKind;
  D: number;
  payoffCurrency: PayoffCurrency;
};

const defaultFormBase: Omit<FormState, 'today' | 'premiumDate' | 'maturityDate' | 'settlementDate'> = {
  currencyPair: 'EURUSD',
  ...CURRENCY_TEMPLATES['EURUSD'],
  longOrShort: 'long',
  optionType: 'call',
  sigma: 0.06,
  digitalKind: 'cashOrNothing',
  D: 1,
  payoffCurrency: 'domestic',
};

function getInitialForm(): FormState {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  return { ...defaultFormBase, today, premiumDate, maturityDate, settlementDate };
}

const formStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
};
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const labelStyle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 500 };
const inputStyle: React.CSSProperties = {
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: '6px',
  fontSize: '0.875rem',
};
const errorStyle: React.CSSProperties = { color: '#c00', fontSize: '0.75rem' };
const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '8px',
  padding: '1.25rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const resultGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '0.75rem',
};
const resultItem: React.CSSProperties = { padding: '0.5rem 0', borderBottom: '1px solid #eee', fontSize: '0.875rem' };

export function DigitalPricing() {
  const [form, setForm] = useState<FormState>(getInitialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    optionPrice: number;
    premium: number;
    premiumPct: number;
    delta: number;
    deltaPosition: number;
    gamma: number | undefined;
    vega: number | undefined;
    vegaPosition: number | undefined;
    theta: number | undefined;
    thetaPosition: number | undefined;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const update = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
    setCalcError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateDigitalInput(form);
      if (Object.keys(err).length > 0) {
        setErrors(err);
        return;
      }
      setErrors({});
      setLoading(true);
      setCalcError(null);
      try {
        const maturityResolved = resolveMaturityDate(form.today, form.maturityDate);
        const T1 = t1Years(form.today, maturityResolved);
        const T2 = t2Years(form.premiumDate, form.settlementDate);
        const params: DigitalParams = {
          S: form.spot,
          K: form.strike,
          T: T1,
          T2,
          r_d: form.r_d,
          r_f: form.r_f,
          sigma: form.sigma,
          D: form.digitalKind === 'cashOrNothing' ? form.D : 1,
          payoffCurrency: form.digitalKind === 'cashOrNothing' ? form.payoffCurrency : 'foreign',
          digitalKind: form.digitalKind,
        };
        const raw: DigitalResult = priceDigitalWithGreeks(params, form.optionType);
        const sign = form.longOrShort === 'long' ? 1 : -1;
        const premium = raw.price * form.notional;
        const premiumPct = (raw.price / form.spot) * 100;
        setResult({
          optionPrice: raw.price,
          premium,
          premiumPct,
          delta: raw.delta ?? 0,
          deltaPosition: (raw.delta ?? 0) * form.notional * sign,
          gamma: raw.gamma,
          vega: raw.vega,
          vegaPosition: raw.vega != null ? raw.vega * form.notional * sign : undefined,
          theta: raw.theta,
          thetaPosition: raw.theta != null ? raw.theta * form.notional * sign : undefined,
        });
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : '计算失败');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [form]
  );

  const isCash = form.digitalKind === 'cashOrNothing';

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>共享参数</h2>
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>货币对</label>
              <select style={inputStyle} value={form.currencyPair} onChange={(e) => update('currencyPair', e.target.value)}>
                {CURRENCY_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>当前日期</label>
              <input type="date" style={inputStyle} value={form.today} onChange={(e) => update('today', e.target.value)} />
              {errors.today && <span style={errorStyle}>{errors.today}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>起息日</label>
              <input type="date" style={inputStyle} value={form.premiumDate} onChange={(e) => update('premiumDate', e.target.value)} />
              {errors.premiumDate && <span style={errorStyle}>{errors.premiumDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>到期日</label>
              <input type="text" style={inputStyle} placeholder="YYYY-MM-DD 或 1M、1Y" value={form.maturityDate} onChange={(e) => update('maturityDate', e.target.value)} />
              {errors.maturityDate && <span style={errorStyle}>{errors.maturityDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>交割日</label>
              <input type="date" style={inputStyle} value={form.settlementDate} onChange={(e) => update('settlementDate', e.target.value)} />
              {errors.settlementDate && <span style={errorStyle}>{errors.settlementDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>即期价格 S</label>
              <input type="number" step="any" min="0" style={inputStyle} value={form.spot} onChange={(e) => update('spot', Number(e.target.value))} />
              {errors.spot && <span style={errorStyle}>{errors.spot}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>执行价 K</label>
              <input type="number" step="any" min="0" style={inputStyle} value={form.strike} onChange={(e) => update('strike', Number(e.target.value))} />
              {errors.strike && <span style={errorStyle}>{errors.strike}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>本币利率 r_d（小数）</label>
              <input type="number" step="any" style={inputStyle} value={form.r_d} onChange={(e) => update('r_d', Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>外币利率 r_f（小数）</label>
              <input type="number" step="any" style={inputStyle} value={form.r_f} onChange={(e) => update('r_f', Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>名义本金（外币）</label>
              <input type="number" step="any" min="0" style={inputStyle} value={form.notional} onChange={(e) => update('notional', Number(e.target.value))} />
              {errors.notional && <span style={errorStyle}>{errors.notional}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>买卖方向</label>
              <select style={inputStyle} value={form.longOrShort} onChange={(e) => update('longOrShort', e.target.value as LongOrShort)}>
                <option value="long">Long 多头</option>
                <option value="short">Short 空头</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>期权类型</label>
              <select style={inputStyle} value={form.optionType} onChange={(e) => update('optionType', e.target.value as OptionType)}>
                <option value="call">Call 看涨</option>
                <option value="put">Put 看跌</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>隐含波动率 σ（小数）</label>
              <input type="number" step="any" min="0" style={inputStyle} value={form.sigma} onChange={(e) => update('sigma', Number(e.target.value))} />
              {errors.sigma && <span style={errorStyle}>{errors.sigma}</span>}
            </div>
          </div>

          <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.125rem' }}>数字期权专用</h2>
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>数字种类</label>
              <select style={inputStyle} value={form.digitalKind} onChange={(e) => update('digitalKind', e.target.value as DigitalKind)}>
                <option value="cashOrNothing">现金或无（Cash-or-Nothing）</option>
                <option value="assetOrNothing">资产或无（Asset-or-Nothing）</option>
              </select>
            </div>
            {isCash && (
              <>
                <div style={fieldStyle}>
                  <label style={labelStyle}>支付金额 D</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={form.D} onChange={(e) => update('D', Number(e.target.value))} placeholder="> 0" />
                  {errors.D && <span style={errorStyle}>{errors.D}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>支付货币</label>
                  <select style={inputStyle} value={form.payoffCurrency} onChange={(e) => update('payoffCurrency', e.target.value as PayoffCurrency)}>
                    <option value="domestic">本币</option>
                    <option value="foreign">外币</option>
                  </select>
                </div>
              </>
            )}
            {!isCash && (
              <div style={fieldStyle}>
                <label style={labelStyle}>支付</label>
                <input type="text" style={{ ...inputStyle, background: '#f5f5f5' }} value="1 单位外币（本币计价）" readOnly />
              </div>
            )}
          </div>

          {Object.keys(errors).length > 0 && (
            <p style={{ color: '#c00', fontSize: '0.875rem', marginBottom: '0.5rem' }}>请修正上述错误后再计算。</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              borderRadius: '6px',
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {loading ? '计算中…' : '计算'}
          </button>
        </div>
      </form>

      {calcError && <div style={{ ...cardStyle, marginTop: '1rem', color: '#c00' }}>{calcError}</div>}

      {result && !calcError && (
        <div style={{ ...cardStyle, marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>输出结果</h2>
          <div style={resultGrid}>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>期权价格（每单位名义）</div>
              <div style={{ fontWeight: 600 }}>{result.optionPrice.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium（本币）</div>
              <div style={{ fontWeight: 600 }}>{result.premium.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium % of spot</div>
              <div style={{ fontWeight: 600 }}>{result.premiumPct.toFixed(4)}%</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Delta（每单位名义）</div>
              <div style={{ fontWeight: 600 }}>{result.delta.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>头寸 Delta（外币）</div>
              <div style={{ fontWeight: 600 }}>{result.deltaPosition.toFixed(4)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Gamma（每单位名义）</div>
              <div style={{ fontWeight: 600 }}>{result.gamma != null ? result.gamma.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vega（每单位名义，1% vol）</div>
              <div style={{ fontWeight: 600 }}>{result.vega != null ? result.vega.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>头寸 Vega</div>
              <div style={{ fontWeight: 600 }}>{result.vegaPosition != null ? result.vegaPosition.toFixed(4) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Theta（1 天）</div>
              <div style={{ fontWeight: 600 }}>{result.theta != null ? result.theta.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>头寸 Theta（本币/天）</div>
              <div style={{ fontWeight: 600 }}>{result.thetaPosition != null ? result.thetaPosition.toFixed(4) : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
