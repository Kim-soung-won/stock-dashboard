import { useState } from 'react';
import type { CandleInterval } from '@stock/contracts';
import { chartQueries } from '@/entities/market/chart';
import { QueryErrorBoundary } from '@/shared/ui';
import { INTERVAL_LABEL, SELECTABLE_INTERVALS } from './chart-candle.constants';
import { ChartCandleCanvas } from './components/chart-candle-canvas';

interface ChartCandleProps {
  code: string;
  defaultInterval?: CandleInterval;
}

/**
 * 캔들 차트 — 필터 레이어 (바운더리 "밖").
 *
 * 봉 간격 토글은 쿼리 결과에 의존하지 않으므로 바운더리 밖에 둔다. 안에 두면 차트가
 * 재조회로 suspend 하거나 에러가 날 때 토글까지 사라져서, 다른 간격으로 빠져나올
 * 방법이 없어진다. 바운더리는 이 필터 레이어가 소유한다(페이지에서 다시 감싸지 않는다).
 */
export const ChartCandle = ({ code, defaultInterval = 'day' }: ChartCandleProps) => {
  const [interval, setInterval] = useState<CandleInterval>(defaultInterval);

  return (
    <div className="chart">
      <div className="interval-switch">
        {SELECTABLE_INTERVALS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
          >
            {INTERVAL_LABEL[value]}
          </button>
        ))}
      </div>

      <QueryErrorBoundary
        context={`chart:${code}`}
        queryKey={chartQueries.all()}
        // 종목·간격이 바뀌면 이전 종목의 실패를 붙들고 있지 않는다.
        resetKeys={[code, interval]}
        fallback={<p className="state">차트 로딩 중…</p>}
      >
        <ChartCandleCanvas code={code} interval={interval} />
      </QueryErrorBoundary>
    </div>
  );
};
