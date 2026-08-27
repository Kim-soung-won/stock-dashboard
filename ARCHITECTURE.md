# 아키텍처

키움 OpenAPI로 (1) 실시간 시세 대시보드, (2) 계좌 조회, (3) API 주문까지 하는 TypeScript
모노레포. 이 문서는 "왜 이렇게 나눴는지"를 기록한다. 개별 API 스펙은
`.claude/skills/kiwoom-api/` 참고.

아래 설계 대부분은 취향이 아니라 **API가 강제한 것**이다. 그 제약 목록과 근거(스펙 명시 /
실측 / 미확인)는 `.claude/skills/kiwoom-api/reference/constraints.md` 에 따로 정리했다.

## 전체 그림

```
[React (apps/web)] ──REST /api──┐
        └────WebSocket /ws──────┤   [BFF (apps/api, NestJS)]
                                │    ├ 토큰 관리 (au10001, 만료 전 갱신)
                                │    ├ REST 프록시 + 유량 스로틀 + 연속조회 루프
                                │    ├ 키움 WS 단일 세션 (LOGIN/REG/PING) → 팬아웃
                                │    ├ 어댑터: 부호·단위·문자열 → 도메인 모델
                                │    └ 주문 저널 (Prisma/PostgreSQL·Supabase)
                                └── 키움 (api.kiwoom.com / wss:10000)
```

## 왜 BFF가 필수인가

브라우저에서 키움을 직접 부르는 구성은 성립하지 않는다. 스펙에서 확인된 근거:

1. **자격증명 노출** — 토큰 발급(`au10001`)에 `appkey`/`secretkey`가 필요하고, WebSocket
   `LOGIN`에도 토큰이 실린다. 프론트에 두면 계좌 통제권을 넘기는 것이다.
2. **토큰이 발급 IP에 묶인다** — 에러 `8010`. 발급과 호출이 같은 egress IP여야 한다.
   → **egress IP가 변동되는 서버리스(Vercel/Lambda)에 배포하면 안 된다.** 상시 WebSocket
   연결도 필요하므로 고정 IP를 가진 단일 상주 프로세스로 둔다.
3. **유량 제한이 앱 단위** — `1700`(API별) / `1701`(전체) / `1702`(그룹). 탭마다 폴링하면
   배수로 소모된다. 중앙에서 스로틀·캐시해야 예산이 관리된다(`kiwoom/rate-limiter.ts`).
4. **WebSocket 세션은 하나여야 한다** — 실시간 등록은 `grp_no` 단위이고 재접속 시 등록이
   초기화된다. BFF가 단일 세션을 들고 화면별 구독을 refcount로 다중화한다.

## DB는 무엇을 보관하는가

**시세·잔고·예수금은 저장하지 않는다.** 진실은 키움에 있고, 사본을 두면 어긋난다.
DB가 필요한 이유는 데이터 보관이 아니라 **주문 멱등성과 감사**다.

| 테이블 | 목적 |
| --- | --- |
| `Order` | 주문 저널. 멱등키 unique 제약이 중복 주문을 막는다 |
| `OrderEvent` | 상태 전이 이력(append-only). 손익 재계산·감사 근거 |
| `SymbolCache` | 종목 마스터(ka10099) 캐시. 없어도 동작하지만 유량을 아낀다 |

저장소는 **PostgreSQL(Supabase)** 다. 런타임은 pgbouncer 트랜잭션 풀러(`DATABASE_URL`, 6543),
마이그레이션은 직결(`DIRECT_URL`)로 붙는다. (초기엔 SQLite로 시작했으나, 여러 프로세스·대량
축적을 대비해 Postgres로 옮겼다 — Prisma 스키마는 그대로 이관됐다.)

## 주문 경로 (가장 조심할 부분)

키움 주문 API는 **멱등하지 않다.** 재시도·중복 클릭이 그대로 중복 주문이 된다.

