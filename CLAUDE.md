# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 개요

키움 OpenAPI 기반 실시간 시세 대시보드 + 계좌/주문 연동 + **모의투자 경쟁**(여러 명이
각자 100만원 시드로 실시간 시세로 겨루는 페이퍼 트레이딩). pnpm 워크스페이스 모노레포.

```
apps/api        NestJS BFF (토큰·REST 프록시·단일 WS 세션·주문 저널) + Prisma/SQLite
apps/web        React + Vite 대시보드 (FSD 4계층)
packages/contracts     BFF ↔ web 공용 zod 계약 + 라우트 상수
packages/kiwoom-codes  스펙에서 생성한 api-id 카탈로그 / 실시간 FID / 에러코드 + 값 파서
kiwoom-rest-api-spec.json   키움 스펙 원본 (2.4MB, 342 TR) — 통째로 읽지 말 것
.claude/skills/kiwoom-api/  스펙 조회 스킬 (CLI + 생성 문서)
```

설계 배경과 결정 근거는 `ARCHITECTURE.md`, **API가 강제하는 제약**(IP 바인딩·유량·실전/모의 키
분리·멱등성 없음·장 운영시간)은 `.claude/skills/kiwoom-api/reference/constraints.md`.
스펙 조회는 아래 스킬 CLI.

**기능 목록**은 각 앱의 `CLAUDE.md` 가 관리한다 — 백엔드 `apps/api/CLAUDE.md`(엔드포인트·모듈·
DB 모델), 프론트 `apps/web/CLAUDE.md`(페이지·feature·entities). 기능을 추가/변경/삭제하면 해당
표를 같은 변경에서 갱신한다(엔드포인트는 계약 → `docs/openapi.ts` → 표가 함께 움직인다).

## 명령

```bash
pnpm install
pnpm db:migrate            # Prisma 마이그레이션 (최초 1회, 루트 .env 필요)
pnpm dev                   # 공용 패키지 빌드 후 api(4000) + web(5173) 동시 실행
pnpm dev:api / pnpm dev:web
pnpm build                 # 패키지 → 앱 순서로 빌드
pnpm typecheck             # 전체 워크스페이스
pnpm test                  # vitest (api / web)
pnpm gen:kiwoom            # 스펙 → packages/kiwoom-codes/src/generated/*.ts 재생성

# 단일 테스트
pnpm --filter @stock/api test -- realtime.mapper
pnpm --filter @stock/web test -- quote.libs
pnpm --filter @stock/web vitest -- --watch      # 워치 모드

# 스펙 조회 (2.4MB JSON 대신 이걸 쓴다)
python .claude/skills/kiwoom-api/scripts/kiwoom_spec.py show ka10081 kt10000
python .claude/skills/kiwoom-api/scripts/kiwoom_spec.py search 잔고
python .claude/skills/kiwoom-api/scripts/kiwoom_spec.py errors 8005
```

`.env` 는 루트 하나만 쓴다(`.env.example` 복사). `KIWOOM_ENV=mock` 이 기본값이고
`real` 로 바꾸면 실제 주문이 나간다. Prisma 스크립트는 `dotenv-cli` 로 루트 `.env` 를 읽는다.

## 설계상 반드시 지켜야 할 것

- **브라우저는 키움을 직접 부르지 않는다.** appkey/토큰은 BFF에만 있다. 토큰은 발급 IP에
  묶이므로(에러 `8010`) egress IP가 변하는 서버리스 배포는 불가.
- **실시간은 WebSocket, REST 폴링 금지.** 유량 초과(`1700`/`1701`/`1702`)로 막힌다.
  react-query 에 `refetchInterval` 을 넣지 않는다.
- **키움 값 정규화는 BFF mapper에서만.** 가격의 부호는 음수가 아니라 전일대비 방향이고
  (`"-20800"` = 20800원 하락), 단위는 필드마다 다르다(백만원 등). mapper 아래로는
  camelCase + number + 원 단위만 흐른다. 프론트에 `stk_cd`/`cur_prc`/FID 번호를 노출하지 않는다.
