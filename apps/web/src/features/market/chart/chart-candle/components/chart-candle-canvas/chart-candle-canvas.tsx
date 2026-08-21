import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import type { CandleInterval } from '@stock/contracts';
import { BarChart, CandlestickChart } from 'echarts/charts';
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { applyTickToCandles, chartQueries, toChartSeriesData } from '@/entities/market/chart';
import { useTickStream } from '@/entities/market/quote';
import { formatWon } from '@/shared/lib';
import { StaleOverlay } from '@/shared/ui';
import { INTERVAL_LABEL } from '../../chart-candle.constants';
import { buildCandleOption, readChartTheme } from './chart-candle-canvas.utils';

// 전체 echarts(약 1MB) 대신 쓰는 모듈만 등록한다.
echarts.use([
  CandlestickChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  AxisPointerComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

interface ChartCandleCanvasProps {
  code: string;
  interval: CandleInterval;
}

/**
 * 데이터 레이어 — 바운더리 "안".
 *
 * 로딩·에러는 감싸는 `QueryErrorBoundary` 가 처리하므로 여기서 분기하지 않는다
 * (`useSuspenseQuery` 는 대기 중 suspend 하고 실패는 throw 한다).
 *
 * 봉 간격을 바꾸면 쿼리 키가 바뀌어 suspend 하는데, 그대로 두면 차트가 폴백으로
 * 교체돼 깜빡인다. `useDeferredValue` 로 이전 간격을 유지해 화면을 남기고
 * 갱신 중임은 StaleOverlay 로만 표시한다.
 */
export const ChartCandleCanvas = ({ code, interval }: ChartCandleCanvasProps) => {
  const container = useRef<HTMLDivElement | null>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  const deferredInterval = useDeferredValue(interval);
  const isStale = deferredInterval !== interval;

  const { data: candles } = useSuspenseQuery(chartQueries.candles(code, deferredInterval));
  const ticks = useTickStream(`chart:${code}`, [code]);
  const tick = ticks.get(code);

  const series = useMemo(
    () => toChartSeriesData(tick ? applyTickToCandles(candles, tick) : candles),
    [candles, tick],
  );

  // 인스턴스 생성/파괴 + 컨테이너 리사이즈 추적
  useEffect(() => {
    if (!container.current) return;
    const instance = echarts.init(container.current, undefined, { renderer: 'canvas' });
    chart.current = instance;

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  // notMerge 를 쓰지 않아 ECharts 가 diff 로 처리하고 사용자의 줌 상태가 유지된다.
  useEffect(() => {
    if (!chart.current) return;
    chart.current.setOption(
      buildCandleOption(series, readChartTheme(), `${INTERVAL_LABEL[deferredInterval]}봉`),
    );
  }, [series, deferredInterval]);

  const last = candles[candles.length - 1];

  return (
    <StaleOverlay isStale={isStale}>
      <div ref={container} className="chart__canvas" />
      <footer className="chart__legend">
        <span>
          {code} · {INTERVAL_LABEL[deferredInterval]}봉 {series.categories.length}개
          {series.categories.length === 0 ? ' (표시할 봉 없음)' : ''}
        </span>
        <span>
          최근 종가 {formatWon(tick?.price ?? last?.close ?? null)}
          {tick ? ' (실시간 반영)' : ''}
        </span>
      </footer>
    </StaleOverlay>
  );
};
