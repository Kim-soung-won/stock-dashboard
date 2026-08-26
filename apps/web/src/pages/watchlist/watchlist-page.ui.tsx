import { useState } from 'react';
import { useWatchlist } from '@/entities/watchlist/item';
import { ChartCandle } from '@/features/market/chart';
import { TableWatchlist } from '@/features/market/quote';
import { ErrorBoundary, Panel, StarButton } from '@/shared/ui';

/**
 * 관심종목 전용 페이지.
 *
 * 저장된 코드 목록에 실시간 시세(REST 스냅샷 + 0B 틱)를 얹어 보여준다(폴링 없음).
 * 추가는 코드 입력, 제거는 각 칩의 ★ 로 한다. ★ 토글의 데이터는 useWatchlist 가 쥐고,
 * 표시는 순수 StarButton 이 맡는다.
 */
export const WatchlistPage = () => {
  const watch = useWatchlist();
  const [selected, setSelected] = useState('005930');
  const [input, setInput] = useState('');

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
          actions={
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                const code = input.trim();
                if (code.length >= 6) {
                  watch.add(code);
                  setInput('');
                }
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="종목코드 추가"
                maxLength={12}
              />
              <button type="submit" disabled={watch.isPending}>
                추가
              </button>
            </form>
          }
        >
          {watch.isLoading ? (
            <p className="state">관심종목을 불러오는 중…</p>
          ) : watch.error ? (
            <p className="state state--error">관심종목을 불러오지 못했습니다: {watch.error.message}</p>
          ) : codes.length === 0 ? (
            <p className="state">
              아직 관심종목이 없습니다. 종목 탐색·인기 종목에서 ★ 를 누르거나 위에 코드를
              입력해 추가하세요.
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

        <Panel title={selected + ' 차트'}>
          <ChartCandle code={selected} />
        </Panel>
      </div>
    </div>
  );
};
