import { pathKeys } from './path-keys';

/**
 * 상단 메인 네비 — **자주 오가는 탐색 화면만** 남긴다.
 *
 * 실시간 시세와 인기 종목은 하는 일이 겹쳐서 메인 화면(`/`) 하나로 합쳤고, 그 화면으로는
 * 좌측 상단 로고로 돌아간다(메뉴 항목을 따로 두지 않는다).
 */
export const menuItems = [
  {
    group: '경쟁',
    items: [{ label: '리더보드', to: pathKeys.competition.leaderboard }],
  },
  {
    group: '시세',
    items: [{ label: '종목 탐색', to: pathKeys.market.symbols }],
  },
  {
    group: '관심종목',
    items: [{ label: '관심종목', to: pathKeys.watchlist.list }],
  },
] as const;

/**
 * 우측 상단 프로필 드롭다운 — **내 것**만 모은다.
 *
 * 내 포트폴리오·프로필·잔고·주문이력은 하루에 몇 번 보는 화면이라 상단 네비를 차지할
 * 이유가 없다. 상시 노출이 필요한 값(SCORE/HI-SCORE·MOCK/REAL)은 헤더에 그대로 둔다.
 */
export const userMenuItems = [
  { label: '내 포트폴리오', to: pathKeys.competition.portfolio },
  { label: '내 프로필', to: pathKeys.profile.me },
  { label: '잔고·손익', to: pathKeys.account.balance },
  { label: '주문·이력', to: pathKeys.trading.order },
] as const;
