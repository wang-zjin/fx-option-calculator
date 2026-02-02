import { useState, useCallback, useEffect } from 'react';
import { priceAmerican } from '@models';
import type {
  AmericanParams,
  AmericanResult,
  OptionType,
  LongOrShort,
  AmericanTreeType,
} from '@models';
import { t1Years, todayString, resolveMaturityDate, addMonths } from '../utils/dateUtils';
import { addTradingDays, toPreviousTradingDay } from '../utils/tradingCalendar';
import { DateInput } from '../components/DateInput';
import { validateAmericanInput } from '../utils/validation';
import { CURRENCY_PAIRS, CURRENCY_TEMPLATES, CURRENCY_CONVENTION } from '../constants/currencyTemplates';
import { getAmericanForm, setAmericanForm, getAmericanForms, setAmericanForms } from '../utils/persistForm';

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
  treeType: AmericanTreeType;
  steps: number;
};

const defaultFormBase: Omit<FormState, 'today' | 'premiumDate' | 'maturityDate' | 'settlementDate'> = {
  currencyPair: 'EURUSD',
  ...CURRENCY_TEMPLATES['EURUSD'],
  longOrShort: 'long',
  optionType: 'put',
  sigma: 0.06,
  treeType: 'crr',
  steps: 200,
};

function getInitialForm(): FormState {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  return { ...defaultFormBase, today, premiumDate, maturityDate, settlementDate };
}

