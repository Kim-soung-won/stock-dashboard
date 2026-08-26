import { useState } from 'react';
import { useWatchlist } from '@/entities/watchlist/item';
import { FormTrade } from '@/features/competition/trade';
import { ChartCandle } from '@/features/market/chart';
import { FormAddWatch, TableWatchlist } from '@/features/market/quote';
import type { SelectedSymbol } from '@/shared/lib';
import { ErrorBoundary, Panel, StarButton } from '@/shared/ui';

/** 첫 진입에 보여줄 종목. 관심종목이 비어 있어도 차트가 빈 패널로 남지 않게 한다. */
const DEFAULT_SYMBOL: SelectedSymbol = { code: '005930', name: '삼성전자' };

/**
 * 관심종목 전용 페이지.
 *
 * 저장된 코드 목록에 실시간 시세(REST 스냅샷 + 0B 틱)를 얹어 보여준다(폴링 없음).
 * 추가는 종목명·코드 검색, 제거는 각 칩의 ★ 로 한다. ★ 토글의 데이터는 useWatchlist 가
 * 쥐고, 표시는 순수 StarButton 이 맡는다.
 *
 * 고른 종목은 차트 **와 주문 창**에 함께 흐른다 — 관심종목을 보다가 바로 매매한다.
 */
export const WatchlistPage = () => {
  const watch = useWatchlist();
  const [selected, setSelected] = useState<SelectedSymbol>(DEFAULT_SYMBOL);

  const codes = watch.items.map((item) => item.code);

  return (
    <div className="page">
      <header className="page__head">
        <h1>관심종목</h1>
        <span className="page__meta">{codes.length}종목</span>
      </header>

      <div className="layout-two">
        <Panel
          title="관심종목"
          actions={<FormAddWatch />}
        >
          {watch.isLoading ? (
            <p className="state">관심종목을 불러오는 중…</p>
          ) : watch.error ? (
            <p className="state state--error">관심종목을 불러오지 못했습니다: {watch.error.message}</p>
          ) : codes.length === 0 ? (
            <p className="state">
              아직 관심종목이 없습니다. 종목 탐색·인기 종목에서 ★ 를 누르거나 위에서 종목명으로
              검색해 추가하세요.
            </p>
          ) : (
            <>
              <ErrorBoundary context="watchlist" resetKeys={[codes.join(',')]}>
                <TableWatchlist codes={codes} onSelect={setSelected} />
              </ErrorBoundary>
              <div className="chip-row">
                {watch.items.map((item) => (
                  <span key={item.code} className="watch-chip">
                    <StarButton watched onToggle={() => watch.remove(item.code)} />
                    {item.name ?? item.code}
                  </span>
                ))}
              </div>
            </>
          )}
        </Panel>

        <div className="stack">
          <Panel title="차트">
            <ChartCandle code={selected.code} name={selected.name} />
          </Panel>

          <Panel title="주문 (모의투자 경쟁)">
            {/* 종목이 바뀌면 폼을 갈아끼운다 — 수량·구분도 새 종목 기준으로 다시 정한다. */}
            <ErrorBoundary context="watchlist:trade">
              <FormTrade key={selected.code} symbol={selected} />
            </ErrorBoundary>
          </Panel>
        </div>
      </div>
    </div>
  );
};
