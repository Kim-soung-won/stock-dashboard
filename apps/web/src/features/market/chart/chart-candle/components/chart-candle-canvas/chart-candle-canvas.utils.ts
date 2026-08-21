import type { EChartsOption } from 'echarts';
import type { ChartSeriesData } from '@/entities/market/chart';
import { formatCandleLabel } from '@/entities/market/chart';

/**
 * ECharts 옵션 조립 (스타일 결정은 features 계층의 몫).
 *
 * 색은 index.css 의 CSS 변수를 읽어 쓴다 — 상승 빨강 / 하락 파랑(국내 관례)을
 * 표와 차트가 같은 값으로 유지하기 위해서다.
 */

const cssVar = (name: string, fallback: string): string => {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

export interface ChartTheme {
  up: string;
  down: string;
  text: string;
  textDim: string;
  line: string;
  background: string;
}

export const readChartTheme = (): ChartTheme => ({
  up: cssVar('--up', '#ff5b5b'),
  down: cssVar('--down', '#4c8dff'),
  text: cssVar('--text', '#e6edf3'),
  textDim: cssVar('--text-dim', '#8b949e'),
  line: cssVar('--line', '#2a3139'),
  background: cssVar('--bg', '#0e1116'),
});

const formatNumber = (value: number): string => new Intl.NumberFormat('ko-KR').format(value);

/**
 * axis trigger 툴팁이 넘겨주는 항목. ECharts 의 공용 파라미터 타입에는 `axisValue` 가
 * 없어(trigger 별로 필드가 달라진다) 필요한 필드만 좁혀서 쓴다.
 */
interface AxisTooltipParam {
  seriesName?: string;
  axisValue?: string | number;
  value: unknown;
}

/** 마지막 N개만 보이게 하는 초기 줌 범위(%). 전체 데이터는 유지해 스크롤로 볼 수 있다. */
const initialZoomStart = (total: number, visible = 90): number =>
  total <= visible ? 0 : Math.max(0, 100 - (visible / total) * 100);

export const buildCandleOption = (
  series: ChartSeriesData,
  theme: ChartTheme,
  label: string,
): EChartsOption => ({
  animation: false, // 실시간 갱신이 들어오므로 애니메이션은 끈다(값이 튀어 보인다)
  backgroundColor: 'transparent',
  textStyle: { color: theme.textDim, fontFamily: 'inherit' },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'cross', label: { backgroundColor: theme.line } },
    backgroundColor: theme.background,
    borderColor: theme.line,
    textStyle: { color: theme.text, fontSize: 12 },
    formatter: (params) => {
      const rows = (Array.isArray(params) ? params : [params]) as unknown as AxisTooltipParam[];
      const candle = rows.find((row) => row.seriesName === label);
      const volume = rows.find((row) => row.seriesName === '거래량');
      if (!candle) return '';
      // candlestick 의 value 는 [index, 시가, 종가, 저가, 고가]
      const [, open, close, low, high] = candle.value as [number, number, number, number, number];
      const rising = close >= open;
      const color = rising ? theme.up : theme.down;
      const volumeValue =
        typeof volume?.value === 'number'
          ? volume.value
          : ((volume?.value as { value?: number } | undefined)?.value ?? 0);
      return [
        `<b>${String(candle.axisValue)}</b>`,
        `시가 ${formatNumber(open)}`,
        `고가 ${formatNumber(high)}`,
        `저가 ${formatNumber(low)}`,
        `<span style="color:${color}">종가 ${formatNumber(close)}</span>`,
        `거래량 ${formatNumber(volumeValue)}`,
      ].join('<br/>');
    },
  },
  axisPointer: { link: [{ xAxisIndex: 'all' }] },
  // 위: 가격, 아래: 거래량. x축을 공유해 커서가 같이 움직인다.
  grid: [
    { left: 56, right: 16, top: 12, height: '62%' },
    { left: 56, right: 16, top: '74%', height: '16%' },
  ],
  xAxis: [
    {
      type: 'category',
      data: series.categories,
      boundaryGap: true,
      axisLine: { lineStyle: { color: theme.line } },
      axisLabel: { color: theme.textDim, formatter: (value: string) => formatCandleLabel(value) },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    {
      type: 'category',
      gridIndex: 1,
      data: series.categories,
      boundaryGap: true,
      axisLine: { lineStyle: { color: theme.line } },
      axisLabel: { show: false },
      axisTick: { show: false },
    },
  ],
  yAxis: [
    {
      scale: true,
      position: 'left',
      axisLine: { show: false },
      axisLabel: { color: theme.textDim, formatter: (value: number) => formatNumber(value) },
      splitLine: { lineStyle: { color: theme.line, type: 'dashed' } },
    },
    {
      gridIndex: 1,
      scale: true,
      axisLine: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
  ],
  dataZoom: [
    { type: 'inside', xAxisIndex: [0, 1], start: initialZoomStart(series.categories.length), end: 100 },
    {
      type: 'slider',
      xAxisIndex: [0, 1],
      bottom: 4,
      height: 16,
      borderColor: theme.line,
      fillerColor: 'rgba(255,255,255,0.06)',
      handleStyle: { color: theme.textDim },
      textStyle: { color: theme.textDim },
      start: initialZoomStart(series.categories.length),
      end: 100,
    },
  ],
  series: [
    {
      name: label,
      type: 'candlestick',
      data: series.candles,
      itemStyle: {
        // 국내 관례: 상승 빨강 / 하락 파랑. 양봉은 속을 비운다.
        color: 'transparent',
        color0: 'transparent',
        borderColor: theme.up,
        borderColor0: theme.down,
      },
    },
    {
      name: '거래량',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: series.volumes.map((volume) => ({
        value: volume.value,
        itemStyle: { color: volume.rising ? theme.up : theme.down, opacity: 0.55 },
      })),
    },
  ],
});