/** 指定币种的默认表单（用于该币种无缓存时，含美式专用 treeType/steps） */
function getDefaultFormFor(pair: string): FormState {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  const t = CURRENCY_PAIRS.includes(pair as (typeof CURRENCY_PAIRS)[number])
    ? (CURRENCY_TEMPLATES[pair] ?? CURRENCY_TEMPLATES['其他'])
    : CURRENCY_TEMPLATES['其他'];
  return {
    currencyPair: pair,
    today,
    premiumDate,
    maturityDate,
    settlementDate,
    spot: t.spot,
    strike: t.strike,
    r_d: t.r_d,
    r_f: t.r_f,
    notional: t.notional,
    longOrShort: 'long',
    optionType: 'put',
    sigma: t.sigma,
    treeType: 'crr',
    steps: 200,
  };
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

export function AmericanPricing() {
  const [form, setForm] = useState<FormState>(() => getAmericanForm(getInitialForm()));
  useEffect(() => {
    setAmericanForm(form);
    const forms = getAmericanForms();
    forms[form.currencyPair] = form;
    setAmericanForms(forms);
  }, [form]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    optionPrice: number;
    premium: number;
    premiumForeign: number;
    premiumPct: number;
    earlyExercisePremium: number;
    delta: number;
    deltaPosition: number;
    gamma: number;
    gammaPosition: number;
    vega: number;
    vegaPosition: number;
    vanna: number | undefined;
    vannaPosition: number | undefined;
    volga: number | undefined;
    volgaPosition: number | undefined;
    timeDecay: number | undefined;
    timeDecayPosition: number | undefined;
    theta: number;
    thetaPosition: number;
    phi: number | undefined;
    phiPosition: number | undefined;
    rho: number | undefined;
    rhoPosition: number | undefined;
    earlyExerciseBoundary?: AmericanResult['earlyExerciseBoundary'];
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
      const err = validateAmericanInput(form);
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
        const params: AmericanParams = {
          S: form.spot,
          K: form.strike,
          T: T1,
          r_d: form.r_d,
          r_f: form.r_f,
          sigma: form.sigma,
          steps: Math.floor(form.steps),
          treeType: form.treeType,
        };
        const raw = priceAmerican(params, form.optionType);
        const sign = form.longOrShort === 'long' ? 1 : -1;
        const premium = raw.price * form.notional;
        const premiumForeign = premium / form.spot;
        const premiumPct = (raw.price / form.spot) * 100;
        setResult({
          optionPrice: raw.price,
          premium,
          premiumForeign,
          premiumPct,
          earlyExercisePremium: raw.earlyExercisePremium ?? 0,
          delta: raw.delta ?? 0,
          deltaPosition: (raw.delta ?? 0) * form.notional * sign,
          gamma: raw.gamma ?? 0,
          gammaPosition: (raw.gamma ?? 0) * form.notional * sign,
          vega: raw.vega ?? 0,
          vegaPosition: (raw.vega ?? 0) * form.notional * sign,
          vanna: raw.vanna,
          vannaPosition: raw.vanna != null ? raw.vanna * form.notional * sign : undefined,
          volga: raw.volga,
          volgaPosition: raw.volga != null ? raw.volga * form.notional * sign : undefined,
          timeDecay: raw.timeDecayBump,
          timeDecayPosition: raw.timeDecayBump != null ? raw.timeDecayBump * form.notional * sign : undefined,
          theta: raw.theta ?? 0,
          thetaPosition: (raw.theta ?? 0) * form.notional * sign,
          phi: raw.rho_f,
          phiPosition: raw.rho_f != null ? raw.rho_f * form.notional * sign : undefined,
          rho: raw.rho_d,
          rhoPosition: raw.rho_d != null ? raw.rho_d * form.notional * sign : undefined,
          earlyExerciseBoundary: raw.earlyExerciseBoundary,
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

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>共享参数</h2>
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>货币对</label>
              <select
                style={inputStyle}
                value={form.currencyPair}
                onChange={(e) => {
                  const pair = e.target.value;
                  const forms = getAmericanForms();
                  setForm((f) => {
                    forms[f.currencyPair] = f;
                    setAmericanForms(forms);
                    const restored = forms[pair] as FormState | undefined;
                    const next =
                      restored &&
                      typeof restored === 'object' &&
                      'spot' in restored &&
                      restored.currencyPair === pair
                        ? { ...restored, currencyPair: pair }
                        : getDefaultFormFor(pair);
                    setAmericanForm(next);
                    return next;
                  });
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.spot;
                    delete next.strike;
                    delete next.notional;
                    delete next.sigma;
                    delete next.steps;
                    return next;
                  });
                  setCalcError(null);
                }}
              >
                {CURRENCY_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>当前日期</label>
              <DateInput value={form.today} onChange={(v) => update('today', v)} />
              {errors.today && <span style={errorStyle}>{errors.today}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>起息日</label>
              <DateInput value={form.premiumDate} onChange={(v) => update('premiumDate', v)} />
              {errors.premiumDate && <span style={errorStyle}>{errors.premiumDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>到期日</label>
              <DateInput maturityMode value={form.maturityDate} onChange={(v) => update('maturityDate', v)} title="日期如 2026-02-27，或 1M、1Y 等" />
              {errors.maturityDate && <span style={errorStyle}>{errors.maturityDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>交割日</label>
              <DateInput value={form.settlementDate} onChange={(v) => update('settlementDate', v)} />
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

          <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.125rem' }}>美式期权专用</h2>
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>树类型</label>
              <select style={inputStyle} value={form.treeType} onChange={(e) => update('treeType', e.target.value as AmericanTreeType)}>
                <option value="crr">CRR 二叉树</option>
                <option value="trinomial">三叉树</option>
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>树步数</label>
              <input type="number" min={2} max={1000} step={1} style={inputStyle} value={form.steps} onChange={(e) => update('steps', Number(e.target.value))} placeholder="50–500" />
              {errors.steps && <span style={errorStyle}>{errors.steps}</span>}
            </div>
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

      {result && !calcError && (() => {
        const cc = CURRENCY_CONVENTION[form.currencyPair] ?? CURRENCY_CONVENTION['其他'];
        return (
        <div style={{ ...cardStyle, marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>输出结果</h2>
          <div style={resultGrid}>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>美式期权价格（每单位名义）</div>
              <div style={{ fontWeight: 600 }}>{result.optionPrice.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.premium.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.premiumForeign.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium % of spot</div>
              <div style={{ fontWeight: 600 }}>{result.premiumPct.toFixed(4)}%</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>提前行权价值（美式−欧式）</div>
              <div style={{ fontWeight: 600 }}>{result.earlyExercisePremium.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Delta</div>
              <div style={{ fontWeight: 600 }}>{result.delta.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Delta头寸（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.deltaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Gamma</div>
              <div style={{ fontWeight: 600 }}>{result.gamma.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Gamma头寸（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.gammaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vega</div>
              <div style={{ fontWeight: 600 }}>{result.vega.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vega头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.vegaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vanna</div>
              <div style={{ fontWeight: 600 }}>{result.vanna != null ? result.vanna.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vanna头寸（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.vannaPosition != null ? result.vannaPosition.toFixed(2) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Volga</div>
              <div style={{ fontWeight: 600 }}>{result.volga != null ? result.volga.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Volga头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.volgaPosition != null ? result.volgaPosition.toFixed(2) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Time Decay</div>
              <div style={{ fontWeight: 600 }}>{result.timeDecay != null ? result.timeDecay.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Time Decay头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.timeDecayPosition != null ? result.timeDecayPosition.toFixed(2) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Theta</div>
              <div style={{ fontWeight: 600 }}>{result.theta.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Theta头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.thetaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Phi（Rho_f）</div>
              <div style={{ fontWeight: 600 }}>{result.phi != null ? result.phi.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Phi头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.phiPosition != null ? result.phiPosition.toFixed(2) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Rho（Rho_d）</div>
              <div style={{ fontWeight: 600 }}>{result.rho != null ? result.rho.toFixed(6) : '—'}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Rho头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.rhoPosition != null ? result.rhoPosition.toFixed(2) : '—'}</div>
            </div>
          </div>

          {result.earlyExerciseBoundary && result.earlyExerciseBoundary.length > 0 && (
            <div style={{ marginTop: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>早期行权边界（美式看跌）</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>t：距到期年数；S*：临界即期，低于此应提前行权</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: '0.35rem' }}>t（年）</th>
                    <th style={{ textAlign: 'right', padding: '0.35rem' }}>S*</th>
                  </tr>
                </thead>
                <tbody>
                  {result.earlyExerciseBoundary.slice(0, 20).map((pt, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.35rem' }}>{pt.t.toFixed(4)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem' }}>{pt.S.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.earlyExerciseBoundary.length > 20 && (
                <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>仅展示前 20 个时间点，共 {result.earlyExerciseBoundary.length} 个</p>
              )}
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