```
FormOrder(멱등키 1개 생성)
  → POST /api/trading/orders
    → env 이중 확인 (요청 env ≠ 서버 KIWOOM_ENV 면 거부)
    → 저널 선점 (unique 충돌이면 전송하지 않고 기존 행 반환)
    → 키움 kt10000/kt10001 전송
    → ord_no 기록 = "접수" (체결 아님)
  → 실시간 00(주문체결) 이벤트 → OrderTracker → 저널 상태 전이(체결/취소/거부)
```

저널 선점을 전송보다 **앞에** 두는 이유: 전송 도중 프로세스가 죽어도 같은 멱등키가 다시
나가지 않게 하려는 것이다. 응답을 못 받은 주문은 저널에 `submitting` 으로 남고, 사람이
`ka10075`(미체결)·`kt00009`로 대조해 판단한다.

안전장치 4중: 프론트 확인 체크박스(실전일 때) → 폼 검증 → 서버 env 이중 확인 → 저널 멱등키.

## 값 정규화 경계

키움은 모든 값을 문자열로 주고 **가격에 부호가 붙는다**(`"-20800"` = 20800원, 하락).
단위도 필드마다 다르다(원/천원/백만원/억원/%).

이 함정은 **BFF의 mapper에서만** 다룬다:
`apps/api/src/*/**.mapper.ts`, `apps/api/src/kiwoom/realtime.mapper.ts`.
그 아래로는 camelCase + number + 원 단위만 흐른다. 프론트는 키움 필드명(`stk_cd`,
`cur_prc`, FID `10`)을 알지 못한다.

## 스펙 → 코드 생성

`kiwoom-rest-api-spec.json`(342개 TR)에서 TS 상수를 생성한다:

```bash
pnpm gen:kiwoom   # → packages/kiwoom-codes/src/generated/*.ts
```

- `API_CATALOG`: api-id → {한글 이름, URL, transport}. **호출 URL을 손으로 관리하지 않는다**
  (`urlOf(apiId)`). URL은 기능 그룹이고 실제 TR은 `api-id` 헤더가 구분하기 때문에,
  호출 계층이 "api-id + 바디"를 받는 단일 함수(`KiwoomRestClient.call`)로 성립한다.
- `REALTIME_FIDS`: 실시간 타입별 FID → 필드명. 실시간 타입 코드는 **대소문자를 구분한다**
  (`0G` ETF NAV vs `0g` 주식종목정보).
- `KIWOOM_ERROR_MESSAGE` + 백오프/재인증 대상 코드 목록.

## 프론트 계층 (FSD 하우스 스타일)

`shared/api → entities → features → pages`, 4계층. 세그먼트 폴더 없이 접미사 파일,
슬라이스마다 `index.ts` 배럴. 규칙 원본은 `frontend-support-plugin` 의 `fsd-reference.md`.

| 계층 | 이 프로젝트에서 하는 일 |
| --- | --- |
| `shared/api/<group>/<domain>` | BFF 응답 스키마(zod) + service. `shared/api/base` 는 공용 인프라 |
| `entities/<group>/<domain>` | 도메인 모델·queries·mutations. **스냅샷(REST) + 실시간 틱 병합**이 여기 |
| `features/<group>/<domain>` | 표·폼 등 use case UI. 엔티티 여러 개를 조합하는 지점 |
| `pages/<group>/<domain>` | 라우트 조립 (`-page.ui` / `-page.model` / `-page.route`) |

그룹(`market`/`account`/`trading`)은 사이드바 메뉴 그룹과 1:1이고 네 계층 모두 같은
`<group>/<domain>` 경로를 쓴다.

**하우스 스타일과 의도적으로 다른 점**: 원래 DTO는 "서버 응답 snake_case"지만, 여기서는
BFF가 이미 정규화하므로 DTO도 camelCase다. 스키마 원본은 `@stock/contracts`에 두고
`shared/api`가 그것을 조합한다(BFF와 프론트가 같은 계약을 공유하기 위해서).

**같은 계층 슬라이스 교차 금지**를 지키기 위해 주문 성공 후의 잔고 무효화는
`entities/trading/order` 가 아니라 `features/trading/order/form-order` 에서 한다.

## 에러 경계 (디버깅)

