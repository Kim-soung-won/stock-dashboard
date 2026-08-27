# 기능 현황 (FEATURES)

개발자 공유용 롤업. 1차 출처는 `apps/api/CLAUDE.md`·`apps/web/CLAUDE.md`이고 여기서
사람이 보기 좋게 모은다. 상태 범례:

- ✅ 안정 (스펙으로 계약 고정됨)
- 🟢 동작 (스펙 없음/부분)
- ⚠️ 주의 (아래 "알아둘 점" 참고)
- 🚧 예정/미구현

마지막 갱신: 2026-08-26

## 시세 (Market)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 메인 화면 (시세+순위+차트+주문) | ✅ | `GET /api/market/quote·candles·ranking` · `/` | `market.mapper`·`quote.libs`·`chart.libs` |
| 종목 탐색 | 🟢 | `GET /api/market/symbols` · `/market/symbols` | — |
| 종목명 검색(전 시장 자동완성) | ✅ | `GET /api/market/symbols/search` · 관심종목·주문·매매 입력 | `market.mapper`(관련도)·`symbol.libs` |
| 인기·순위 | ✅ | `GET /api/market/ranking/:kind` · 메인 화면 | `ranking.mapper` |
| **시가총액 순위** | ⚠️✅ | 같은 엔드포인트(`kind=marketCap`) · 메인 화면 | `market.mapper`(`marketCapOf`·`toMarketCapRanking`) |
| 캔들 차트 (종목명 표기) | ✅ | (candles) · 메인/종목 탐색/관심종목 | `chart.libs`·`selected-symbol` |
| 선택 종목 즉시 주문 | ✅ | `POST /api/competition/trade` · 차트 옆 주문 창 | `symbol.model`(프리필) |
| 실시간 체결 스트림 | ✅ | `WS /ws` (tick·orderBook) | `realtime.mapper` |

## 경쟁 — 모의투자 (Competition)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 참가/로그인 (닉네임+PIN) | ✅ | `POST /api/auth/login` · `GET /api/auth/me` · `/login` | `auth.service`·`auth.tokens` |
| 시장가 페이퍼 매매 | ✅ | `POST /api/competition/trade` | `competition.service`(돈계산·가드) |
| 매매 확인 다이얼로그 (예수금 영향 안내) | ✅ | 매매 폼 | `trade-preview`(contracts)·`form-trade.spec` |
| 거래시간 제한 (평일 09:00~15:30) | ⚠️✅ | 같은 엔드포인트 · 매매 폼 잠금 | `market-hours`(contracts)·`market-hours.model` |
| 내 포트폴리오 | ✅ | `GET /api/competition/portfolio` · `/competition/portfolio` | `competition.mapper`·`portfolio.libs` |
| 리더보드 (실시간 순위) | ✅ | `GET /api/competition/leaderboard` · `WS leaderboard` · `/competition/leaderboard` | (WS 팬아웃) |
| 리더보드 추이 라인차트 | ⚠️✅ | `GET /api/competition/leaderboard/history` · 같은 화면 | `leaderboard.service`·`leaderboard-history.libs` |
| 시즌 | ✅ | `GET /api/competition/season` | `season.libs` |
| 체결 이력 | 🟢 | `GET /api/competition/trades` | — |

## 계좌·주문 (실계좌, 키움)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 잔고·손익 | ⚠️✅ | `GET /api/account/balance` · `/account/balance` | `account.mapper` |
| 미체결 주문 | ⚠️✅ | `GET /api/account/pending-orders` | `account.mapper` |
| 실계좌 조회 스위치 | ✅ | `ACCOUNT_ENABLED` env · health `accountEnabled` | `account-enabled.guard` |
| 주문 접수·취소 (멱등) | ✅ | `POST /api/trading/orders(/cancel)` · `/trading/order` | `order-journal.service` |
| 주문가능 조회 | 🟢 | `GET /api/trading/orderability/:code` | — |
| 주문 저널 | ✅ | `GET /api/trading/orders` | `order-journal.service` |

