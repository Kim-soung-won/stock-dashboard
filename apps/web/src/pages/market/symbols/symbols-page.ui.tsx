import { useState } from 'react';
import { ChartCandle } from '@/features/market/chart';
import { TableSymbols } from '@/features/market/symbol';
import { Panel } from '@/shared/ui';

/**
 * 전체 종목 탐색.
 *
 * 왼쪽에서 고른 종목을 오른쪽 차트가 받는다. 종목 마스터(ka10099)는 정적 데이터라
 * BFF 가 하루 단위로 캐시하고, 검색은 클라이언트에서 한다.
 */
export const SymbolsPage = () => {
  const [selected, setSelected] = useState('005930');

  return (
    <div className="page">
      <header className="page__head">
        <h1>종목 탐색</h1>
      </header>

      <div className="layout-two">
        <Panel title="전체 종목">
          <TableSymbols onSelect={setSelected} />
        </Panel>

        <Panel title={selected + ' 차트'}>
          <ChartCandle code={selected} />
        </Panel>
      </div>
    </div>
  );
};
