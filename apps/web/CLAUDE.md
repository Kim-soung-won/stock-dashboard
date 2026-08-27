# apps/web — 프론트 기능 목록

React + Vite 대시보드(FSD 4계층). 이 파일은 **이 앱의 기능 인벤토리**를 관리한다. FSD 규칙·
데이터 패칭·에러 경계 등 방법론은 루트 `../../CLAUDE.md` 와 스킬을 따르고, 여기서는 "어떤
페이지·기능이 있고 어디에 사는가"만 최신으로 유지한다.

> **유지보수 규칙 (중요)**
> 페이지·feature·entities 슬라이스를 **추가/변경/삭제하면 아래 표를 같은 변경에서 갱신**한다.
> 새 화면을 붙이는 순서(`shared/api → entities → features → pages`)와 계층 규칙은 루트 CLAUDE.md.
> 네비 항목은 `src/shared/lib/menu-items.ts`(`menuItems` 상단 네비 / `userMenuItems` 프로필
> 드롭다운), 경로 상수는 `path-keys.ts`, 조립은 `router.tsx`.

## 페이지 (네비게이션)

로그인(`/login`)은 앱 셸 밖 독립 화면이고, 나머지는 `RequireAuth` 로 감싼 셸 안에 있다.

진입점은 세 갈래다 — **로고**(메인), **상단 네비**(탐색 화면), **프로필 드롭다운**(내 화면).

| 진입 | 화면 | 경로 | 페이지 슬라이스 |
| --- | --- | --- | --- |
| 로고 | 메인: 실시간 시세+순위+차트+주문 | `/` (index) | `pages/market/home` |
| 네비 | 리더보드 | `/competition/leaderboard` | `pages/competition/leaderboard` |
| 네비 | 종목 탐색 | `/market/symbols` | `pages/market/symbols` |
| 네비 | 관심종목 | `/watchlist` | `pages/watchlist` |
| 드롭다운 | 내 포트폴리오 | `/competition/portfolio` | `pages/competition/portfolio` |
| 드롭다운 | 내 프로필 | `/profile/me` | `pages/profile` |
| 드롭다운 | 잔고·손익 | `/account/balance` | `pages/account/balance` |
| 드롭다운 | 주문·이력 (실계좌) | `/trading/order` | `pages/trading/order` |
| 링크 | 유저 프로필(SNS, 남이 조회) | `/profile/:id` | `pages/profile` |
| (셸 밖) | 로그인/참가 | `/login` | `pages/auth/login` |
| (리다이렉트) | 통합 전 경로 → 메인 | `/market/dashboard`·`/market/popular` | `pages/market/home` |

> 예전 "실시간 대시보드"와 "인기 종목"은 둘 다 *표에서 종목을 골라 옆 차트를 보는* 화면이라
> 메인 하나로 합쳤다. 메뉴 항목은 없애고 **로고**가 이 화면으로 돌아온다.

## Feature (도메인별 UI 조각)

| 도메인 | feature | 역할 |
| --- | --- | --- |
| auth/login | `form-login` | 닉네임+PIN 참가/로그인 |
| competition/leaderboard | `table-leaderboard`·`chart-leaderboard` | 실시간 순위표(WS) + **일별 종가 추이 라인차트**(ECharts, 최근 30일, 일별 스냅샷 REST) |
| competition/portfolio | `summary-portfolio`·`table-holdings`·`table-trades` | 포트폴리오 요약·보유·체결 |
| competition/trade | `form-trade`(+`trade-confirm` 코로케이션) | 시장가 페이퍼 매매(종목명 검색 + `symbol` prop 프리필, **장 운영시간 밖 잠금**, **확인 다이얼로그로 예수금 영향 안내 후 체결**) |
| market/chart | `chart-candle` | 봉 차트(ECharts). 헤더에 **종목명** 표기(`name` prop) |
| market/quote | `table-watchlist`·`form-add-watch` | 관심종목 실시간 시세표 + **종목명 검색 추가 폼**(대시보드·관심종목 페이지 공용) |
| market/ranking | `table-ranking` | 순위표(인기·시가총액·거래량·거래대금·등락률) + **★ 관심 토글** |
| market/symbol | `table-symbols` | 종목명·코드 검색/페이지네이션 + **★ 관심 토글** |
| account/balance | `summary-balance`·`table-balance`·`table-pending-orders` | 잔고 요약·보유·미체결 |
| trading/order | `form-order`·`table-order-journal` | 주문 폼(종목명 검색)·주문 저널 |
| profile | `profile-view`(보유·체결 co-located)·`edit-profile` | 공개 프로필 뷰 + 본인 bio·아바타 편집 |

