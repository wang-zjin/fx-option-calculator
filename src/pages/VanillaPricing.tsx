import { useState, useCallback, useEffect } from 'react';
import { priceAndGreeks } from '@models';
import type { GKParams, OptionType, LongOrShort } from '@models';
import { t1Years, t2Years, todayString, addMonths, resolveMaturityDate, isDateString } from '../utils/dateUtils';
import { DateInput } from '../components/DateInput';
import { addTradingDays, toPreviousTradingDay } from '../utils/tradingCalendar';
import { validateVanillaInput } from '../utils/validation';
import { CURRENCY_PAIRS, CURRENCY_TEMPLATES, CURRENCY_CONVENTION } from '../constants/currencyTemplates';
import { getVanillaForm, setVanillaForm, getVanillaForms, setVanillaForms } from '../utils/persistForm';

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
};

const defaultFormBase: Omit<FormState, 'today' | 'premiumDate' | 'maturityDate' | 'settlementDate'> = {
  currencyPair: 'EURUSD',
  ...CURRENCY_TEMPLATES['EURUSD'],
  longOrShort: 'long',
  optionType: 'put',
};

function getInitialForm(): FormState {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  return { ...defaultFormBase, today, premiumDate, maturityDate, settlementDate };
}

/** 指定币种的默认表单（用于该币种无缓存时） */
function getDefaultFormFor(pair: string): FormState {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  const t = CURRENCY_PAIRS.includes(pair as typeof CURRENCY_PAIRS[number])
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
  };
}

