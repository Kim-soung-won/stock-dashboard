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
| 실시간 시세 대시보드 | ✅ | `GET /api/market/quote·candles·order-book` · `/market/dashboard` | `market.mapper`·`quote.libs`·`chart.libs` |
| 종목 탐색 | 🟢 | `GET /api/market/symbols` · `/market/symbols` | — |
| 인기·순위 | ✅ | `GET /api/market/ranking/:kind` · `/market/popular` | `ranking.mapper` |
| 캔들 차트 | ✅ | (candles) · dashboard/symbols | `chart.libs` |
| 실시간 체결 스트림 | ✅ | `WS /ws` (tick·orderBook) | `realtime.mapper` |

## 경쟁 — 모의투자 (Competition)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 참가/로그인 (닉네임+PIN) | ✅ | `POST /api/auth/login` · `GET /api/auth/me` · `/login` | `auth.service`·`auth.tokens` |
| 시장가 페이퍼 매매 | ✅ | `POST /api/competition/trade` | `competition.service`(돈계산·가드) |
| 내 포트폴리오 | ✅ | `GET /api/competition/portfolio` · `/competition/portfolio` | `competition.mapper`·`portfolio.libs` |
| 리더보드 (실시간 순위) | ✅ | `GET /api/competition/leaderboard` · `WS leaderboard` · `/competition/leaderboard` | (WS 팬아웃) |
| 리더보드 추이 라인차트 | ⚠️✅ | `GET /api/competition/leaderboard/history` · 같은 화면 | `leaderboard.service`·`leaderboard-history.libs` |
| 시즌 | ✅ | `GET /api/competition/season` | `season.libs` |
| 체결 이력 | 🟢 | `GET /api/competition/trades` | — |

## 계좌·주문 (실계좌, 키움)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 잔고·손익 | ✅ | `GET /api/account/balance` · `/account/balance` | `account.mapper` |
| 미체결 주문 | ✅ | `GET /api/account/pending-orders` | `account.mapper` |
| 주문 접수·취소 (멱등) | ✅ | `POST /api/trading/orders(/cancel)` · `/trading/order` | `order-journal.service` |
| 주문가능 조회 | 🟢 | `GET /api/trading/orderability/:code` | — |
| 주문 저널 | ✅ | `GET /api/trading/orders` | `order-journal.service` |

## 관심종목 (Watchlist)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 관심종목 CRUD (참가자별) | ✅ | `GET/POST/DELETE /api/watchlist` · `/watchlist` | `watchlist.service`·`watchlist.model` |
| ★ 토글 (시세·순위 표) | ✅ | 목록/순위 행 | `watchlist.model` |

## 프로필 (SNS)

| 기능 | 상태 | 엔드포인트 · 화면 | 스펙 |
| --- | --- | --- | --- |
| 공개 프로필 조회 | ✅ | `GET /api/participants/:id/profile` · `/profile/:id` | `profile.service` |
| 내 프로필 편집 (bio·아바타) | ✅ | `PATCH /api/profile` · `/profile/me` | `profile.service` |

## 횡단 (Cross-cutting)

| 기능 | 상태 | 위치 | 스펙 |
| --- | --- | --- | --- |
| 서비스 사용 이력 적재 | ✅ | 전역 인터셉터 → `ServiceUsageLog` | `usage-logging.interceptor` |
| API 문서 (Swagger) | ✅ | `/docs` (zod → OpenAPI) | — |
| UI 테마 (도트/터미널) + 다크/라이트 | 🟢 | 헤더 토글, CSS 변수 | — |
| 에러 리포트·디버그 패널 | ✅ | `Ctrl+Shift+D` | `error-report`·`debug-log`·`error-boundary` |

## 알아둘 점 (⚠️)

- **리더보드 추이 라인차트**: 총평가금액 스냅샷을 도입 시점부터 주기 적재(기본 5분,
  `SNAPSHOT_INTERVAL_MS`)한다. **과거는 소급 복원 불가**(과거 시세를 저장하지 않음).
  스냅샷 2점 미만이면 곡선 대신 안내 문구를 띄운다.
- **프로필 공개 범위**: 보유·체결·관심종목이 무인증으로 **누구에게나** 공개된다.
  비공개 토글이 필요하면 `Participant`에 공개설정 필드를 추가해 `ProfileService`에서 거른다.
- **사용 이력 `X-User-Id`**: 클라이언트가 보내는 디바이스 id 라 **위조 가능**(분석용 보조값).
  신뢰 신원은 토큰에서 서버가 확정한 `participantId`.

## 다음 후보 (🚧)

- 프로필 공개 범위 설정, 사용 이력 조회용 관리 화면, 체결 시점에도 스냅샷 1점 적재,
  `leaderboard.service` 순위 정렬·`account.service` 오케스트레이션 스펙 보강.