- **주문은 멱등하지 않다.** 클라이언트 멱등키 → 저널 선점 → 전송 순서를 바꾸지 않는다.
  `ord_no` 는 접수일 뿐이고 체결은 실시간 `00` 이벤트로 확정한다.
- **HTTP 200 ≠ 성공.** 키움 응답은 `return_code`, BFF 응답은 봉투 `code` 로 판정한다.
- **경쟁(페이퍼)과 실계좌는 완전히 분리한다.** `competition`/`auth` 도메인의 현금·보유·체결은
  우리 DB 가 진실(시세와 반대)이고, 키움 주문 API 를 쓰지 않는다. 체결가는 서버가 관측한
  시세(getQuote)로만 정하고 클라이언트 가격은 신뢰하지 않는다. 순위는 REST 폴링이 아니라
  WS `0B` 틱으로 채운 가격북을 2초 주기로 팬아웃한다(`leaderboard` 메시지). 상세는 `ARCHITECTURE.md`.
- 실시간 타입 코드는 대소문자 구분(`0G` vs `0g`). 이 때문에 PowerShell `ConvertFrom-Json`
  은 스펙 파싱에 실패한다 — 스펙을 다룰 때는 Python.

## 코드 추가 위치

**새 키움 TR을 화면까지 붙이는 순서** (예: 호가창)

1. `kiwoom_spec.py show ka10004` 로 요청/응답 필드 확인
2. `packages/contracts/src/<domain>.ts` 에 zod 계약 추가 → `pnpm build:packages`
3. `apps/api/src/<module>/<module>.mapper.ts` 에 키움 → 도메인 변환 (부호·단위 흡수)
4. `apps/api/src/<module>/<module>.service.ts` 에서 `KiwoomRestClient.call('ka10004', {...})`
   — URL은 `API_CATALOG` 에서 자동 결정되므로 적지 않는다
5. 컨트롤러에 라우트 추가 + `packages/contracts/src/routes.ts` 에 경로 상수
6. 프론트: `shared/api/<group>/<domain>` (service) → `entities` (queries) →
   `features` (UI) → `pages` (조립)

**FSD 규칙** (원본: `frontend-support-plugin` 의 `fsd-reference.md`)

- 계층 4개: `shared/api → entities → features → pages`. 역방향 import 금지.
- **같은 계층의 다른 슬라이스 import 금지.** 조합이 필요하면 상위 계층에서 한다
  (예: 주문 후 잔고 무효화는 `features/trading/order/form-order` 에서).
- 세그먼트 폴더(`ui/`·`model/`·`api/`) 만들지 않는다. 접미사 파일
  (`*-dto.contracts.ts`·`*.queries.ts`·`*-page.ui.tsx` …)로 표현한다.
- 슬라이스 밖에서는 반드시 슬라이스 `index.ts` 배럴을 경유해 import.
- `.tsx` 하나에 컴포넌트 function 하나. 전용 sub 컴포넌트는 하위 `components/` 코로케이션.
- **`useSuspenseQuery` 는 `QueryErrorBoundary`(= Suspense + ErrorBoundary) 안에서만 쓴다.**
  바운더리는 필터 레이어(feature)가 소유하고 페이지에서 중복으로 감싸지 않는다.
  재조회로 깜빡이면 `useDeferredValue` + `StaleOverlay`. 상세는 `ARCHITECTURE.md` 의
  "에러 경계" 절과 `suspense-boundary-patterns` 스킬.

**생성물은 손으로 고치지 않는다**: `packages/kiwoom-codes/src/generated/*`,
`.claude/skills/kiwoom-api/reference/{catalog-*,realtime,error-codes}.md`.
스펙이 갱신되면 `pnpm gen:kiwoom` 과 `build_reference.py` 를 다시 돌린다.
(`conventions.md`·`playbook.md` 는 수동 관리 문서다)

## 테스트

