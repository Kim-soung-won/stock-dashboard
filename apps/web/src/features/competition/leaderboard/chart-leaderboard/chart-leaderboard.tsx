import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useSession } from '@/entities/auth/session';
import { leaderboardQueries, toHistoryLines } from '@/entities/competition/leaderboard';
import { buildLeaderboardHistoryOption } from './chart-leaderboard.utils';

// 전체 echarts 대신 이 차트가 쓰는 모듈만 등록한다.
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

/**
 * 리더보드 총평가금액 추이 라인차트.
 *
 * 순위표는 "지금 누가 앞서는가"를, 이 차트는 "시간에 따라 어떻게 벌어졌는가"를 보여준다.
 * 데이터는 서버가 성기게 쌓는 스냅샷 시계열(REST)이고 WS 로 실시간 갱신되지 않는다 —
 * 곡선은 새 스냅샷이 쌓일 때만 바뀌므로 폴링하지 않는다. 스냅샷이 2점 미만이면 아직
 * 그릴 곡선이 없다고 안내한다(빈 화면 대신).
 */
export const ChartLeaderboard = () => {
  const container = useRef<HTMLDivElement | null>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  const { participant } = useSession();
  const { data: history, isPending, isError, error } = useQuery(leaderboardQueries.history());

  const lines = useMemo(
    () => (history ? toHistoryLines(history, participant?.id) : []),
    [history, participant?.id],
  );
  const hasCurve = lines.some((line) => line.points.length >= 2);

  // 인스턴스 생성/파괴 + 리사이즈 추적 (캔들차트와 같은 패턴).
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

  useEffect(() => {
    if (!chart.current || !hasCurve) return;
    chart.current.setOption(buildLeaderboardHistoryOption(lines), true);
  }, [lines, hasCurve]);

  if (isPending) return <p className="state">추이 불러오는 중…</p>;
  if (isError) return <p className="state state--error">추이를 불러오지 못했습니다: {error.message}</p>;

  return (
    <div>
      <div
        ref={container}
        className="chart__canvas"
        style={{ display: hasCurve ? 'block' : 'none' }}
      />
      {!hasCurve ? (
        <p className="state">
          아직 추이를 그릴 스냅샷이 부족합니다. 시간이 지나 데이터가 쌓이면 곡선이 나타납니다.
        </p>
      ) : null}
    </div>
  );
};
