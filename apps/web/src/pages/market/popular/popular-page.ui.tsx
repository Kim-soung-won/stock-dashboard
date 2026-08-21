import { useState } from 'react';
import { ChartCandle } from '@/features/market/chart';
import { TableRanking } from '@/features/market/ranking';
import { Panel } from '@/shared/ui';

/**
 * 인기 종목 / 순위.
 *
 * 키움에 "인기 종목" TR 은 없다. 실시간 조회 순위(ka00198 빅데이터 순위)를 기본으로
 * 두고 거래량·거래대금·등락률 순위를 탭으로 함께 제공한다.
 */
export const PopularPage = () => {
  const [selected, setSelected] = useState('005930');

  return (
    <div className="page">
      <header className="page__head">
        <h1>인기 종목</h1>
      </header>

      <div className="layout-two">
        <Panel title="순위">
          <TableRanking onSelect={setSelected} />
        </Panel>

        <Panel title={selected + ' 차트'}>
          <ChartCandle code={selected} />
        </Panel>
      </div>
    </div>
  );
};
