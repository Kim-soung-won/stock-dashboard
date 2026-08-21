import { useState } from 'react';
import type { RankingKind, RankingMarket } from '@stock/contracts';
import {
  RANKING_KINDS,
  RANKING_MARKETS,
  RANKING_MARKET_LABEL,
  RANKING_META,
  rankingQueries,
} from '@/entities/market/ranking';
import { QueryErrorBoundary } from '@/shared/ui';
import { RankingRows } from './components/ranking-rows';

interface TableRankingProps {
  onSelect?: (code: string) => void;
}

/**
 * 순위(인기) 표 — 필터 레이어 (바운더리 "밖").
 *
 * 종류·시장 탭은 쿼리 결과에 의존하지 않으므로 바운더리 밖에 둔다. 안에 두면 조회가
 * 실패했을 때 탭까지 사라져 다른 순위로 옮겨갈 수 없다.
 */
export const TableRanking = ({ onSelect }: TableRankingProps) => {
  const [kind, setKind] = useState<RankingKind>('views');
  const [market, setMarket] = useState<RankingMarket>('all');
  const meta = RANKING_META[kind];

  return (
    <div className="ranking">
      <div className="ranking__tabs">
        {RANKING_KINDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {RANKING_META[value].label}
          </button>
        ))}
      </div>

      <div className="ranking__filters">
        <div className="interval-switch">
          {RANKING_MARKETS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={market === value}
              // 인기(ka00198)는 시장 구분 파라미터가 없는 TR 이다.
              disabled={kind === 'views'}
              onClick={() => setMarket(value)}
            >
              {RANKING_MARKET_LABEL[value]}
            </button>
          ))}
        </div>
        <p className="ranking__note">{meta.description}</p>
      </div>

      <QueryErrorBoundary
        context={`ranking:${kind}`}
        queryKey={rankingQueries.all()}
        resetKeys={[kind, market]}
        fallback={<p className="state">순위 조회 중…</p>}
      >
        <RankingRows kind={kind} market={market} onSelect={onSelect} />
      </QueryErrorBoundary>
    </div>
  );
};
