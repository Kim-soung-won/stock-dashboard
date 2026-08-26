import type { LeaderboardHistory } from '@stock/contracts';

/** 라인차트 한 곡선 — 시각(ms) × 총평가금액 점의 배열. */
export interface HistoryLine {
  participantId: string;
  nickname: string;
  /** [timestampMs, totalValue] — 시간축(type:'time')에 그대로 넣는다. */
  points: [number, number][];
  /** 곡선을 강조할지(예: 나). */
  highlighted: boolean;
}

/**
 * 서버 이력(참가자별 시계열)을 라인차트가 바로 쓰는 형태로 바꾼다.
 *
 * 시간축(ECharts type:'time')을 쓰므로 참가자마다 점 개수가 달라도 정렬할 필요가 없다
 * (각 곡선이 자기 [시각, 값]을 들고 있고, 축이 알아서 배치한다). 점이 없는 참가자는
 * 곡선으로 그릴 게 없으니 제외한다. `meId` 가 있으면 내 곡선을 강조 표시한다.
 */
export const toHistoryLines = (
  history: LeaderboardHistory,
  meId?: string | null,
): HistoryLine[] =>
  history.series
    .filter((series) => series.points.length > 0)
    .map((series) => ({
      participantId: series.participantId,
      nickname: series.nickname,
      points: series.points.map(
        (point): [number, number] => [new Date(point.at).getTime(), point.totalValue],
      ),
      highlighted: !!meId && series.participantId === meId,
    }));
