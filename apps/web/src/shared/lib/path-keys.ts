/** 라우트 경로 단일 출처. 사이드바 메뉴와 route 정의가 같은 값을 쓴다. */
export const pathKeys = {
  root: '/',
  market: {
    dashboard: '/market/dashboard',
    symbols: '/market/symbols',
    popular: '/market/popular',
  },
  account: {
    balance: '/account/balance',
  },
  trading: {
    order: '/trading/order',
  },
  competition: {
    leaderboard: '/competition/leaderboard',
    portfolio: '/competition/portfolio',
  },
  watchlist: {
    list: '/watchlist',
  },
  profile: {
    /** 공개 프로필(SNS). 다른 참가자도 조회 가능 */
    view: (participantId: string) => `/profile/${participantId}`,
    /** 내 프로필(세션 id 로 해석) */
    me: '/profile/me',
  },
  auth: {
    login: '/login',
  },
} as const;