## 관심종목 (Watchlist)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 관심종목 CRUD (참가자별) | ✅ | `GET/POST/DELETE /api/watchlist` · `/watchlist` | `watchlist.service`·`watchlist.model` |
| 종목명으로 추가 | ✅ | `/watchlist`·`/market/dashboard` 의 추가 폼 | `symbol.libs`·`symbol-search-input` |
| ★ 토글 (시세·순위 표, 낙관적 갱신) | ✅ | 목록/순위 행 | `watchlist.model` |

## 프로필 (SNS)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 공개 프로필 조회 | ✅ | `GET /api/participants/:id/profile` · `/profile/:id` | `profile.service` |
| 내 프로필 편집 (bio·아바타) | ✅ | `PATCH /api/profile` · `/profile/me` | `profile.service` |

## 네비게이션

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 로고 → 메인 복귀 | ✅ | 헤더 좌측 상단 | — |
| 상단 네비 (탐색 화면) | ✅ | 리더보드·종목 탐색·관심종목 | `menu-items` |
| 프로필 드롭다운 (내 화면) | ✅ | 내 포트폴리오·내 프로필·잔고·주문이력·로그아웃 | `user-menu.spec.tsx` |

## 횡단 (Cross-cutting)

| 기능 | 상태 | 위치 | 스펙 |
| --- | --- | --- | --- |
| 서비스 사용 이력 적재 | ✅ | 전역 인터셉터 → `ServiceUsageLog` | `usage-logging.interceptor` |
| API 문서 (Swagger) | ✅ | `/docs` (zod → OpenAPI) | — |
| UI 테마 (도트/터미널) + 다크/라이트 | 🟢 | 헤더 토글, CSS 변수 | — |
| 에러 리포트·디버그 패널 | ✅ | `Ctrl+Shift+D` | `error-report`·`debug-log`·`error-boundary` |

## 알아둘 점 (⚠️)

- **실계좌 조회 스위치**: `ACCOUNT_ENABLED=false`(대소문자 무관)면 `/api/account/*` 가 503 을
  돌려주고(`AccountEnabledGuard`), health `accountEnabled:false` → 프론트가 잔고 메뉴·페이지를
  감춘다. 기본 활성. **페이퍼 트레이딩·시세·주문(trading)에는 영향 없다** — 실계좌 잔고/미체결
  조회만 끈다.


- **리더보드 추이 라인차트**: 총평가금액 스냅샷을 도입 시점부터 주기 적재(기본 5분,
  `SNAPSHOT_INTERVAL_MS`)한다. **과거는 소급 복원 불가**(과거 시세를 저장하지 않음).
  스냅샷 2점 미만이면 곡선 대신 안내 문구를 띄운다.
- **시가총액 순위**: 키움에 국내 시가총액 순위 TR 이 **없다**(미국만 `usa20550`). 그래서
  종목 마스터(ka10099)의 `상장주식수 x 전일종가`로 BFF 가 파생해 `SymbolCache` 에 저장하고
  DB 가 정렬한다. **전일 종가 기준**이라 장중에 순위가 움직이지 않고, 전일대비·등락률은
  비어 있다(상위 30종목의 현재가만 실시간 틱이 채운다). ETF 는 제외한다.
- **거래시간 제한은 공휴일을 모른다**: 판정은 시계(KST 평일 09:00~15:30)로만 한다.
  실시간 `0s`(장운영구분)가 더 정확하지만 **장외에는 아예 오지 않아** "아직 못 받았다"와
  "닫혔다"를 구분할 수 없어 거래 차단의 근거로 쓸 수 없다. 휴장일에도 시세가 전일 종가로
  고정된 채 거래가 열리므로, 막으려면 휴장일 달력이 필요하다.
- **프로필 공개 범위**: 보유·체결·관심종목이 무인증으로 **누구에게나** 공개된다.
  비공개 토글이 필요하면 `Participant`에 공개설정 필드를 추가해 `ProfileService`에서 거른다.
- **사용 이력 `X-User-Id`**: 클라이언트가 보내는 디바이스 id 라 **위조 가능**(분석용 보조값).
  신뢰 신원은 토큰에서 서버가 확정한 `participantId`.

## 다음 후보 (🚧)

- 휴장일 달력(거래시간 제한 보강), 프로필 공개 범위 설정, 사용 이력 조회용 관리 화면, 체결 시점에도 스냅샷 1점 적재,
  `leaderboard.service` 순위 정렬·`account.service` 오케스트레이션 스펙 보강.