`useSuspenseQuery` 는 실패를 **throw** 한다. Suspense 만 두고 ErrorBoundary 를 빼면
조회 실패가 트리 밖으로 나가 **흰 화면**이 되므로 둘은 항상 같이 둔다
(`shared/ui/query-error-boundary`).

배치 규칙(원본: `suspense-boundary-patterns` 스킬):

- **필터는 바운더리 밖, 데이터는 안.** 차트의 봉 간격 토글이 바운더리 안에 있으면
  조회 실패 시 토글까지 사라져 다른 간격으로 빠져나올 수 없다. 그래서
  `chart-candle`(필터 레이어)이 바운더리를 소유하고, ECharts 를 그리는
  `components/chart-candle-canvas`(데이터 레이어)가 그 안에 들어간다. 페이지는 다시 감싸지 않는다.
- **재조회는 폴백으로 교체하지 않는다.** 간격을 바꾸면 쿼리 키가 바뀌어 suspend 하므로
  `useDeferredValue` 로 이전 값을 유지하고 `StaleOverlay` 로 "갱신 중"만 표시한다.
- **대시보드는 위젯별 독립 바운더리.** 하나가 실패해도 나머지는 살아 있다.
- **에러와 빈 데이터를 섞지 않는다.** 미체결 목록은 예전에 조회 실패 시
  "미체결 주문이 없습니다" 로 보였다 — 주문 화면에서 특히 위험하다. 지금은 실패는
  에러 패널, 빈 데이터는 빈 메시지로 갈린다.

디버깅용으로 남기는 것:

| 위치 | 남기는 것 |
| --- | --- |
| 에러 패널 | 키움 코드(`8030`/`8010`/`1700` …), BFF code, 원문 메시지, 스택·컴포넌트 스택(접힘), 리포트 복사 |
| 콘솔 (ErrorBoundary) | 잡은 예외 전체 리포트 + 바운더리 라벨(`chart:005930` 등) |
| 콘솔 (QueryCache) | 화면에 붙지 않은 실패(백그라운드 재조회 등)를 쿼리 키와 함께 |
| `errorElement` | loader 예외·없는 경로. react-router 기본 화면 대신 같은 패널로 |
| **인앱 디버그 패널** | 위 모든 로그를 화면에서 읽는다 (`Ctrl+Shift+D`, 우하단 버튼) |

**개발자도구를 못 여는 환경**(IDE 내장 프리뷰, 정책 제한 PC)이 있으므로 콘솔만으로는
디버깅이 성립하지 않는다. `shared/lib/debug-log.ts` 가 에러·쿼리 실패·실시간 세션 변화를
링 버퍼(200건)에 모으고 `shared/ui/debug-panel` 이 화면에 띄운다(콘솔에도 그대로 흘린다).
시세 틱은 초당 수십 건이라 기록하지 않고, 상태 변화와 에러만 남긴다.

## 화면

| 경로 | 내용 | 주요 TR |
| --- | --- | --- |
| `/login` | 닉네임+PIN 참가/로그인 (앱 셸 밖 독립 화면) | — (BFF auth) |
| `/competition/leaderboard` | 전 참가자 수익률 순위 (실시간) | — (WS `leaderboard`) |
| `/competition/portfolio` | 내 매매(시장가)·요약·보유·체결 이력 | `ka10001`(체결가), 실시간 `0B` |
| `/market/dashboard` | 관심종목 실시간 시세 + 차트 + 세션·장 상태 배지 | `ka10001`, `ka10081`, 실시간 `0B`·`0s` |
| `/market/popular` | 인기·거래량·거래대금·상승률·하락률 순위 (상위 30종목 실시간 갱신) | `ka00198`, `ka10030`, `ka10032`, `ka10027` |
| `/market/symbols` | 전체 종목 검색·페이지네이션 (보이는 페이지만 실시간 구독) | `ka10099` |
| `/account/balance` | (실계좌) 잔고 요약 + 보유 종목 (현재가만 실시간) | `kt00018`, `kt00001` |
| `/trading/order` | (실계좌) 주문 폼 + 미체결 + 주문 저널 | `kt10000`~`kt10003`, `ka10075`, 실시간 `00` |

