import { useState } from 'react';
import type { MarketKind } from '@stock/contracts';
import { symbolQueries } from '@/entities/market/symbol';
import { QueryErrorBoundary } from '@/shared/ui';
import { SymbolRows } from './components/symbol-rows';

interface TableSymbolsProps {
  onSelect?: (code: string) => void;
}

const MARKETS: { value: MarketKind; label: string }[] = [
  { value: 'kospi', label: '코스피' },
  { value: 'kosdaq', label: '코스닥' },
  { value: 'etf', label: 'ETF' },
];

/**
 * 전체 종목 검색 — 필터 레이어 (바운더리 "밖").
 *
 * 검색창을 바운더리 안에 두면 재조회로 suspend 될 때 입력창이 사라지고 **포커스가
 * 날아간다**. 그래서 검색·시장 탭은 여기(밖), 목록만 안에 둔다.
 *
 * 종목 마스터(ka10099)는 시장당 한 번 받아 캐시하고 검색은 클라이언트에서 한다 —
 * 검색어마다 서버를 부르면 유량만 태우고, 마스터는 하루 단위로만 바뀐다.
 */
export const TableSymbols = ({ onSelect }: TableSymbolsProps) => {
  const [market, setMarket] = useState<MarketKind>('kospi');
  const [keyword, setKeyword] = useState('');

  return (
    <div className="symbols">
      <div className="symbols__filters">
        <div className="interval-switch">
          {MARKETS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={market === item.value}
              onClick={() => setMarket(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="symbols__search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="종목명 또는 코드 검색"
          maxLength={30}
        />
      </div>

      <QueryErrorBoundary
        context={`symbols:${market}`}
        queryKey={symbolQueries.all()}
        resetKeys={[market]}
        fallback={<p className="state">종목 목록 조회 중… (첫 조회는 수 초 걸립니다)</p>}
      >
        <SymbolRows market={market} keyword={keyword} onSelect={onSelect} />
      </QueryErrorBoundary>
    </div>
  );
};
