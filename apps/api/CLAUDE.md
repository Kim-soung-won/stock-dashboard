# apps/api — BFF 기능 목록

NestJS BFF(토큰·REST 프록시·단일 WS 세션·주문 저널·페이퍼 트레이딩). 이 파일은 **이 앱의
기능 인벤토리**를 관리한다. 설계 원칙·명령·제약은 루트 `../../CLAUDE.md` 를 따르고, 여기서는
"무엇이 있는가"만 최신으로 유지한다.

> **유지보수 규칙 (중요)**
> 엔드포인트·모듈·DB 모델을 **추가/변경/삭제하면 아래 표를 같은 변경에서 갱신**한다.
> 새 키움 TR 을 화면까지 붙이는 절차와 코드 배치 규칙은 루트 CLAUDE.md 의 "코드 추가 위치".
> 엔드포인트를 바꾸면 (1) `packages/contracts` 계약 (2) `src/docs/openapi.ts` 등록
> (3) 이 표 — 세 곳이 함께 움직인다.

## HTTP 엔드포인트

`[인증]` = `AuthGuard`(Bearer 토큰) 필요. 응답은 전부 `{ code, message, data }` 봉투(code=0 정상).
라우트 문자열의 단일 출처는 `packages/contracts/src/routes.ts`.

| 도메인 | 메서드·경로 | 설명 | 모듈 |
| --- | --- | --- | --- |
| System | `GET /api/health` | BFF 상태(키움 env·업스트림·구독 수) | `common/health.controller.ts` |
| Market | `GET /api/market/symbols?market` | 종목 마스터 목록(SymbolCache) | `market/` |
| Market | `GET /api/market/symbols/search?keyword,limit` | 종목명·코드 검색(전 시장, SymbolCache) | `market/` |
| Market | `GET /api/market/quote/:code` | 현재가 스냅샷 | `market/` |
| Market | `GET /api/market/candles/:code?interval,baseDate` | 봉(분·일·주·월·연) | `market/` |
| Market | `GET /api/market/ranking/:kind?market` | 순위(views·volume·value·gainers·losers·**marketCap**). marketCap 만 키움 TR 이 아니라 SymbolCache 파생값(상장주식수x전일종가) | `market/` |
| Market | `GET /api/market/order-book/:code` | 호가창 | `market/` |
| Account | `GET /api/account/balance` | 잔고+보유(키움 스냅샷) · `ACCOUNT_ENABLED=false` 면 503 | `account/` |
| Account | `GET /api/account/pending-orders?code` | 미체결 주문 · 위와 같이 게이트 | `account/` |
| Trading | `POST /api/trading/orders` | 주문 접수(멱등키 필수) | `trading/` |
| Trading | `POST /api/trading/orders/cancel` | 주문 취소 | `trading/` |
| Trading | `GET /api/trading/orderability/:code?price` | 주문가능 금액·수량 | `trading/` |
| Trading | `GET /api/trading/orders` | 주문 저널(우리 DB) | `trading/` |
| Auth | `POST /api/auth/login` | 참가(신규)/로그인 → Bearer 발급 | `auth/` |
| Auth | `GET /api/auth/me` `[인증]` | 현재 토큰의 참가자 | `auth/` |
| Competition | `GET /api/competition/season` | 활성 시즌(공개) | `competition/` |
| Competition | `GET /api/competition/leaderboard` | 전체 순위(공개) | `competition/` |
| Competition | `GET /api/competition/leaderboard/history` | 참가자별 총평가금액 추이(공개, 라인차트) | `competition/` |
| Competition | `GET /api/competition/portfolio` `[인증]` | 내 포트폴리오(현금+보유+평가) | `competition/` |
| Competition | `POST /api/competition/trade` `[인증]` | 시장가 페이퍼 매매 | `competition/` |
| Competition | `GET /api/competition/trades` `[인증]` | 내 체결 이력 | `competition/` |
| Watchlist | `GET /api/watchlist` `[인증]` | 내 관심종목 목록 | `watchlist/` |
| Watchlist | `POST /api/watchlist` `[인증]` | 관심종목 추가(멱등) | `watchlist/` |
| Watchlist | `DELETE /api/watchlist/:code` `[인증]` | 관심종목 삭제(멱등) | `watchlist/` |
| Profile | `GET /api/participants/:id/profile` | 공개 프로필(SNS): 요약·보유·최근 체결·관심종목 | `profile/` |
| Profile | `PATCH /api/profile` `[인증]` | 내 프로필(bio·아바타) 수정 | `profile/` |