## Entities (서버 상태·도메인 모델)

`auth/session`, `market/{quote,chart,ranking,symbol,session}`(session 에 `useMarketHours` 포함), `account/balance`,
`competition/{leaderboard,portfolio,season}`, `trading/order`, `system/health`,
`watchlist/item`, `profile/detail`. 각 슬라이스는 `*.queries.ts`(+`*.mutations.ts`·`*.realtime.ts`·`*.libs.ts`)로
표현하고 배럴 `index.ts` 로만 노출한다.

## 횡단 UI / 인프라 (shared)

| 기능 | 설명 | 위치 |
| --- | --- | --- |
| 테마 스킨 | 도트(arcade) ↔ 터미널 전환 | `shared/lib/theme-store.ts`, `shared/ui/theme-toggle` |
| 명암 모드 | 다크 ↔ 라이트(각 테마별 팔레트) | `shared/lib/mode-store.ts`, `shared/ui/mode-toggle` |
| 관심 토글 | 순수 표시용 ★ 버튼(데이터는 `entities/watchlist`) | `shared/ui/star-button` |
| 종목 검색 입력 | 순수 표시용 자동완성 콤보박스(데이터는 `entities/market/symbol`) | `shared/ui/symbol-search-input` |
| 선택 종목 | 화면이 들고 다니는 `{code, name}` + `symbolLabel` (표 → 차트·주문 폼) | `shared/lib/selected-symbol.ts` |
| 프로필 드롭다운 | 내 화면 4개 + 로그아웃(바깥 클릭·Escape·경로 변경 시 닫힘) | `src/user-menu.tsx` |
| 사용자 식별 | 모든 요청에 `X-User-Id`(디바이스 id) 첨부 | `shared/api/base`, `shared/lib/client-id.ts` |
| 디버그 패널 | 에러·쿼리 실패·실시간 변화 창구(`Ctrl+Shift+D`) | `shared/ui/debug-panel` |
| 공용 UI | `Panel`·`Dialog`·`StatusDot`·`ValueText`·`ErrorBoundary`·`QueryErrorBoundary`·`StaleOverlay` | `shared/ui` |
| 다이얼로그 | 네이티브 `<dialog>` + `showModal()` — 포커스 트랩·Esc·배경은 브라우저가 처리 | `shared/ui/dialog` |
| 디자인 토큰 | 타입 스케일·컨트롤 높이·여백·모서리 (아래 표) | `src/index.css` `:root` |

