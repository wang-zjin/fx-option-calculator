import { useState, useCallback, useEffect } from 'react';
import { priceCombination } from '@models';
import type { CombinationType, CombinationSharedParams, RRParams, SeagullParams } from '@models';
import { t1Years, t2Years, todayString, addMonths, resolveMaturityDate, isDateString } from '../utils/dateUtils';
import { addTradingDays, toPreviousTradingDay } from '../utils/tradingCalendar';
import {
  validateCombinationSharedInput,
  validateRRInput,
  validateSeagullInput,
} from '../utils/validation';
import { CURRENCY_PAIRS, CURRENCY_TEMPLATES, CURRENCY_CONVENTION } from '../constants/currencyTemplates';
import { getCombinationForm, setCombinationForm } from '../utils/persistForm';

type SharedForm = {
  currencyPair: string;
  today: string;
  premiumDate: string;
  maturityDate: string;
  settlementDate: string;
  spot: number;
  r_d: number;
  r_f: number;
  notional: number;
};

type RRForm = RRParams;
type SeagullForm = SeagullParams;

function getInitialShared(): SharedForm {
  const today = todayString();
  const premiumDate = addTradingDays(today, 2);
  const maturityDate = toPreviousTradingDay(addMonths(today, 1));
  const settlementDate = addTradingDays(maturityDate, 2);
  const t = CURRENCY_TEMPLATES['EURUSD'];
  return {
    currencyPair: 'EURUSD',
    today,
    premiumDate,
    maturityDate,
    settlementDate,
    spot: t.spot,
    r_d: t.r_d,
    r_f: t.r_f,
    notional: t.notional,
  };
}

/** 从货币对模板生成 RR 腿默认值（执行价围绕即期、波动率用模板） */
function rrLegsFromTemplate(t: { spot: number; strike: number; sigma: number }): RRForm {
  return {
    direction: 'long',
    strikeCall: t.spot * 1.01,
    strikePut: t.spot * 0.99,
    sigmaCall: t.sigma,
    sigmaPut: t.sigma,
  };
}

/** 从货币对模板生成海鸥腿默认值 */
function seagullLegsFromTemplate(t: { spot: number; sigma: number }): SeagullForm {
  return {
    strikeCall: t.spot * 1.02,
    strikePutMid: t.spot,
    strikePutLow: t.spot * 0.98,
    sigmaCall: t.sigma,
    sigmaPutMid: t.sigma,
    sigmaPutLow: t.sigma,
  };
}

const defaultRR: RRForm = rrLegsFromTemplate(CURRENCY_TEMPLATES['EURUSD']);
const defaultSeagull: SeagullForm = seagullLegsFromTemplate(CURRENCY_TEMPLATES['EURUSD']);

type CombinationPersisted = {
  shared: SharedForm;
  rr: RRForm;
  seagull: SeagullForm;
  comboType: CombinationType;
  showLegs: boolean;
};

