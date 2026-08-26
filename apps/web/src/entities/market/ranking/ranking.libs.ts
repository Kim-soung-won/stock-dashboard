import type { RankingKind, RankingMarket } from '@stock/contracts';

/** 순위 종류별 라벨과, 그 순위가 실제로 무엇인지에 대한 설명. */
export const RANKING_META: Readonly<
  Record<
    RankingKind,
    {
      label: string;
      description: string;
      showsVolume: boolean;
      showsValue: boolean;
      showsMarketCap: boolean;
      /** 시장 구분 파라미터가 없는 순위(탭을 잠근다). */
      ignoresMarket: boolean;
    }
  >
> = {
  views: {
    label: '인기',
    // ka00198 은 현재가 TR 이 아니다. 가격은 "기준 시점" 값이므로 그렇게 표기한다.
    description: '실시간 조회 순위(빅데이터). 가격은 기준 시점 값이며 현재가와 다를 수 있다',
    showsVolume: false,
    showsValue: false,
    showsMarketCap: false,
    // ka00198 은 시장 구분 파라미터가 없는 TR 이다.
    ignoresMarket: true,
  },
  volume: {
    label: '거래량',
    description: '당일 거래량 상위 (관리종목 제외, KRX)',
    showsVolume: true,
    showsValue: false,
    showsMarketCap: false,
    ignoresMarket: false,
  },
  value: {
    label: '거래대금',
    description: '당일 거래대금 상위 (KRX)',
    showsVolume: true,
    showsValue: true,
    showsMarketCap: false,
    ignoresMarket: false,
  },
  gainers: {
    label: '상승률',
    description: '전일대비 상승률 상위 (관리종목 제외, 상하한 포함)',
    showsVolume: false,
    showsValue: false,
    showsMarketCap: false,
    ignoresMarket: false,
  },
  losers: {
    label: '하락률',
    description: '전일대비 하락률 상위 (관리종목 제외, 상하한 포함)',
    showsVolume: false,
    showsValue: false,
    showsMarketCap: false,
    ignoresMarket: false,
  },
  marketCap: {
    label: '시가총액',
    // 파생값이라는 사실을 숨기지 않는다 — 장중에 순위가 안 움직이는 이유가 여기 있다.
    description:
      '시가총액 상위(상장주식수 x 전일종가). 키움에 국내 시가총액 순위 TR 이 없어 종목 마스터에서 파생한 전일 종가 기준값이다. ETF 는 제외',
    showsVolume: false,
    showsValue: false,
    showsMarketCap: true,
    ignoresMarket: false,
  },
};

export const RANKING_KINDS: readonly RankingKind[] = [
  'views',
  'marketCap',
  'volume',
  'value',
  'gainers',
  'losers',
];

export const RANKING_MARKET_LABEL: Readonly<Record<RankingMarket, string>> = {
  all: '전체',
  kospi: '코스피',
  kosdaq: '코스닥',
};

export const RANKING_MARKETS: readonly RankingMarket[] = ['all', 'kospi', 'kosdaq'];
