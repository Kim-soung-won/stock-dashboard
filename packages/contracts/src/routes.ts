/**
 * BFF 라우트 상수. 프론트 shared/api 와 Nest 컨트롤러가 같은 문자열을 쓴다.
 */
export const API_ROUTES = {
  health: '/api/health',
  market: {
    symbols: '/api/market/symbols',
    /** 종목명·코드 부분일치 검색(전 시장 통합). 이름으로 종목을 고르는 모든 입력이 쓴다. */
    symbolSearch: '/api/market/symbols/search',
    quote: (code: string) => `/api/market/quote/${code}`,
    candles: (code: string) => `/api/market/candles/${code}`,
    orderBook: (code: string) => `/api/market/order-book/${code}`,
    /** 순위(인기) 조회. kind = views | volume | value | gainers | losers */
    ranking: (kind: string) => `/api/market/ranking/${kind}`,
  },
  account: {
    balance: '/api/account/balance',
    pendingOrders: '/api/account/pending-orders',
  },
  trading: {
    orders: '/api/trading/orders',
    cancel: '/api/trading/orders/cancel',
    orderability: (code: string) => `/api/trading/orderability/${code}`,
  },
  auth: {
    /** 닉네임+PIN 으로 참가(신규)하거나 로그인(기존). Bearer 토큰을 돌려준다. */
    login: '/api/auth/login',
    /** 현재 토큰의 참가자 정보 */
    me: '/api/auth/me',
  },
  competition: {
    /** 현재 활성 시즌 */
    season: '/api/competition/season',
    /** 내 포트폴리오(현금+보유+평가). 인증 필요 */
    portfolio: '/api/competition/portfolio',
    /** 가상 매매(시장가). 인증 필요 */
    trade: '/api/competition/trade',
    /** 내 체결 이력. 인증 필요 */
    trades: '/api/competition/trades',
    /** 전체 순위(공개) */
    leaderboard: '/api/competition/leaderboard',
    /** 참가자별 총평가금액 추이(공개, 라인차트용) */
    leaderboardHistory: '/api/competition/leaderboard/history',
  },
  profile: {
    /** 공개 프로필 조회(SNS). 누구나 조회 가능 */
    view: (participantId: string) => `/api/participants/${participantId}/profile`,
    /** 내 프로필(bio·아바타) 수정. 인증 필요 */
    updateMine: '/api/profile',
  },
  watchlist: {
    /** 내 관심종목 목록. 인증 필요 */
    list: '/api/watchlist',
    /** 관심종목 추가(POST 같은 경로). 인증 필요 */
    add: '/api/watchlist',
    /** 관심종목 삭제(DELETE). 인증 필요 */
    remove: (code: string) => `/api/watchlist/${code}`,
  },
  realtimeSocket: '/ws',
} as const;
