/**
 * BFF 라우트 상수. 프론트 shared/api 와 Nest 컨트롤러가 같은 문자열을 쓴다.
 */
export const API_ROUTES = {
  health: '/api/health',
  market: {
    symbols: '/api/market/symbols',
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
  },
  realtimeSocket: '/ws',
} as const;
