import { useState } from 'react';
import { MARKET_PHASE_LABEL, useSessionState } from '@/entities/market/session';
import { useWatchlist } from '@/entities/watchlist/item';
import { FormTrade } from '@/features/competition/trade';
import { ChartCandle } from '@/features/market/chart';
import { FormAddWatch, TableWatchlist } from '@/features/market/quote';
import { TableRanking } from '@/features/market/ranking';
import type { SelectedSymbol } from '@/shared/lib';
import { ErrorBoundary, Panel, StarButton, StatusDot } from '@/shared/ui';

const UPSTREAM_TONE = {
  ready: 'ok',
  connecting: 'warn',
  disconnected: 'error',
} as const;

/** 첫 진입에 보여줄 종목. 삼성전자는 장중 언제나 체결이 있어 화면이 비지 않는다. */
const DEFAULT_SYMBOL: SelectedSymbol = { code: '005930', name: '삼성전자' };

/**
 * 메인 화면 — 실시간 시세 + 순위 + 차트 + 주문.
 *
 * 예전 "실시간 대시보드"와 "인기 종목"은 하는 일이 겹쳤다(둘 다 표에서 종목을 골라
 * 옆의 차트를 보는 화면). 하나로 합쳐 메인으로 두고, 좌측 상단 로고가 여기로 돌아온다.
 *
 * 이 화면의 첫 번째 책임은 시세가 아니라 **값의 신선도**다. 업스트림이 끊긴 상태로
 * 마지막 가격이 떠 있으면 사용자는 그걸 현재가로 착각한다. 그래서 세션 상태와 장 상태
 * 배지를 항상 상단에 둔다.
 *
 * 고른 종목은 차트 **와 주문 창**에 함께 흐른다 — 종목을 보다가 사려면 다른 화면으로
 * 옮겨가야 하는 것이 이 앱에서 가장 불편한 지점이었다.
 */
export const HomePage = () => {
  const watch = useWatchlist();
  const session = useSessionState();
  const [selected, setSelected] = useState<SelectedSymbol>(DEFAULT_SYMBOL);
  const codes = watch.items.map((item) => item.code);

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
        <div className="stack">
          <Panel title="관심종목" actions={<FormAddWatch />}>
            {watch.isLoading ? (
              <p className="state">관심종목을 불러오는 중…</p>
            ) : codes.length === 0 ? (
              <p className="state">
                관심종목이 비어 있습니다. 아래 순위표나 종목 탐색에서 ★ 를 누르거나 위에서
                종목명으로 검색해 추가하세요.
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

          <Panel title="순위">
            <TableRanking onSelect={setSelected} />
          </Panel>
        </div>

        <div className="stack">
          <Panel title="차트">
            <ChartCandle code={selected.code} name={selected.name} />
          </Panel>

          <Panel title="주문 (모의투자 경쟁)">
            {/* 종목이 바뀌면 폼을 갈아끼운다 — 수량·구분도 새 종목 기준으로 다시 정한다. */}
            <ErrorBoundary context="home:trade">
              <FormTrade key={selected.code} symbol={selected} />
            </ErrorBoundary>
          </Panel>
        </div>
      </div>
    </div>
  );
};
