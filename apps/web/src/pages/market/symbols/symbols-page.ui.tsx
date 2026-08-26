import { useState } from 'react';
import { FormTrade } from '@/features/competition/trade';
import { ChartCandle } from '@/features/market/chart';
import { TableSymbols } from '@/features/market/symbol';
import type { SelectedSymbol } from '@/shared/lib';
import { ErrorBoundary, Panel } from '@/shared/ui';

/** 첫 진입에 보여줄 종목. 장중 언제나 체결이 있어 화면이 비지 않는다. */
const DEFAULT_SYMBOL: SelectedSymbol = { code: '005930', name: '삼성전자' };

/**
 * 전체 종목 탐색.
 *
 * 왼쪽에서 고른 종목을 오른쪽 차트 **와 주문 창**이 받는다 — 종목을 찾다가 사려면
 * 다른 화면으로 옮겨가야 하는 것이 불편했다. 종목 마스터(ka10099)는 정적 데이터라
 * BFF 가 하루 단위로 캐시하고, 검색은 이름·코드 양쪽으로 된다.
 */
export const SymbolsPage = () => {
  const [selected, setSelected] = useState<SelectedSymbol>(DEFAULT_SYMBOL);

  return (
    <div className="page">
      <header className="page__head">
        <h1>종목 탐색</h1>
      </header>

      <div className="layout-two">
        <Panel title="전체 종목">
          <TableSymbols onSelect={setSelected} />
        </Panel>

        <div className="stack">
          <Panel title="차트">
            <ChartCandle code={selected.code} name={selected.name} />
          </Panel>

          <Panel title="주문 (모의투자 경쟁)">
            {/* 종목이 바뀌면 폼을 갈아끼운다 — 수량·구분도 새 종목 기준으로 다시 정한다. */}
            <ErrorBoundary context="symbols:trade">
              <FormTrade key={selected.code} symbol={selected} />
            </ErrorBoundary>
          </Panel>
        </div>
      </div>
    </div>
  );
};