> `/account`·`/trading` 은 **키움 실계좌** 경로(단일 계정), `/competition` 은 참가자별 **가상
> 페이퍼 트레이딩** 경로다. 둘은 DB·체결 경로가 완전히 분리돼 있고 서로 집계를 섞지 않는다.

키움에 "인기 종목" TR 은 없다. 성격이 다른 순위 TR 4개(`RANKING_SPEC`)를 하나의
`RankingItem` 으로 흡수하고, TR 이 주지 않는 칼럼은 null 로 두어 화면에서 감춘다.

## 실시간 데이터 흐름

```
키움 0B(주식체결) → KiwoomWsSession → realtime.mapper(toTick) → RealtimeGateway
  → (해당 종목 구독 클라이언트에게만) → realtimeClient → useTickStream
  → mergeTick(스냅샷 + 틱) → 표/차트
```

- 프론트는 종목코드만 말한다. `REG`/`REMOVE`·`grp_no`·재접속 재등록은 BFF가 처리한다.
- 틱은 초당 수십 건까지 온다. `useTickStream`이 `requestAnimationFrame` 단위로 커밋한다.
- 과거 봉은 REST로 한 번 받아 캐시하고 **마지막 봉만** 틱으로 갱신한다
  (`applyTickToCandles`).
- 차트는 ECharts다. 전체 번들(~1MB) 대신 `echarts/core` + 쓰는 모듈만 `echarts.use()` 로
  등록하고, 인스턴스는 마운트 때 한 번 만들어 이후 `setOption` 으로만 갱신한다
  (틱마다 재생성하면 줌·커서 상태가 초기화된다). 캔들 데이터 순서는
  **[시가, 종가, 저가, 고가]** 로 ECharts 규약을 따르며 `toChartSeriesData` 한 곳에서만 만든다.
- 장 상태(`0s`)와 업스트림 상태를 항상 화면에 띄운다. 연결이 끊긴 채 마지막 가격이 떠
  있으면 사용자가 현재가로 오인한다.

## 모의투자 경쟁 (페이퍼 트레이딩)

여러 명이 각자 같은 시드머니(기본 100만원)로 **실제 시세로 가상 매매**하고 수익률을
겨루는 경쟁. 실계좌 주문 경로(`account`/`trading`)와 별개의 도메인이다.

**왜 페이퍼인가.** 참가자마다 키움 실계좌/모의계좌 자격증명을 두면 IP 바인딩·단일 WS
세션·유량이 N배로 꼬인다. 대신 **키움 단일 피드는 시세 전용**으로 그대로 쓰고, 참가자별
현금·보유·체결은 우리 DB 가 진실로 관리한다. 시세와 달리 이 도메인은 캐시가 아니라 원본이다.

**DB (Prisma).** `Participant`(닉네임+PIN scrypt 해시) / `Season`(시드·기간·상태) /
`Portfolio`(참가자×시즌 현금) / `Holding`(보유·평균단가) / `PaperTrade`(체결 저널, append-only).

**인증.** 캐주얼 경쟁이라 무거운 세션 스택을 안 쓴다. Node `crypto` 만으로 PIN 은 scrypt
해시, 로그인 토큰은 HMAC 서명(stateless). 프론트는 localStorage 토큰을 `Authorization:
Bearer` 로 보내고, `AuthGuard` 가 참가자를 요청에 붙인다. "닉네임이 처음이면 그 PIN 으로
자동 참가, 있으면 검증" 단일 흐름(`/api/auth/login`).

**체결 엔진(`competition.service`).** 시장가만 지원한다. 체결가는 **서버가 관측한
시세**(getQuote 스냅샷)로만 정한다 — 클라이언트가 보낸 가격은 신뢰하지 않는다. 현금·평균단가·
저널 갱신은 한 트랜잭션으로 원자적으로 처리하고, 같은 참가자의 연타는 인메모리 큐로
직렬화해 이중 지출을 막는다. 매수 0.015%, 매도 0.015%+거래세 0.15%(설정 상수)를 반영한다.

