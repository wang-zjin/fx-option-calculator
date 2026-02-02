/**
 * 外汇期权定价模型 — 公共类型定义
 * 所有模型输入/输出单位约定：利率与波动率为小数（如 5% = 0.05），T 为年化期限
 */

/** 期权方向 */
export type OptionType = 'call' | 'put';

/** Garman-Kohlhagen / Vanilla 通用输入 */
export interface GKParams {
  /** 即期汇率 S */
  S: number;
  /** 执行价 K */
  K: number;
  /** 到期期限 T（年化），用于 d1/d2；与 T1 同义 */
  T: number;
  /** 折现期限 T2（年化）：交割日−起息日，用于期权费折现；不填则用 T */
  T2?: number;
  /** 本币无风险利率 r_d */
  r_d: number;
  /** 外币无风险利率 r_f */
  r_f: number;
  /** 年化波动率 σ */
  sigma: number;
}

/** 买卖方向 */
export type LongOrShort = 'long' | 'short';

/** Vanilla 欧式期权定价结果 */
export interface VanillaResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number;   // 按 1% 波动率变化
  theta: number;  // 解析 Theta，按 1 天
  /** Time Decay：Bump T1 ±1 天得到的每日时间衰减（与 Fenics/QuantLib 一致） */
  timeDecayBump?: number;
  rho_d?: number;
  rho_f?: number;
  /** Vanna：∂²V/(∂S∂σ)，按 1% vol */
  vanna?: number;
  /** Volga/VolGamma：∂²V/∂σ²，按 1% vol */
  volga?: number;
}

/** 数字期权类型：现金或无 / 资产或无 */
export type DigitalOptionKind = 'cashOrNothing' | 'assetOrNothing';

/** 数字期权额外输入 */
export interface DigitalParams extends GKParams {
  /** 触发时支付金额 D（Cash-or-Nothing 时有效；Asset-or-Nothing 时为 1 单位外币） */
  D: number;
  /** 支付货币：'domestic' | 'foreign'（仅 Cash-or-Nothing 有效） */
  payoffCurrency?: 'domestic' | 'foreign';
  /** 数字期权类型，默认 cashOrNothing */
  digitalKind?: DigitalOptionKind;
}

/** 数字期权定价结果 */
export interface DigitalResult {
  price: number;
  delta?: number;
  gamma?: number;
  vega?: number;   // 按 1% 波动率变化
  theta?: number;  // 按 1 天
}

/** 美式期权树类型 */
export type AmericanTreeType = 'crr' | 'trinomial';

/** 美式期权额外输入 */
export interface AmericanParams extends GKParams {
  /** 二叉树/三叉树步数，默认 200 */
  steps?: number;
  /** 树类型：CRR 二叉树 / 三叉树，默认 'crr' */
  treeType?: AmericanTreeType;
}

/** 早期行权边界点（美式看跌：t 时刻行权临界即期 S*） */
export interface EarlyExerciseBoundaryPoint {
  /** 距到期时间（年） */
  t: number;
  /** 临界即期汇率 S*，低于此应提前行权 */
  S: number;
}

/** 美式期权定价结果 */
export interface AmericanResult {
  price: number;
  /** 与欧式价格差（提前行权价值） */
  earlyExercisePremium?: number;
  delta?: number;
  gamma?: number;   // 数值，即期 1% 时 Delta 变化
  vega?: number;    // 数值，按 1% 波动率
  theta?: number;   // 数值，按 1 天
  /** Vanna：∂²V/(∂S∂σ)，按 1% vol，数值 */
  vanna?: number;
  /** Volga：∂²V/∂σ²，按 1% vol，数值 */
  volga?: number;
  /** Time Decay：Bump T ±1 天 */
  timeDecayBump?: number;
  /** Rho_d：∂V/∂r_d，按 1% 利率，数值 */
  rho_d?: number;
  /** Rho_f：∂V/∂r_f，按 1% 利率，数值 */
  rho_f?: number;
  /** 早期行权边界（美式看跌可选），(t, S*) 数组 */
  earlyExerciseBoundary?: EarlyExerciseBoundaryPoint[];
}

/** 亚式期权额外输入 */
export interface AsianParams extends GKParams {
  /** 平均类型 */
  avgType: 'arithmetic' | 'geometric';
  /** 采样次数（如 252 个交易日） */
  observationCount: number;
}

/** 亚式期权定价结果 */
export interface AsianResult {
  price: number;
  /** 蒙特卡洛标准误（若用 MC） */
  standardError?: number;
  /** 置信区间 [low, high]（若用 MC） */
  confidenceInterval?: [number, number];
}

/** 组合期权类型 */
export type CombinationType = 'rr' | 'seagull';

/** 组合共享参数（与 Vanilla 一致：T1/T2、利率、即期等） */
export interface CombinationSharedParams {
  S: number;
  T: number;   // T1：到期−今日
  T2?: number; // 交割−起息
  r_d: number;
  r_f: number;
}

/** RR（风险逆转）腿参数 */
export interface RRParams {
  /** RR 方向：long = 买 Call 卖 Put，short = 卖 Call 买 Put */
  direction: 'long' | 'short';
  /** Call 执行价 K_call */
  strikeCall: number;
  /** Put 执行价 K_put */
  strikePut: number;
  /** Call 腿波动率 */
  sigmaCall: number;
  /** Put 腿波动率 */
  sigmaPut: number;
}

/** 海鸥腿参数 */
export interface SeagullParams {
  /** Call 执行价（高）K_high */
  strikeCall: number;
  /** Put 执行价（中）K_mid */
  strikePutMid: number;
  /** Put 执行价（低）K_low */
  strikePutLow: number;
  /** Call 腿波动率 */
  sigmaCall: number;
  /** Put 中腿波动率 */
  sigmaPutMid: number;
  /** Put 低腿波动率 */
  sigmaPutLow: number;
}

/** 组合定价结果（每单位名义；头寸由前端 × 名义本金） */
export interface CombinationResult {
  price: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
  /** Time Decay：Bump T1 ±1 天得到的每日时间衰减（各腿加总） */
  timeDecayBump?: number;
  rho_d: number;
  rho_f: number;
  /** 分腿明细（可选，便于核对） */
  legs?: Array<{ label: string; price: number; delta: number; gamma: number; vega: number; theta: number; rho_d: number; rho_f: number }>;
}
