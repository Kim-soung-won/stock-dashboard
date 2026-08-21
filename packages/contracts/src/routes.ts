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
  realtimeSocket: '/ws',
} as const;
