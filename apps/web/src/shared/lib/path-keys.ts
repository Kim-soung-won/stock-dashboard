/** 라우트 경로 단일 출처. 사이드바 메뉴와 route 정의가 같은 값을 쓴다. */
export const pathKeys = {
  root: '/',
  /** 통합 전 경로. 북마크가 404 로 떨어지지 않게 메인으로 리다이렉트한다. */
  legacy: {
    dashboard: '/market/dashboard',
    popular: '/market/popular',
  },
  market: {
    /**
     * 메인 화면. 실시간 시세 대시보드와 인기 종목이 하는 일이 겹쳐서 하나로 합쳤다.
     * 좌측 상단 로고가 이 경로로 돌아온다.
     */
    home: '/',
    symbols: '/market/symbols',
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
