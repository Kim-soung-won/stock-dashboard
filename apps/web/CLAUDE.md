# apps/web — 프론트 기능 목록

React + Vite 대시보드(FSD 4계층). 이 파일은 **이 앱의 기능 인벤토리**를 관리한다. FSD 규칙·
데이터 패칭·에러 경계 등 방법론은 루트 `../../CLAUDE.md` 와 스킬을 따르고, 여기서는 "어떤
페이지·기능이 있고 어디에 사는가"만 최신으로 유지한다.

> **유지보수 규칙 (중요)**
> 페이지·feature·entities 슬라이스를 **추가/변경/삭제하면 아래 표를 같은 변경에서 갱신**한다.
> 새 화면을 붙이는 순서(`shared/api → entities → features → pages`)와 계층 규칙은 루트 CLAUDE.md.
> 네비 항목은 `src/shared/lib/menu-items.ts`, 경로 상수는 `path-keys.ts`, 조립은 `router.tsx`.

## 페이지 (네비게이션)

로그인(`/login`)은 앱 셸 밖 독립 화면이고, 나머지는 `RequireAuth` 로 감싼 셸 안에 있다.

| 그룹 | 화면 | 경로 | 페이지 슬라이스 |
| --- | --- | --- | --- |
| 경쟁 | 리더보드 | `/competition/leaderboard` | `pages/competition/leaderboard` |
| 경쟁 | 내 포트폴리오 | `/competition/portfolio` | `pages/competition/portfolio` |
| 시세 | 실시간 대시보드 | `/market/dashboard` | `pages/market/dashboard` |
| 시세 | 인기 종목 | `/market/popular` | `pages/market/popular` |
| 시세 | 종목 탐색 | `/market/symbols` | `pages/market/symbols` |
| 관심종목 | 관심종목 | `/watchlist` | `pages/watchlist` |
| 프로필 | 내 프로필 | `/profile/me` | `pages/profile` |
| 프로필 | 유저 프로필(SNS, 남이 조회) | `/profile/:id` | `pages/profile` |
| 계좌 | 잔고·손익 | `/account/balance` | `pages/account/balance` |
| 주문 | 주문·이력 | `/trading/order` | `pages/trading/order` |
| (셸 밖) | 로그인/참가 | `/login` | `pages/auth/login` |

## Feature (도메인별 UI 조각)

| 도메인 | feature | 역할 |
| --- | --- | --- |
| auth/login | `form-login` | 닉네임+PIN 참가/로그인 |
| competition/leaderboard | `table-leaderboard` | 실시간 순위표(WS 팬아웃) |
| competition/portfolio | `summary-portfolio`·`table-holdings`·`table-trades` | 포트폴리오 요약·보유·체결 |
| competition/trade | `form-trade` | 시장가 페이퍼 매매(성공 시 포트폴리오·리더보드 무효화) |
| market/chart | `chart-candle` | 봉 차트(ECharts) |
| market/quote | `table-watchlist` | 관심종목 실시간 시세표(대시보드·관심종목 페이지 공용) |
| market/ranking | `table-ranking` | 순위표 + **★ 관심 토글** |
| market/symbol | `table-symbols` | 종목 검색/페이지네이션 + **★ 관심 토글** |
| account/balance | `summary-balance`·`table-balance`·`table-pending-orders` | 잔고 요약·보유·미체결 |
| trading/order | `form-order`·`table-order-journal` | 주문 폼·주문 저널 |
| profile | `profile-view`(보유·체결 co-located)·`edit-profile` | 공개 프로필 뷰 + 본인 bio·아바타 편집 |

## Entities (서버 상태·도메인 모델)

`auth/session`, `market/{quote,chart,ranking,symbol,session}`, `account/balance`,
`competition/{leaderboard,portfolio,season}`, `trading/order`, `system/health`,
`watchlist/item`, `profile/detail`. 각 슬라이스는 `*.queries.ts`(+`*.mutations.ts`·`*.realtime.ts`·`*.libs.ts`)로
표현하고 배럴 `index.ts` 로만 노출한다.

## 횡단 UI / 인프라 (shared)

| 기능 | 설명 | 위치 |
| --- | --- | --- |
| 테마 스킨 | 도트(arcade) ↔ 터미널 전환 | `shared/lib/theme-store.ts`, `shared/ui/theme-toggle` |
| 명암 모드 | 다크 ↔ 라이트(각 테마별 팔레트) | `shared/lib/mode-store.ts`, `shared/ui/mode-toggle` |
| 관심 토글 | 순수 표시용 ★ 버튼(데이터는 `entities/watchlist`) | `shared/ui/star-button` |
| 사용자 식별 | 모든 요청에 `X-User-Id`(디바이스 id) 첨부 | `shared/api/base`, `shared/lib/client-id.ts` |
| 디버그 패널 | 에러·쿼리 실패·실시간 변화 창구(`Ctrl+Shift+D`) | `shared/ui/debug-panel` |
| 공용 UI | `Panel`·`StatusDot`·`ValueText`·`ErrorBoundary`·`QueryErrorBoundary`·`StaleOverlay` | `shared/ui` |

> 관심종목 ★ 는 `market/symbol`·`market/ranking` 행에 통합돼 있다(feature → `entities/watchlist`
> 훅으로 데이터 주입, 표시는 `shared/ui` StarButton — feature 간 직접 import 아님).
>
> 프로필 진입점: 리더보드 닉네임 → `/profile/:id` 링크, 헤더 아바타 → `/profile/me`.
> 프로필 페이지는 `ProfileView`(feature)와 `TableWatchlist`(market/quote feature)를 **페이지에서**
> 조립한다(feature 간 직접 import 회피).

## 테스트

콜로케이트 `*.spec.ts(x)`, vitest(jsdom) + `@testing-library/react`. `pnpm --filter @stock/web test`.
정책·원칙은 루트 `../../CLAUDE.md` 의 "테스트".

- libs/model: 순수 로직·쿼리 결정. react-query 훅은 `QueryClientProvider` 래퍼 + 서비스 목킹으로
  `renderHook`(예: `entities/watchlist/item/watchlist.model.spec.tsx` — toggle add/remove 결정).
- 컴포넌트: 권한·상태 분기 등 사용자 계약(예: `shared/ui/error-boundary/error-boundary.spec.tsx`).
- 구현 박제(change-detector) 금지 — 계약만 고정. 새 슬라이스는 계약 spec 을 함께 추가한다.
