/**
 * 키움 응답 값 정규화 헬퍼.
 *
 * 키움 API는 모든 값을 문자열로 주고, 가격 계열에는 부호가 붙는다.
 * 이때 부호는 "음수"가 아니라 전일대비 방향 표시인 경우가 많다
 * (현재가 `"-20800"` = 20800원, 하락). 그래서 값과 방향을 분리해서 읽는다.
 *
 * 이 모듈은 BFF 경계에서만 쓰고, 정규화된 도메인 모델을 프론트로 보낸다.
 */

/** 전일대비 방향. 키움 `pred_pre_sig` / `pre_sig` 코드에서 파생. */
export type PriceDirection = 'up' | 'down' | 'flat' | 'upperLimit' | 'lowerLimit';

const DIRECTION_BY_SIGN_CODE: Readonly<Record<string, PriceDirection>> = {
  '1': 'upperLimit',
  '2': 'up',
  '3': 'flat',
  '4': 'lowerLimit',
  '5': 'down',
};

const isBlank = (raw: string | null | undefined): raw is null | undefined | '' =>
  raw === null || raw === undefined || raw.trim() === '';

/**
 * 가격·수량처럼 "부호가 방향 표시"인 필드를 절대값 숫자로 읽는다.
 * 빈 문자열은 null (키움은 값 없음을 `""` 로 보낸다).
 */
export const parseAmount = (raw: string | null | undefined): number | null => {
  if (isBlank(raw)) return null;
  const parsed = Number(raw.replace(/[+\s,]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
};

/** 전일대비·순매수처럼 부호 자체가 의미 있는 필드를 그대로 읽는다. */
export const parseSigned = (raw: string | null | undefined): number | null => {
  if (isBlank(raw)) return null;
  const parsed = Number(raw.replace(/[+,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
};

/** 등락률(부호 포함 소수점 둘째 자리 문자열). */
export const parseRate = parseSigned;

/** 문자열 값의 부호에서 방향을 읽는다(`pred_pre_sig` 가 없는 실시간 FID 대비). */
export const directionOfValue = (raw: string | null | undefined): PriceDirection => {
  if (isBlank(raw)) return 'flat';
  const trimmed = raw.trim();
  if (trimmed.startsWith('-')) return 'down';
  if (trimmed.startsWith('+')) return 'up';
  return 'flat';
};

/** `pred_pre_sig`/`pre_sig` 코드 → 방향. 1 상한 / 2 상승 / 3 보합 / 4 하한 / 5 하락. */
export const directionOfSignCode = (raw: string | null | undefined): PriceDirection => {
  if (isBlank(raw)) return 'flat';
  return DIRECTION_BY_SIGN_CODE[raw.trim()] ?? 'flat';
};

/** `yyyyMMdd` → `yyyy-MM-dd`. 형식이 아니면 null. */
export const parseYmd = (raw: string | null | undefined): string | null => {
  if (isBlank(raw) || !/^\d{8}$/.test(raw.trim())) return null;
  const value = raw.trim();
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

/** `HHmmss` 또는 `HHmm` → `HH:mm:ss`. 형식이 아니면 null. */
export const parseHms = (raw: string | null | undefined): string | null => {
  if (isBlank(raw)) return null;
  const value = raw.trim().padEnd(6, '0');
  if (!/^\d{6}$/.test(value)) return null;
  return `${value.slice(0, 2)}:${value.slice(2, 4)}:${value.slice(4, 6)}`;
};

/** `yyyyMMddHHmmss` (토큰 `expires_dt`) → epoch millis. */
export const parseExpiresDt = (raw: string): number | null => {
  if (!/^\d{14}$/.test(raw)) return null;
  const [y, mo, d, h, mi, s] = [
    Number(raw.slice(0, 4)),
    Number(raw.slice(4, 6)),
    Number(raw.slice(6, 8)),
    Number(raw.slice(8, 10)),
    Number(raw.slice(10, 12)),
    Number(raw.slice(12, 14)),
  ] as const;
  return new Date(y, mo - 1, d, h, mi, s).getTime();
};

/**
 * 스펙 `desc` 에 적힌 단위 배수. 값 자체에는 단위가 없으므로 필드별로 곱해야 한다.
 * 예: `trde_prica`(거래대금)는 백만원 단위.
 */
export const UNIT_MULTIPLIER = {
  won: 1,
  thousandWon: 1_000,
  millionWon: 1_000_000,
  hundredMillionWon: 100_000_000,
} as const;

export type UnitKey = keyof typeof UNIT_MULTIPLIER;

export const applyUnit = (value: number | null, unit: UnitKey): number | null =>
  value === null ? null : value * UNIT_MULTIPLIER[unit];

/** 종목코드에 거래소 접미사를 붙인다. KRX 는 접미사 없음. */
export type ExchangeSuffix = 'KRX' | 'NXT' | 'SOR';

export const withExchangeSuffix = (code: string, exchange: ExchangeSuffix): string => {
  if (exchange === 'NXT') return `${code}_NX`;
  if (exchange === 'SOR') return `${code}_AL`;
  return code;
};

/** `039490_NX` → `039490` */
export const stripExchangeSuffix = (code: string): string => code.replace(/_(NX|AL)$/, '');

/**
 * 종목코드 정규화. **키움 응답의 종목코드는 TR 계열마다 표기가 다르다.**
 *
 * - 시세 계열(ka10001, 실시간 0B): `005930` / `039490_NX` / `039490_AL`
 * - 계좌 계열(kt00018 종목번호, 실시간 00 의 FID 9001): `A005930` — 앞에 `A` 가 붙는다
 *
 * 도메인 모델은 접두사·접미사 없는 6자리를 쓴다. 이걸 통일하지 않으면 잔고의 종목과
 * 실시간 틱의 종목이 서로 다른 키가 되어 매칭이 조용히 실패한다.
 */
export const normalizeStockCode = (raw: string | null | undefined): string => {
  if (!raw) return '';
  const withoutSuffix = raw.trim().replace(/_(NX|AL)$/, '');
  // ETF 처럼 문자가 섞인 코드(0194M0)도 있으므로 6자리 영숫자 앞의 A 만 떼낸다.
  return withoutSuffix.replace(/^A(?=[0-9A-Z]{6}$)/, '');
};