테스트는 **기능 명세이자 회귀 안전망**이다. 콜로케이트 `*.spec.ts(x)`(소스 옆), vitest.
`pnpm test`(전체) / `pnpm --filter @stock/api test` / `pnpm --filter @stock/web test` /
`pnpm --filter @stock/web vitest -- --watch`(워치).

- **계약을 고정한다, 구현을 박제하지 않는다.** describe/it 는 한국어로 "무엇을 보장하는가"를
  적고, 하나의 `it` 은 하나의 행동만 검증한다. 내부 호출 순서·에러 문자열 전체를 박는
  change-detector 는 만들지 않는다(리팩터링을 막는다).
- **바깥 세계에 붙지 않는다.** 키움·DB·네트워크는 목킹한다. 서비스는 Prisma/주입 의존성을
  `vi.fn()` 으로 세우고 `new Service(mock)` 으로 단위 검증한다(Nest Test 모듈·실 DB 불필요).
  순수 변환(mapper·libs)은 직접 호출, 컴포넌트·훅은 `@testing-library/react`.
- **레이어별 대상**
  - 백엔드: mapper/libs(부호·단위·형태), service(멱등성·집계·분기 — Prisma 목킹),
    guard/interceptor(인증·신원 해석 — `ExecutionContext` 목킹). 예:
    `watchlist.service.spec.ts`·`profile.service.spec.ts`·`common/usage-logging.interceptor.spec.ts`.
  - 프론트: libs/model(순수 로직·쿼리 결정), 컴포넌트(권한·상태 분기). 예:
    `entities/watchlist/item/watchlist.model.spec.tsx`(toggle add/remove), `error-boundary.spec.tsx`.
- **기능 추가 규칙**: 새 기능은 사용자 계약을 고정하는 spec 을 **같은 변경에서** 추가한다
  (각 앱 CLAUDE.md 의 기능 목록 표 갱신과 한 묶음). spec 이 없으면 그 기능은 "미명세"로 본다.
- 스펙은 `src/**` 에 둔다 → `typecheck` 에는 포함되고 런타임 빌드(`tsconfig.build.json`)에서는 제외된다.

## 디버깅

- 화면 우하단 **디버그 패널**(`Ctrl+Shift+D`)에 에러·쿼리 실패·실시간 세션 변화가 쌓인다.
  개발자도구를 열 수 없는 환경을 전제로 만들었다. 새 실패 경로를 추가할 때는
  `debugLog.push`/`pushError` 로 같은 창구에 남긴다.
- 에러 패널·디버그 패널 모두 **키움 코드**(`8030`/`8010`/`1700` …)를 그대로 노출한다.
  원인 판별은 HTTP 상태가 아니라 이 코드로 한다 → `kiwoom_spec.py errors <코드>`.
- BFF 로그는 `apps/api` 콘솔. 토큰 실패는 `tokenFailureHint()` 가 조치 문구까지 만들어 준다.

## 환경

Windows 11 / PowerShell 기본, Bash(Git Bash)도 사용 가능. Node 24, pnpm 10, Python 3.11.
git 저장소이지만 아직 커밋이 없다(`main` 브랜치, 초기 커밋 전).

경쟁 로그인 토큰은 `SESSION_SECRET`(HMAC 서명 키)으로 서명한다 — `.env.example` 에 있고
개발용 기본값이 있으나 운영에서는 교체한다. 바꾸면 발급된 모든 토큰이 무효가 된다.

`.env` 는 루트 하나만 쓰고 커밋하지 않는다(`.env.example` 만 커밋). `.gitignore` 는
`dist/`·`node_modules/`·SQLite DB(`apps/api/prisma/*.db`)를 제외하고, `.dockerignore` 는
추가로 스펙 원본(2.4MB)과 `.claude/` 조회 스킬까지 제외한다 — 생성된 TS 는 커밋된
소스라서 런타임 이미지에 스펙이 필요 없다.

---

참고: `~/.gemini/settings.json` 이 있다. Gemini CLI 설정을 가져오려면 `/import` 로 스캔한 뒤
`/import --yes=<digest>` 로 적용한다.