> 관심종목 ★ 는 `market/symbol`·`market/ranking` 행에 통합돼 있다(feature → `entities/watchlist`
> 훅으로 데이터 주입, 표시는 `shared/ui` StarButton — feature 간 직접 import 아님).
> ★ 토글은 **낙관적 갱신**이다 — 클릭 즉시 캐시가 바뀌고, 실패하면 되돌린다(`watchlist.mutations`).
>
> **종목명 검색**도 같은 분담이다: 데이터·확정 판정은 `entities/market/symbol` 의
> `useSymbolPicker`(+ `resolveSymbolCode`), 표시는 `shared/ui` SymbolSearchInput. 그래서
> 서로 다른 도메인의 feature(`competition/trade`·`trading/order`·`market/quote`)가 같은
> 입력을 쓰면서도 feature 끼리 import 하지 않는다.
>
> **돈이 오가는 동작은 금액을 먼저 보여준다.** 시장가라 사용자는 얼마가 빠져나가는지
> 모른 채 버튼을 누른다 — `FormTrade` 는 바로 체결하지 않고 `Dialog` 로 거래대금·수수료·
> 세금과 **체결 후 예수금**을 보여준 뒤 확정을 받는다. 금액 계산은 서버가 실제 현금을
> 옮길 때 쓰는 식(`@stock/contracts` 의 `previewTrade`)과 같은 것이라 어긋나지 않는다.
>
> **종목을 고르면 차트와 주문 창이 함께 따라온다.** 표(feature)는 `SelectSymbol` 콜백으로
> `{code, name}` 을 올려보내고, 페이지가 상태로 쥐고 `ChartCandle`·`FormTrade` 에 내린다.
> 이름을 함께 넘기므로 차트 제목·주문 폼이 이름을 다시 조회하지 않는다. 종목이 바뀌면
> `key={selected.code}` 로 주문 폼을 갈아끼운다(수량·구분도 새 종목 기준으로 다시 정한다).
> 주문 창은 **페이퍼 매매**(경쟁)다 — 실계좌 주문은 프로필 드롭다운의 `주문·이력` 화면에만 있다.
>
> 프로필 진입점: 리더보드 닉네임 → `/profile/:id` 링크, 헤더 프로필 드롭다운 → `/profile/me`.
> 프로필 페이지는 `ProfileView`(feature)와 `TableWatchlist`(market/quote feature)를 **페이지에서**
> 조립한다(feature 간 직접 import 회피).

## 디자인 토큰 (`src/index.css`)

값을 직접 px 로 적지 않는다 — 토큰을 쓰면 "이건 몇 px 이었지"를 다시 고르지 않는다.

| 축 | 토큰 | 값 |
| --- | --- | --- |
| 폰트 | `--font-ui` / `--font-num` / `--font-display` | Pretendard(한글 UI) / IBM Plex Mono(숫자) / Press Start 2P(**로고 전용**) |
| 타입 | `--fs-3xs`…`--fs-xl` | 10 · 11 · 12 · 13 · 14 · 16 · 20 |
| 컨트롤 | `--ctl-h` / `--ctl-h-sm` | 34px(헤더·폼) / 26px(패널 안 툴바) |
| 여백 | `--sp-1`…`--sp-5` | 4 · 8 · 12 · 16 · 24 |
| 모서리 | `--radius` / `--radius-pill` | 테마가 소유(아케이드 0, 터미널 6px) |

- **`--font-display` 는 라틴 전용이다.** 한글이 들어가는 제목·본문에 쓰면 폴백이 제각각 된다.
- 숫자(가격·수량)는 `--font-num` + `tabular-nums`. 자리수가 맞아야 표를 훑을 수 있다.
- 입력·셀렉트·버튼은 한 규칙에서 `min-height: var(--ctl-h)` 로 높이를 공유한다.
  세로 padding 을 따로 주지 말 것 — 나란히 놓았을 때 높이가 어긋난다.
- 라벨 스타일에 `.x span` 같은 요소 선택자를 쓰지 않는다. 값으로 들어오는 `ValueText`(span)까지
  잡히고 명시도가 더 높아 값 크기를 덮어쓴다(`:not(.value-text)` 로 좁혀 둔 이유).

## 테스트

콜로케이트 `*.spec.ts(x)`, vitest(jsdom) + `@testing-library/react`. `pnpm --filter @stock/web test`.
정책·원칙은 루트 `../../CLAUDE.md` 의 "테스트".

- libs/model: 순수 로직·쿼리 결정. react-query 훅은 `QueryClientProvider` 래퍼 + 서비스 목킹으로
  `renderHook`(예: `entities/watchlist/item/watchlist.model.spec.tsx` — toggle add/remove 결정).
- 컴포넌트: 권한·상태 분기 등 사용자 계약(예: `shared/ui/error-boundary/error-boundary.spec.tsx`).
- 구현 박제(change-detector) 금지 — 계약만 고정. 새 슬라이스는 계약 spec 을 함께 추가한다.