export function VanillaPricing() {
  const [form, setForm] = useState<FormState>(() => getVanillaForm(getInitialForm()));
  useEffect(() => {
    setVanillaForm(form);
    const forms = getVanillaForms();
    forms[form.currencyPair] = form;
    setVanillaForms(forms);
  }, [form]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    optionPrice: number;
    premium: number;
    premiumForeign: number;
    premiumPct: number;
    delta: number;
    deltaSigned: number;
    deltaPosition: number;
    gamma: number;
    gammaPosition: number;
    vega: number;
    vegaSigned: number;
    vegaPosition: number;
    vanna: number;
    vannaPosition: number;
    volga: number;
    volgaPosition: number;
    timeDecay: number;
    timeDecayPosition: number;
    phi: number;
    phiPosition: number;
    rho: number;
    rhoPosition: number;
    theta: number;
    thetaPosition: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const update = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'maturityDate' && typeof v === 'string' && isDateString(v)) {
        next.settlementDate = addTradingDays(v, 2);
      }
      return next;
    });
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      if (k === 'maturityDate') delete next.settlementDate;
      return next;
    });
    setCalcError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const err = validateVanillaInput(form);
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
        const params: GKParams = {
          S: form.spot,
          K: form.strike,
          T: T1,
          T2,
          r_d: form.r_d,
          r_f: form.r_f,
          sigma: form.sigma,
        };
        const raw = priceAndGreeks(params, form.optionType);
        const sign = form.longOrShort === 'long' ? 1 : -1;
        const premium = raw.price * form.notional;
        const premiumForeign = premium / form.spot;
        const premiumPct = (raw.price / form.spot) * 100;
        const timeDecayBump = raw.timeDecayBump ?? raw.theta;
        setResult({
          optionPrice: raw.price,
          premium,
          premiumForeign,
          premiumPct,
          delta: raw.delta,
          deltaSigned: raw.delta * sign,
          deltaPosition: raw.delta * form.notional * sign,
          gamma: raw.gamma,
          gammaPosition: raw.gamma * form.notional * sign,
          vega: raw.vega,
          vegaSigned: raw.vega * sign,
          vegaPosition: raw.vega * form.notional * sign,
          vanna: raw.vanna ?? 0,
          vannaPosition: (raw.vanna ?? 0) * form.notional * sign,
          volga: raw.volga ?? 0,
          volgaPosition: (raw.volga ?? 0) * form.notional * sign,
          timeDecay: timeDecayBump,
          timeDecayPosition: timeDecayBump * form.notional * sign,
          phi: raw.rho_f ?? 0,
          phiPosition: (raw.rho_f ?? 0) * form.notional * sign,
          rho: raw.rho_d ?? 0,
          rhoPosition: (raw.rho_d ?? 0) * form.notional * sign,
          theta: raw.theta,
          thetaPosition: raw.theta * form.notional * sign,
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

  const formStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  };
  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  };
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
  const resultItem: React.CSSProperties = {
    padding: '0.5rem 0',
    borderBottom: '1px solid #eee',
    fontSize: '0.875rem',
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={cardStyle}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>
          输入参数
        </h2>
        <div style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>货币对</label>
            <select
              style={inputStyle}
              value={form.currencyPair}
              onChange={(e) => {
                const pair = e.target.value;
                const forms = getVanillaForms();
                setForm((f) => {
                  forms[f.currencyPair] = f;
                  setVanillaForms(forms);
                  const restored = forms[pair] as FormState | undefined;
                  const next = restored && typeof restored === 'object' && 'spot' in restored && restored.currencyPair === pair
                    ? { ...restored, currencyPair: pair }
                    : getDefaultFormFor(pair);
                  setVanillaForm(next);
                  return next;
                });
                setErrors((prev) => { const next = { ...prev }; delete next.spot; delete next.strike; delete next.notional; delete next.sigma; return next; });
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
            <DateInput
              maturityMode
              value={form.maturityDate}
              onChange={(v) => update('maturityDate', v)}
              onBlur={() => {
                let resolved = resolveMaturityDate(form.today, form.maturityDate);
                if (resolved !== form.maturityDate && isDateString(resolved)) {
                  resolved = toPreviousTradingDay(resolved);
                  setForm((f) => ({ ...f, maturityDate: resolved, settlementDate: addTradingDays(resolved, 2) }));
                }
              }}
              title="日期如 2026-02-27，或 1M（1个月后）、1Y（1年后）等"
            />
            {errors.maturityDate && <span style={errorStyle}>{errors.maturityDate}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>交割日</label>
            <DateInput value={form.settlementDate} onChange={(v) => update('settlementDate', v)} title="通常为到期日 + 2 个交易日；修改到期日时会自动更新" />
            {errors.settlementDate && <span style={errorStyle}>{errors.settlementDate}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>即期价格 S</label>
            <input
              type="number"
              step="any"
              min="0"
              style={inputStyle}
              value={form.spot}
              onChange={(e) => update('spot', Number(e.target.value))}
            />
            {errors.spot && <span style={errorStyle}>{errors.spot}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>执行价 K</label>
            <input
              type="number"
              step="any"
              min="0"
              style={inputStyle}
              value={form.strike}
              onChange={(e) => update('strike', Number(e.target.value))}
            />
            {errors.strike && <span style={errorStyle}>{errors.strike}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>本币利率 r_d（小数，如 0.04）</label>
            <input
              type="number"
              step="any"
              style={inputStyle}
              value={form.r_d}
              onChange={(e) => update('r_d', Number(e.target.value))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>外币利率 r_f（小数，如 0.02）</label>
            <input
              type="number"
              step="any"
              style={inputStyle}
              value={form.r_f}
              onChange={(e) => update('r_f', Number(e.target.value))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>名义本金（外币）</label>
            <input
              type="number"
              step="any"
              min="0"
              style={inputStyle}
              value={form.notional}
              onChange={(e) => update('notional', Number(e.target.value))}
            />
            {errors.notional && <span style={errorStyle}>{errors.notional}</span>}
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>买卖方向</label>
            <select
              style={inputStyle}
              value={form.longOrShort}
              onChange={(e) => update('longOrShort', e.target.value as LongOrShort)}
            >
              <option value="long">Long 多头</option>
              <option value="short">Short 空头</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>期权类型</label>
            <select
              style={inputStyle}
              value={form.optionType}
              onChange={(e) => update('optionType', e.target.value as OptionType)}
            >
              <option value="call">Call 看涨</option>
              <option value="put">Put 看跌</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>隐含波动率 σ（小数，如 0.06）</label>
            <input
              type="number"
              step="any"
              min="0"
              style={inputStyle}
              value={form.sigma}
              onChange={(e) => update('sigma', Number(e.target.value))}
            />
            {errors.sigma && <span style={errorStyle}>{errors.sigma}</span>}
          </div>
        </div>
        {Object.keys(errors).length > 0 && (
          <p style={{ color: '#c00', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            请修正上述错误后再计算。
          </p>
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
          }}
        >
          {loading ? '计算中…' : '计算'}
        </button>
      </form>

      {calcError && (
        <div style={{ ...cardStyle, marginTop: '1rem', color: '#c00' }}>
          {calcError}
        </div>
      )}

      {result && !calcError && (() => {
        const cc = CURRENCY_CONVENTION[form.currencyPair] ?? CURRENCY_CONVENTION['其他'];
        return (
        <div style={{ ...cardStyle, marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>
            输出结果
          </h2>
          <div style={resultGrid}>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>期权价格（每单位名义）</div>
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
              <div style={{ color: '#666' }}>Delta</div>
              <div style={{ fontWeight: 600 }}>{result.deltaSigned.toFixed(6)}</div>
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
              <div style={{ fontWeight: 600 }}>{result.vegaSigned.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vega头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.vegaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vanna</div>
              <div style={{ fontWeight: 600 }}>{result.vanna.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vanna头寸（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.vannaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Volga</div>
              <div style={{ fontWeight: 600 }}>{result.volga.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Volga头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.volgaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Time Decay</div>
              <div style={{ fontWeight: 600 }}>{result.timeDecay.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Time Decay头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.timeDecayPosition.toFixed(2)}</div>
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
              <div style={{ fontWeight: 600 }}>{result.phi.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Phi头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.phiPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Rho（Rho_d）</div>
              <div style={{ fontWeight: 600 }}>{result.rho.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Rho头寸（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.rhoPosition.toFixed(2)}</div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
