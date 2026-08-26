import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { MarketKind } from '@stock/contracts';
import { useTickStream } from '@/entities/market/quote';
import { symbolQueries } from '@/entities/market/symbol';
import { useWatchlist } from '@/entities/watchlist/item';
import { formatRate, formatWon } from '@/shared/lib';
import { StaleOverlay, StarButton, ValueText } from '@/shared/ui';

interface SymbolRowsProps {
  market: MarketKind;
  keyword: string;
  onSelect?: (code: string) => void;
}

/** 한 페이지에 보여줄 종목 수. 실시간 구독도 이 페이지 것만 등록한다. */
const PAGE_SIZE = 30;

/**
 * 전체 종목 목록 — 데이터 레이어 (바운더리 "안").
 *
 * 실시간 구독은 **현재 페이지에 보이는 종목만** 등록한다. 코스피 전체를 등록하는 것은
 * 불가능하고(계약상 채널당 100개 제한, 유량도 감당 못 한다), 화면에 안 보이는 종목의
 * 틱은 쓸모가 없다. 페이지를 넘기면 이전 구독은 해지되고 새 페이지가 등록된다.
 */
export const SymbolRows = ({ market, keyword, onSelect }: SymbolRowsProps) => {
  const { data: symbols } = useSuspenseQuery(symbolQueries.list(market));
  const watch = useWatchlist();
  const [page, setPage] = useState(0);

  // 검색어를 지연시켜 타이핑 중 목록이 통째로 다시 그려지지 않게 한다.
  const deferredKeyword = useDeferredValue(keyword);
  const isStale = deferredKeyword !== keyword;

  const filtered = useMemo(() => {
    const needle = deferredKeyword.trim().toLowerCase();
    if (!needle) return symbols;
    return symbols.filter(
      (symbol) =>
        symbol.code.toLowerCase().includes(needle) || symbol.name.toLowerCase().includes(needle),
    );
  }, [symbols, deferredKeyword]);

  // 검색어·시장이 바뀌면 1페이지로 되돌린다(빈 페이지에 남는 것을 막는다).
  useEffect(() => {
    setPage(0);
  }, [deferredKeyword, market]);

  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const current = Math.min(page, lastPage);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const ticks = useTickStream(
    'symbols',
    visible.map((symbol) => symbol.code),
  );

  return (
    <StaleOverlay isStale={isStale}>
      <div className="symbols__summary">
        전체 {symbols.length.toLocaleString('ko-KR')}종목 중 {filtered.length.toLocaleString('ko-KR')}건
        {' · '}
        {current + 1}/{lastPage + 1} 페이지
      </div>

      <table className="grid">
        <thead>
          <tr>
            <th className="grid__num">관심</th>
            <th>종목</th>
            <th>시장</th>
            <th className="grid__num">현재가(실시간)</th>
            <th className="grid__num">등락률</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((symbol) => {
            const tick = ticks.get(symbol.code);
            return (
              <tr
                key={symbol.code}
                className={onSelect ? 'grid__row--clickable' : undefined}
                onClick={() => onSelect?.(symbol.code)}
              >
                <td className="grid__num">
                  <StarButton
                    watched={watch.isWatched(symbol.code)}
                    onToggle={() => watch.toggle(symbol.code, symbol.name)}
                  />
                </td>
                <td>
                  <span className="grid__name">{symbol.name}</span>
                  <span className="grid__code">{symbol.code}</span>
                </td>
                <td>{symbol.market}</td>
                <td className="grid__num">
                  <ValueText
                    value={formatWon(tick?.price ?? null)}
                    direction={tick?.direction ?? 'flat'}
                  />
                </td>
                <td className="grid__num">
                  <ValueText
                    value={formatRate(tick?.changeRate ?? null)}
                    direction={tick?.direction ?? 'flat'}
                  />
                </td>
              </tr>
            );
          })}
          {visible.length === 0 ? (
            <tr>
              <td colSpan={5} className="state">
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="symbols__pager">
        <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>
          이전
        </button>
        <span>
          {current + 1} / {lastPage + 1}
        </span>
        <button type="button" disabled={current >= lastPage} onClick={() => setPage(current + 1)}>
          다음
        </button>
      </div>
      <p className="ranking__note">
        현재가는 실시간 체결(0B)로 채워진다 — 이 페이지에 보이는 종목만 구독하며, 장외
        시간에는 값이 비어 있다.
      </p>
    </StaleOverlay>
  );
};