**리더보드 실시간.** 순위는 보유종목을 현재가로 평가해 정한다. **REST 폴링 금지 원칙**을
지켜, 가격은 기존 단일 WS 세션의 `0B` 틱으로 채운다(`PricebookService`). 가격북은 "전
참가자 보유종목 합집합"을 세션 refcount 위에 구독하므로 아무도 그 종목 화면을 안 봐도 평가가
살아 있다. 틱이 오면 dirty 표시만 하고, `LeaderboardService` 가 2초 주기로만 순위를 계산해
`RealtimeGateway` 로 전 클라이언트에 팬아웃한다(접속자×틱 폭증 방지). 프론트는 이 `leaderboard`
메시지를 쿼리 캐시에 직접 써 넣어 표가 자동으로 다시 그려진다.

**FSD 그룹 `competition`/`auth`.** `shared/api → entities → features → pages` 네 계층 모두
`<group>/<domain>` 경로를 따른다. 매매 성공 후 포트폴리오·리더보드 무효화는 여러 슬라이스를
건드리므로 `features/competition/trade` 에서 조합한다(엔티티 직접 참조 금지). 앱 셸 전체를
`RequireAuth` 로 감싸 로그인해야 진입할 수 있다.

## 앞으로 남은 것

**디자인: STOCK ARCADE 픽셀 테마(적용 완료).** claude.ai/design "Stock Arcade
Dashboard" 를 앱 전역 스킨으로 이식했다. 방식은 UI 라이브러리 도입이 아니라
`apps/web/src/index.css` 의 **CSS 변수 리테마 + 공용 프리미티브 아케이드화**다 —
토큰만 바꾸면 표·요약·값·차트가 함께 따라온다(런타임 의존성 그대로).

- 팔레트 토큰: void `#0d0b1f` / surface `#171335` / card `#201c47` / line `#3a3470`,
  브랜드 시안 `--accent:#58e6d9`, 골드 `--gold:#ffcd3c`. 하드 픽셀 테두리(`--ink`)와
  `4px 4px 0` 드롭섀도가 아케이드 캐비닛 느낌을 만든다.
- 폰트: 라틴 헤더 `Press Start 2P`, 한글 본문 `Galmuri11`(픽셀). `index.html` 에서 로드.
- 오버레이: `body::before` 도트 그리드 + `body::after` CRT 스캔라인(둘 다 pointer-events 없음).
- **상승 빨강 / 하락 파랑(국내 관례) 유지.** 디자인 원안은 상승=시안이지만, 방향색만
  반전해 `--up:#ff4d8d`(마젠타/붉은계) / `--down:#4c8dff`(파랑)로 두고 시안은 방향색이
  아니라 브랜드 액센트로만 쓴다. ECharts 테마도 이 변수를 읽으므로 차트가 함께 따라온다.
- 셸은 좌측 사이드바 → **상단 아케이드 헤더**(브랜드 + 플랫 네비 + SCORE/HI-SCORE +
  세션 배지)로 재구성. SCORE=내 평가금액, HI-SCORE=리더보드 1위 평가금액(실데이터).
- 실전(REAL) 배지·세션 상태·에러 패널은 "값의 신선도와 위험을 알리는" 장치다 —
  아케이드화하면서도 눈에 덜 띄게 만들지 않았다.
- 공용 컴포넌트는 `shared/ui`, 도메인 UI 는 `features` — 계층 규칙은 그대로.

그 외:

- 관심종목을 로컬스토리지 대신 서버(`ka01300`/`ka01301`)로
- 호가창 UI (`0D` 실시간 + `ka10004` 스냅샷 — 계약과 BFF 매퍼는 이미 있다)
- 차트에 이동평균·지표 추가 (ECharts `LineChart` 모듈을 `echarts.use()` 에 더하면 된다)
- 조건검색 (`ka10171`~`ka10174`, WebSocket 전용)
- FSD 경계를 lint로 강제 (eslint + import 경계 규칙)
- 자동매매: 전략 상태·실행 로그 테이블 추가, 주문 경로 재사용
