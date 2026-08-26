import type { StockSymbol } from '@stock/contracts';

/** 6자리 이상 숫자만 있는 입력은 종목코드로 본다(국내 코드는 6자리 숫자다). */
const CODE_PATTERN = /^\d{6,}$/;

/** 검색어 정규화 — 앞뒤 공백을 떼고 대소문자를 지운다(영문 ETF 명 대응). */
const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * 종목 목록 부분일치 필터 (순수).
 *
 * **코드와 종목명 어느 쪽으로도** 검색된다 — 사용자는 코드를 외우고 있지 않다.
 * 이미 받아둔 마스터를 훑는 클라이언트 검색용이고(종목 탐색 표), 마스터가 없는
 * 입력창은 서버 검색(`symbolQueries.search`)을 쓴다.
 */
export const matchSymbols = <T extends { code: string; name: string }>(
  symbols: T[],
  keyword: string,
): T[] => {
  const needle = normalize(keyword);
  if (!needle) return symbols;
  return symbols.filter(
    (symbol) => normalize(symbol.code).includes(needle) || normalize(symbol.name).includes(needle),
  );
};

/**
 * 입력 문자열 → 종목코드 확정 (순수).
 *
 * 이름으로 검색하는 입력은 후보를 고르지 않고 그대로 제출되기도 한다. 뜻이 분명한
 * 경우에만 통과시킨다:
 *  1. 코드를 그대로 쳤다 → 그 코드(검색 결과가 없어도 그대로 쓴다. 마스터에 없는
 *     신규 상장도 주문·관심종목에는 넣을 수 있어야 한다).
 *  2. 종목명이 후보 하나와 정확히 같다 → 그 종목.
 *  3. 후보가 하나뿐이다 → 그 종목.
 * 그 밖에는 null — 어느 종목인지 서버가 짐작하게 두지 않고 사용자가 고르게 한다.
 */
export const resolveSymbolCode = (query: string, suggestions: StockSymbol[]): string | null => {
  const raw = query.trim();
  if (!raw) return null;
  if (CODE_PATTERN.test(raw)) return raw;

  const needle = normalize(raw);
  const exact = suggestions.find((symbol) => normalize(symbol.name) === needle);
  if (exact) return exact.code;

  return suggestions.length === 1 ? (suggestions[0]?.code ?? null) : null;
};

/**
 * 선택된 종목의 입력창 표시 문자열.
 *
 * 이름을 알면 **이름만** 넣는다 — 코드를 괄호로 덧붙이면 그 문자열이 다시 검색어가 되어
 * 아무 것도 못 찾고, `resolveSymbolCode` 의 이름 완전일치도 깨진다. 코드는 후보 목록과
 * 폼 힌트가 보여준다.
 */
export const formatSymbolLabel = (symbol: { code: string; name?: string | null }): string =>
  symbol.name?.trim() ? symbol.name.trim() : symbol.code;
