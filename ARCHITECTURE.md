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
                                │    └ 주문 저널 (Prisma/SQLite)
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

SQLite로 시작한다. 자동매매를 여러 프로세스로 돌리거나 봉 데이터를 대량 축적하게 되면
Postgres로 옮긴다(스키마는 그대로 옮겨진다).

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
| `/market/dashboard` | 관심종목 실시간 시세 + 차트 + 세션·장 상태 배지 | `ka10001`, `ka10081`, 실시간 `0B`·`0s` |
| `/market/popular` | 인기·거래량·거래대금·상승률·하락률 순위 (상위 30종목 실시간 갱신) | `ka00198`, `ka10030`, `ka10032`, `ka10027` |
| `/market/symbols` | 전체 종목 검색·페이지네이션 (보이는 페이지만 실시간 구독) | `ka10099` |
| `/account/balance` | 잔고 요약 + 보유 종목 (현재가만 실시간) | `kt00018`, `kt00001` |
| `/trading/order` | 주문 폼 + 미체결 + 주문 저널 | `kt10000`~`kt10003`, `ka10075`, 실시간 `00` |

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

## 앞으로 남은 것

**다음 우선순위: 전면적인 디자인 개선.** 지금 스타일은 기능 검증용 최소 구성이다 —
`apps/web/src/index.css` 한 파일에 플레인 클래스, UI 라이브러리 없음. 착수할 때:

- UI 라이브러리 도입 여부를 먼저 정한다(현재 런타임 의존성은 react-query·react-router·
  zod·echarts뿐).
- `index.css` 의 CSS 변수(`--up`/`--down`/`--line`/`--accent` …)를 디자인 토큰으로
  승격시키는 길이 이미 열려 있다. ECharts 테마도 이 변수를 읽으므로 표와 차트가 함께 따라온다.
- **상승 빨강 / 하락 파랑은 국내 관례이므로 유지한다**(해외 컨벤션으로 뒤집지 않는다).
- 공용 컴포넌트는 `shared/ui`, 도메인 UI 는 `features` — 계층 규칙은 그대로.
- 실전(REAL) 배지·세션 상태·에러 패널은 "값의 신선도와 위험을 알리는" 장치다.
  디자인을 정리하면서 눈에 덜 띄게 만들지 않는다.

그 외:

- 관심종목을 로컬스토리지 대신 서버(`ka01300`/`ka01301`)로
- 호가창 UI (`0D` 실시간 + `ka10004` 스냅샷 — 계약과 BFF 매퍼는 이미 있다)
- 차트에 이동평균·지표 추가 (ECharts `LineChart` 모듈을 `echarts.use()` 에 더하면 된다)
- 조건검색 (`ka10171`~`ka10174`, WebSocket 전용)
- FSD 경계를 lint로 강제 (eslint + import 경계 규칙)
- 자동매매: 전략 상태·실행 로그 테이블 추가, 주문 경로 재사용