export function CombinationPricing() {
  const [comboType, setComboType] = useState<CombinationType>(() => {
    const s = getCombinationForm<CombinationPersisted | null>(null);
    return s?.comboType ?? 'rr';
  });
  const [shared, setShared] = useState<SharedForm>(() => {
    const s = getCombinationForm<CombinationPersisted | null>(null);
    return s?.shared ?? getInitialShared();
  });
  const [rr, setRR] = useState<RRForm>(() => {
    const s = getCombinationForm<CombinationPersisted | null>(null);
    return s?.rr ?? defaultRR;
  });
  const [seagull, setSeagull] = useState<SeagullForm>(() => {
    const s = getCombinationForm<CombinationPersisted | null>(null);
    return s?.seagull ?? defaultSeagull;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    price: number;
    premium: number;
    premiumPct: number;
    delta: number;
    deltaPosition: number;
    gamma: number;
    vega: number;
    vegaPosition: number;
    theta: number;
    timeDecayBump: number;
    thetaPosition: number;
    phi: number;
    rho: number;
    legs?: Array<{ label: string; price: number; delta: number; gamma: number; vega: number; theta: number; rho_d: number; rho_f: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [showLegs, setShowLegs] = useState(() => {
    const s = getCombinationForm<CombinationPersisted | null>(null);
    return s?.showLegs ?? false;
  });

  useEffect(() => {
    setCombinationForm({ shared, rr, seagull, comboType, showLegs });
  }, [shared, rr, seagull, comboType, showLegs]);

  const updateShared = useCallback(<K extends keyof SharedForm>(k: K, v: SharedForm[K]) => {
    setShared((s) => {
      const next = { ...s, [k]: v };
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

  const updateRR = useCallback(<K extends keyof RRForm>(k: K, v: RRForm[K]) => {
    setRR((r) => ({ ...r, [k]: v }));
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
    setCalcError(null);
  }, []);

  const updateSeagull = useCallback(<K extends keyof SeagullForm>(k: K, v: SeagullForm[K]) => {
    setSeagull((s) => ({ ...s, [k]: v }));
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
      const sharedErr = validateCombinationSharedInput(shared);
      const legErr =
        comboType === 'rr'
          ? validateRRInput(shared.spot, rr)
          : validateSeagullInput(shared.spot, seagull);
      const allErr = { ...sharedErr, ...legErr };
      if (Object.keys(allErr).length > 0) {
        setErrors(allErr);
        return;
      }
      setErrors({});
      setLoading(true);
      setCalcError(null);
      try {
        const maturityResolved = resolveMaturityDate(shared.today, shared.maturityDate);
        const T1 = t1Years(shared.today, maturityResolved);
        const T2 = t2Years(shared.premiumDate, shared.settlementDate);
        const sharedParams: CombinationSharedParams = {
          S: shared.spot,
          T: T1,
          T2,
          r_d: shared.r_d,
          r_f: shared.r_f,
        };
        const res = priceCombination(
          comboType,
          sharedParams,
          comboType === 'rr' ? rr : seagull,
          { withLegs: showLegs }
        );
        const timeDecay = res.timeDecayBump ?? res.theta;
        setResult({
          price: res.price,
          premium: res.price * shared.notional,
          premiumPct: (res.price / shared.spot) * 100,
          delta: res.delta,
          deltaPosition: res.delta * shared.notional,
          gamma: res.gamma,
          vega: res.vega,
          vegaPosition: res.vega * shared.notional,
          theta: res.theta,
          timeDecayBump: timeDecay,
          thetaPosition: res.theta * shared.notional,
          phi: res.rho_f,
          rho: res.rho_d,
          legs: res.legs,
        });
      } catch (err) {
        setCalcError(err instanceof Error ? err.message : '计算失败');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [comboType, shared, rr, seagull, showLegs]
  );

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

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>组合类型</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="comboType"
                checked={comboType === 'rr'}
                onChange={() => setComboType('rr')}
              />
              RR（风险逆转）
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="comboType"
                checked={comboType === 'seagull'}
                onChange={() => setComboType('seagull')}
              />
              海鸥
            </label>
          </div>

          <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.125rem' }}>共享参数</h2>
          <div style={formStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>货币对</label>
              <select
                style={inputStyle}
                value={shared.currencyPair}
                onChange={(e) => {
                  const pair = e.target.value;
                  const t = CURRENCY_TEMPLATES[pair] ?? CURRENCY_TEMPLATES['其他'];
                  setShared((s) => ({
                    ...s,
                    currencyPair: pair,
                    spot: t.spot,
                    r_d: t.r_d,
                    r_f: t.r_f,
                    notional: t.notional,
                  }));
                  setRR(rrLegsFromTemplate(t));
                  setSeagull(seagullLegsFromTemplate(t));
                  setErrors((prev) => { const next = { ...prev }; delete next.spot; delete next.notional; return next; });
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
              <input type="date" style={inputStyle} value={shared.today} onChange={(e) => updateShared('today', e.target.value)} />
              {errors.today && <span style={errorStyle}>{errors.today}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>起息日</label>
              <input type="date" style={inputStyle} value={shared.premiumDate} onChange={(e) => updateShared('premiumDate', e.target.value)} />
              {errors.premiumDate && <span style={errorStyle}>{errors.premiumDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>到期日</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="YYYY-MM-DD 或 1M、1Y"
                value={shared.maturityDate}
                onChange={(e) => updateShared('maturityDate', e.target.value)}
                onBlur={() => {
                  let resolved = resolveMaturityDate(shared.today, shared.maturityDate);
                  if (resolved !== shared.maturityDate && isDateString(resolved)) {
                    resolved = toPreviousTradingDay(resolved);
                    setShared((s) => ({ ...s, maturityDate: resolved, settlementDate: addTradingDays(resolved, 2) }));
                  }
                }}
              />
              {errors.maturityDate && <span style={errorStyle}>{errors.maturityDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>交割日</label>
              <input
                type="date"
                style={inputStyle}
                value={shared.settlementDate}
                onChange={(e) => updateShared('settlementDate', e.target.value)}
                title="通常为到期日 + 2 个交易日；修改到期日时会自动更新"
              />
              {errors.settlementDate && <span style={errorStyle}>{errors.settlementDate}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>即期价格 S</label>
              <input type="number" step="any" min="0" style={inputStyle} value={shared.spot} onChange={(e) => updateShared('spot', Number(e.target.value))} />
              {errors.spot && <span style={errorStyle}>{errors.spot}</span>}
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>本币利率 r_d（小数）</label>
              <input type="number" step="any" style={inputStyle} value={shared.r_d} onChange={(e) => updateShared('r_d', Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>外币利率 r_f（小数）</label>
              <input type="number" step="any" style={inputStyle} value={shared.r_f} onChange={(e) => updateShared('r_f', Number(e.target.value))} />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>名义本金（外币）</label>
              <input type="number" step="any" min="0" style={inputStyle} value={shared.notional} onChange={(e) => updateShared('notional', Number(e.target.value))} />
              {errors.notional && <span style={errorStyle}>{errors.notional}</span>}
            </div>
          </div>

          {comboType === 'rr' && (
            <>
              <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.125rem' }}>RR 腿参数</h2>
              <div style={formStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>RR 方向</label>
                  <select style={inputStyle} value={rr.direction} onChange={(e) => updateRR('direction', e.target.value as 'long' | 'short')}>
                    <option value="long">Long（买 Call 卖 Put）</option>
                    <option value="short">Short（卖 Call 买 Put）</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Call 执行价 K_call</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={rr.strikeCall} onChange={(e) => updateRR('strikeCall', Number(e.target.value))} />
                  {errors.strikeCall && <span style={errorStyle}>{errors.strikeCall}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 执行价 K_put</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={rr.strikePut} onChange={(e) => updateRR('strikePut', Number(e.target.value))} />
                  {errors.strikePut && <span style={errorStyle}>{errors.strikePut}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Call 腿波动率 σ_call</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={rr.sigmaCall} onChange={(e) => updateRR('sigmaCall', Number(e.target.value))} />
                  {errors.sigmaCall && <span style={errorStyle}>{errors.sigmaCall}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 腿波动率 σ_put</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={rr.sigmaPut} onChange={(e) => updateRR('sigmaPut', Number(e.target.value))} />
                  {errors.sigmaPut && <span style={errorStyle}>{errors.sigmaPut}</span>}
                </div>
              </div>
            </>
          )}

          {comboType === 'seagull' && (
            <>
              <h2 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.125rem' }}>海鸥腿参数</h2>
              <div style={formStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Call 执行价 K_high</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.strikeCall} onChange={(e) => updateSeagull('strikeCall', Number(e.target.value))} />
                  {errors.strikeCall && <span style={errorStyle}>{errors.strikeCall}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 执行价（中）K_mid</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.strikePutMid} onChange={(e) => updateSeagull('strikePutMid', Number(e.target.value))} />
                  {errors.strikePutMid && <span style={errorStyle}>{errors.strikePutMid}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 执行价（低）K_low</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.strikePutLow} onChange={(e) => updateSeagull('strikePutLow', Number(e.target.value))} />
                  {errors.strikePutLow && <span style={errorStyle}>{errors.strikePutLow}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Call 腿波动率 σ_call</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.sigmaCall} onChange={(e) => updateSeagull('sigmaCall', Number(e.target.value))} />
                  {errors.sigmaCall && <span style={errorStyle}>{errors.sigmaCall}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 中腿波动率 σ_put_mid</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.sigmaPutMid} onChange={(e) => updateSeagull('sigmaPutMid', Number(e.target.value))} />
                  {errors.sigmaPutMid && <span style={errorStyle}>{errors.sigmaPutMid}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Put 低腿波动率 σ_put_low</label>
                  <input type="number" step="any" min="0" style={inputStyle} value={seagull.sigmaPutLow} onChange={(e) => updateSeagull('sigmaPutLow', Number(e.target.value))} />
                  {errors.sigmaPutLow && <span style={errorStyle}>{errors.sigmaPutLow}</span>}
                </div>
              </div>
            </>
          )}

          <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={showLegs} onChange={(e) => setShowLegs(e.target.checked)} />
              展示分腿明细
            </label>
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
            }}
          >
            {loading ? '计算中…' : '计算'}
          </button>
        </div>
      </form>

      {calcError && (
        <div style={{ ...cardStyle, marginTop: '1rem', color: '#c00' }}>{calcError}</div>
      )}

      {result && !calcError && (() => {
        const cc = CURRENCY_CONVENTION[shared.currencyPair] ?? CURRENCY_CONVENTION['其他'];
        return (
        <div style={{ ...cardStyle, marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.125rem' }}>组合结果</h2>
          <div style={resultGrid}>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>组合期权价格（每单位名义）</div>
              <div style={{ fontWeight: 600 }}>{result.price.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Premium（{cc.domestic}）</div>
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
              <div style={{ color: '#666' }}>头寸 Delta（{cc.foreign}）</div>
              <div style={{ fontWeight: 600 }}>{result.deltaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Gamma</div>
              <div style={{ fontWeight: 600 }}>{result.gamma.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Vega</div>
              <div style={{ fontWeight: 600 }}>{result.vega.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>头寸 Vega（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.vegaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Theta</div>
              <div style={{ fontWeight: 600 }}>{result.theta.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Time Decay</div>
              <div style={{ fontWeight: 600 }}>{result.timeDecayBump.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>头寸 Theta（{cc.domestic}）</div>
              <div style={{ fontWeight: 600 }}>{result.thetaPosition.toFixed(2)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Phi (Rho_f)</div>
              <div style={{ fontWeight: 600 }}>{result.phi.toFixed(6)}</div>
            </div>
            <div style={resultItem}>
              <div style={{ color: '#666' }}>Rho (Rho_d)</div>
              <div style={{ fontWeight: 600 }}>{result.rho.toFixed(6)}</div>
            </div>
          </div>
          {result.legs && result.legs.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>分腿明细</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem' }}>腿</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>价格</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Delta</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Gamma</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Vega</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem' }}>Theta</th>
                  </tr>
                </thead>
                <tbody>
                  {result.legs.map((leg, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.5rem' }}>{leg.label}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{leg.price.toFixed(6)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{leg.delta.toFixed(6)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{leg.gamma.toFixed(6)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{leg.vega.toFixed(6)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{leg.theta.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}
