import { useState } from 'react';
import { MARKET_PHASE_LABEL, useSessionState } from '@/entities/market/session';
import { useWatchlist } from '@/entities/watchlist/item';
import { ChartCandle } from '@/features/market/chart';
import { TableWatchlist } from '@/features/market/quote';
import { ErrorBoundary, Panel, StarButton, StatusDot } from '@/shared/ui';

const UPSTREAM_TONE = {
  ready: 'ok',
  connecting: 'warn',
  disconnected: 'error',
} as const;

/**
 * 실시간 대시보드.
 *
 * 이 화면의 첫 번째 책임은 시세가 아니라 **값의 신선도**다. 업스트림이 끊긴 상태로
 * 마지막 가격이 떠 있으면 사용자는 그걸 현재가로 착각한다. 그래서 세션 상태와 장 상태
 * 배지를 항상 상단에 둔다. 관심종목은 서버(참가자 스코프)가 진실이다.
 */
export const DashboardPage = () => {
  const watch = useWatchlist();
  const codes = watch.items.map((item) => item.code);
  const [selected, setSelected] = useState('005930');
  const [input, setInput] = useState('');
  const session = useSessionState();

  return (
    <div className="page">
      <header className="page__head">
        <h1>실시간 시세</h1>
        <div className="page__badges">
          <StatusDot
            tone={UPSTREAM_TONE[session.upstream]}
            label={'키움 세션 ' + session.upstream}
          />
          <StatusDot tone="ok" label={MARKET_PHASE_LABEL[session.phase]} />
          <span className="page__meta">구독 {session.subscribedCodes}건</span>
        </div>
      </header>

      {session.upstream === 'disconnected' ? (
        <p className="state state--error">
          실시간 연결이 끊어졌습니다. 아래 값은 마지막으로 수신한 값입니다.
          {session.message ? ' (' + session.message + ')' : ''}
        </p>
      ) : null}

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
          ) : codes.length === 0 ? (
            <p className="state">
              관심종목이 비어 있습니다. 종목 탐색·인기 종목에서 ★ 를 누르거나 위에 코드를
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
