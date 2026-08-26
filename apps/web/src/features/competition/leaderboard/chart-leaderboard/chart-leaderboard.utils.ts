import type { EChartsOption } from 'echarts';
import type { HistoryLine } from '@/entities/competition/leaderboard';

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const numberFormat = new Intl.NumberFormat('ko-KR');

/**
 * 참가자별 총평가금액 추이 라인차트 옵션.
 *
 * 시간축(type:'time')이라 곡선마다 점 개수가 달라도 알아서 배치된다. 색은 팔레트를
 * 순서대로 돌려쓰되, 내 곡선(highlighted)은 브랜드 액센트로 굵게 강조한다. 색은
 * index.css 변수를 읽어 표·다른 차트와 톤을 맞춘다.
 */
export const buildLeaderboardHistoryOption = (lines: HistoryLine[]): EChartsOption => {
  const text = cssVar('--text', '#e6edf3');
  const textDim = cssVar('--text-dim', '#8b949e');
  const line = cssVar('--line', '#2a3139');
  const accent = cssVar('--accent', '#2ee6a8');
  const palette = [
    cssVar('--gold', '#ffcd3c'),
    cssVar('--down', '#4c8dff'),
    cssVar('--up', '#ff5b5b'),
    '#a78bfa',
    '#4ec9a5',
    '#f78fb3',
  ];

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => (typeof value === 'number' ? `${numberFormat.format(value)}원` : '-'),
    },
    legend: { textStyle: { color: textDim }, top: 0, type: 'scroll' },
    grid: { left: 8, right: 16, bottom: 24, top: 32, containLabel: true },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: line } },
      axisLabel: { color: textDim },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: textDim, formatter: (value: number) => numberFormat.format(value) },
      splitLine: { lineStyle: { color: line } },
    },
    textStyle: { color: text },
    series: lines.map((entry, index) => ({
      name: entry.nickname,
      type: 'line',
      showSymbol: false,
      smooth: false,
      data: entry.points,
      z: entry.highlighted ? 10 : 1,
      lineStyle: {
        width: entry.highlighted ? 3 : 1.5,
        color: entry.highlighted ? accent : palette[index % palette.length],
      },
      itemStyle: { color: entry.highlighted ? accent : palette[index % palette.length] },
    })),
  };
};
