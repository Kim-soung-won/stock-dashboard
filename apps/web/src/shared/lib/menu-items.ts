import { pathKeys } from './path-keys';

/** 사이드바 메뉴 그룹 = FSD 의 group 폴더와 1:1 로 맞춘다. */
export const menuItems = [
  {
    group: '경쟁',
    items: [
      { label: '리더보드', to: pathKeys.competition.leaderboard },
      { label: '내 포트폴리오', to: pathKeys.competition.portfolio },
    ],
  },
  {
    group: '시세',
    items: [
      { label: '실시간 대시보드', to: pathKeys.market.dashboard },
      { label: '인기 종목', to: pathKeys.market.popular },
      { label: '종목 탐색', to: pathKeys.market.symbols },
    ],
  },
  {
    group: '관심종목',
    items: [{ label: '관심종목', to: pathKeys.watchlist.list }],
  },
  {
    group: '프로필',
    items: [{ label: '내 프로필', to: pathKeys.profile.me }],
  },
  {
    group: '계좌',
    items: [{ label: '잔고·손익', to: pathKeys.account.balance }],
  },
  {
    group: '주문',
    items: [{ label: '주문·이력', to: pathKeys.trading.order }],
  },
] as const;
