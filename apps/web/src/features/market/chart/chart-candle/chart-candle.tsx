import { useState } from 'react';
import type { CandleInterval } from '@stock/contracts';
import { chartQueries } from '@/entities/market/chart';
import { QueryErrorBoundary } from '@/shared/ui';
import { INTERVAL_LABEL, SELECTABLE_INTERVALS } from './chart-candle.constants';
import { ChartCandleCanvas } from './components/chart-candle-canvas';

interface ChartCandleProps {
  code: string;
  /** 표시용 종목명. 없으면 코드만 보여준다(조회하지 않는다 — 부른 쪽이 이미 알고 있다). */
  name?: string | null;
  defaultInterval?: CandleInterval;
}

/**
 * 캔들 차트 — 필터 레이어 (바운더리 "밖").
 *
 * 헤더에 **종목명**을 함께 띄운다 — 코드만 있으면 무슨 종목을 보고 있는지 알 수 없다.
 * 이름은 선택한 표의 행에서 넘어오므로 별도 조회를 하지 않는다.
 *
 * 봉 간격 토글은 쿼리 결과에 의존하지 않으므로 바운더리 밖에 둔다. 안에 두면 차트가
 * 재조회로 suspend 하거나 에러가 날 때 토글까지 사라져서, 다른 간격으로 빠져나올
 * 방법이 없어진다. 바운더리는 이 필터 레이어가 소유한다(페이지에서 다시 감싸지 않는다).
 */
export const ChartCandle = ({ code, name, defaultInterval = 'day' }: ChartCandleProps) => {
  const [interval, setInterval] = useState<CandleInterval>(defaultInterval);

  return (
    <div className="chart">
      <div className="chart__head">
        <span className="chart__name">{name ?? code}</span>
        {name ? <span className="chart__code">{code}</span> : null}
      </div>

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