## 실시간

| 채널 | 설명 | 위치 |
| --- | --- | --- |
| `WS /ws` | 단일 실시간 게이트웨이. 시세 틱(0B 등) 구독/팬아웃, 경쟁 `leaderboard` 2초 팬아웃, `sessionState`/`error` 브로드캐스트 | `realtime/` |

## 횡단 관심사

| 기능 | 설명 | 위치 |
| --- | --- | --- |
| 사용 이력 적재 | 전역 인터셉터가 모든 HTTP 요청을 `ServiceUsageLog` 에 append(토큰 우선 + `X-User-Id` 보완, 비차단) | `common/usage-logging.interceptor.ts` |
| API 문서(Swagger) | `/docs` — zod 계약에서 OpenAPI 생성(데코레이터 없음) | `docs/openapi.ts` |
| 예외 봉투화 | 모든 예외를 `{ code, message, data }` 로 변환 | `common/all-exceptions.filter.ts` |
| 환경설정 | 루트 `.env` 로드 + zod 검증, `KIWOOM_ENV`·`ACCOUNT_ENABLED` 스위치 | `config/env.ts` |
| 실계좌 조회 스위치 | `ACCOUNT_ENABLED=false` 면 `/api/account/*` 를 503 으로 막음 | `account/account-enabled.guard.ts` |

## 테스트

콜로케이트 `*.spec.ts`, vitest. `pnpm --filter @stock/api test`. 실 DB·키움에 붙지 않는다.
정책·원칙은 루트 `../../CLAUDE.md` 의 "테스트".

- 순수 변환(`*.mapper.ts`·토큰): 직접 호출로 부호·단위·형태 계약 고정.
- 서비스: Prisma·주입 서비스를 `vi.fn()` 으로 목킹해 멱등성·집계·인증 분기 검증(`new Service(mock)`).
- 인터셉터/가드: `ExecutionContext`·응답을 목킹해 신원 해석·봉투·인증 분기 검증.

현재 스펙: `auth/auth.tokens`, `auth/auth.service`(로그인 분기), `kiwoom/realtime.mapper`,
`market/market.mapper`, `market/market.service`(봉 라우팅), `market/ranking.mapper`, `account/account.mapper`,
`competition/competition.mapper`, `competition/competition.service`(매수·매도 돈계산·가드),
`trading/order-journal.service`(멱등 선점), `competition/leaderboard.service`(이력 그룹화),
`watchlist/watchlist.service`, `profile/profile.service`, `common/usage-logging.interceptor`,
`account/account-enabled.guard`(기능 스위치).
아직 없는 곳(로직 있는 것): `leaderboard.service`(순위 정렬 부분), `market/account.service`(얇은 오케스트레이션).
새 엔드포인트·서비스는 계약 spec 을 위 기능 표 갱신과 **한 묶음으로** 추가한다.

## DB 모델

`prisma/schema.prisma` — `Order`·`OrderEvent`(실계좌 주문), `Participant`·`Season`·`Portfolio`·
`Holding`·`PaperTrade`·`PortfolioSnapshot`(경쟁), `WatchlistItem`(관심종목), `SymbolCache`(종목 캐시),
`ServiceUsageLog`(사용 이력). 관계·제약 다이어그램은 `../../docs/ERD.md`.
