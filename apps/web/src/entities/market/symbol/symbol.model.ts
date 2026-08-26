import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatSymbolLabel, resolveSymbolCode } from './symbol.libs';
import { symbolQueries } from './symbol.queries';

/** 후보에서 고른 종목. shared/ui SymbolSearchInput 의 옵션과 구조가 같다. */
interface PickedSymbol {
  code: string;
  name: string;
}

/** 폼이 미리 채워둘 종목. 표에서 고른 종목은 이름을 모를 수 있다(관심종목 등). */
export interface SeedSymbol {
  code: string;
  name?: string | null;
}

/**
 * 종목명·코드 자동완성 조회.
 *
 * 검색어를 지연시켜(useDeferredValue) 타이핑 한 글자마다 요청이 나가지 않게 하고,
 * 이전 결과를 유지해(keepPreviousData) 후보 목록이 빈 상태로 깜빡이지 않게 한다.
 */
export const useSymbolSearch = (keyword: string) => {
  const trimmed = keyword.trim();
  const deferred = useDeferredValue(trimmed);
  const query = useQuery(symbolQueries.search(deferred));

  return {
    suggestions: query.data ?? [],
    /** 조회 중(첫 조회·재조회·지연 반영 모두). 후보 목록의 "검색 중" 표시에 쓴다. */
    isSearching: query.isFetching || deferred !== trimmed,
    error: query.error,
  };
};

/**
 * 종목 선택 상태 훅 — 이름으로 종목을 고르는 모든 입력이 쓴다.
 *
 * 표시는 순수 `shared/ui` SymbolSearchInput 이 맡고 데이터·확정 판정은 이 훅이 쥔다
 * (StarButton/useWatchlist 와 같은 분담). 반환하는 `code` 가 확정된 종목코드이고,
 * null 이면 아직 어느 종목인지 정해지지 않은 상태다 — 폼은 그때 제출을 막으면 된다.
 *
 * 코드를 그대로 붙여넣는 기존 사용법도 그대로 통한다(`resolveSymbolCode` 참고).
 *
 * `seed` 를 주면 그 종목으로 시작한다(차트에서 고른 종목을 주문 폼에 미리 채우는 용도).
 * seed 가 바뀔 때 폼을 갈아끼우는 것은 **호출부가 `key` 로** 한다 — 종목이 바뀌면
 * 수량·구분도 새로 정하는 게 맞고, effect 로 state 를 되쓰는 것보다 단순하다.
 */
export const useSymbolPicker = (seed?: SeedSymbol | null) => {
  const [query, setQuery] = useState(() => (seed ? formatSymbolLabel(seed) : ''));
  const [picked, setPicked] = useState<PickedSymbol | null>(() =>
    seed?.name ? { code: seed.code, name: seed.name } : null,
  );
  const { suggestions, isSearching } = useSymbolSearch(query);

  // 고른 뒤 입력을 손대면 그 선택은 무효다(다른 종목을 찾는 중이다).
  const selected = picked && formatSymbolLabel(picked) === query.trim() ? picked : null;

  return {
    query,
    suggestions,
    isSearching,
    /** 확정된 종목코드. null 이면 아직 종목이 정해지지 않았다. */
    code: selected?.code ?? resolveSymbolCode(query, suggestions),
    /** 확정된 종목명(코드만 입력했으면 null — 이름은 서버가 채운다). */
    name: selected?.name ?? null,
    onChange: setQuery,
    onPick: (symbol: PickedSymbol): void => {
      setPicked(symbol);
      setQuery(formatSymbolLabel(symbol));
    },
    reset: (): void => {
      setQuery('');
      setPicked(null);
    },
  };
};
