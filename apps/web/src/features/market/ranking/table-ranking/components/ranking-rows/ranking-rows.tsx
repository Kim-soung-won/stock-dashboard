import { useDeferredValue } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { RankingKind, RankingMarket } from '@stock/contracts';
import { RANKING_META, rankingQueries } from '@/entities/market/ranking';
import { useTickStream } from '@/entities/market/quote';
import { useWatchlist } from '@/entities/watchlist/item';
import { formatCompact, formatRate, formatSignedWon, formatWon } from '@/shared/lib';
import { StaleOverlay, StarButton, ValueText } from '@/shared/ui';

interface RankingRowsProps {
  kind: RankingKind;
  market: RankingMarket;
  onSelect?: (code: string) => void;
}

/** 실시간 구독은 상위 N개만. 순위표 전체를 등록하면 유량·구독 수가 낭비된다. */
const LIVE_ROWS = 30;

/**
 * 순위 표 — 데이터 레이어 (바운더리 "안").
 *
 * 순위 응답의 가격은 조회 시점 스냅샷이다. 상위 종목에는 실시간 체결을 얹어
 * 현재가·등락률만 갱신한다(순위 자체는 다시 조회하지 않는다 — 순위가 매 틱마다
 * 뒤바뀌면 읽을 수 없는 표가 된다).
 */
export const RankingRows = ({ kind, market, onSelect }: RankingRowsProps) => {
  // 탭 전환 시 폴백으로 교체되지 않게 이전 값으로 그린다.
  const deferredKind = useDeferredValue(kind);
  const deferredMarket = useDeferredValue(market);
  const isStale = deferredKind !== kind || deferredMarket !== market;

  const { data: items } = useSuspenseQuery(rankingQueries.list(deferredKind, deferredMarket));
  const meta = RANKING_META[deferredKind];
  const watch = useWatchlist();

  const liveCodes = items.slice(0, LIVE_ROWS).map((item) => item.code);
  const ticks = useTickStream(`ranking:${deferredKind}`, liveCodes);

  return (
    <StaleOverlay isStale={isStale}>
      <table className="grid">
        <thead>
          <tr>
            <th className="grid__num">순위</th>
            <th>종목</th>
            <th className="grid__num">{meta.showsValue ? '현재가' : '가격'}</th>
            <th className="grid__num">전일대비</th>
            <th className="grid__num">등락률</th>
            {meta.showsVolume ? <th className="grid__num">거래량</th> : null}
            {meta.showsValue ? <th className="grid__num">거래대금</th> : null}
            <th className="grid__num">관심</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const tick = ticks.get(item.code);
            // 순위 응답과 실시간 틱은 같은 도메인 모델이 아니므로 필요한 값만 덮어쓴다.
            const price = tick?.price ?? item.price;
            const changeRate = tick?.changeRate ?? item.changeRate;
            const change = tick?.change ?? item.change;
            const direction = tick?.direction ?? item.direction;

            return (
              <tr
                key={item.code}
                className={onSelect ? 'grid__row--clickable' : undefined}
                onClick={() => onSelect?.(item.code)}
              >
                <td className="grid__num">
                  {item.rank}
                  {item.rankChange !== null ? (
                    <ValueText
                      size="sm"
                      value={item.rankChange > 0 ? `▲${item.rankChange}` : `▼${Math.abs(item.rankChange)}`}
                      direction={item.rankChange > 0 ? 'up' : 'down'}
                    />
                  ) : null}
                </td>
                <td>
                  <span className="grid__name">{item.name}</span>
                  <span className="grid__code">
                    {item.code}
                    {tick ? ' · 실시간' : ''}
                  </span>
                </td>
                <td className="grid__num">
                  <ValueText value={formatWon(price)} direction={direction} />
                </td>
                <td className="grid__num">
                  <ValueText value={formatSignedWon(change)} direction={direction} />
                </td>
                <td className="grid__num">
                  <ValueText value={formatRate(changeRate)} direction={direction} />
                </td>
                {meta.showsVolume ? (
                  <td className="grid__num">{formatCompact(item.volume)}</td>
                ) : null}
                {meta.showsValue ? (
                  <td className="grid__num">{formatCompact(item.tradeValue)}</td>
                ) : null}
                <td className="grid__num">
                  <StarButton
                    watched={watch.isWatched(item.code)}
                    onToggle={() => watch.toggle(item.code, item.name)}
                  />
                </td>
              </tr>
            );
          })}
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} className="state">
                순위 데이터가 없습니다. 장 시작 전이거나 조건에 맞는 종목이 없습니다.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </StaleOverlay>
  );
};
