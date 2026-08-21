import type { RankingKind, RankingMarket } from '@stock/contracts';

/** 순위 종류별 라벨과, 그 순위가 실제로 무엇인지에 대한 설명. */
export const RANKING_META: Readonly<
  Record<RankingKind, { label: string; description: string; showsVolume: boolean; showsValue: boolean }>
> = {
  views: {
    label: '인기',
    // ka00198 은 현재가 TR 이 아니다. 가격은 "기준 시점" 값이므로 그렇게 표기한다.
    description: '실시간 조회 순위(빅데이터). 가격은 기준 시점 값이며 현재가와 다를 수 있다',
    showsVolume: false,
    showsValue: false,
  },
  volume: {
    label: '거래량',
    description: '당일 거래량 상위 (관리종목 제외, KRX)',
    showsVolume: true,
    showsValue: false,
  },
  value: {
    label: '거래대금',
    description: '당일 거래대금 상위 (KRX)',
    showsVolume: true,
    showsValue: true,
  },
  gainers: {
    label: '상승률',
    description: '전일대비 상승률 상위 (관리종목 제외, 상하한 포함)',
    showsVolume: false,
    showsValue: false,
  },
  losers: {
    label: '하락률',
    description: '전일대비 하락률 상위 (관리종목 제외, 상하한 포함)',
    showsVolume: false,
    showsValue: false,
  },
};

export const RANKING_KINDS: readonly RankingKind[] = ['views', 'volume', 'value', 'gainers', 'losers'];

export const RANKING_MARKET_LABEL: Readonly<Record<RankingMarket, string>> = {
  all: '전체',
  kospi: '코스피',
  kosdaq: '코스닥',
};

export const RANKING_MARKETS: readonly RankingMarket[] = ['all', 'kospi', 'kosdaq'];
