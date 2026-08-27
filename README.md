# STOCK ARCADE

키움증권 OpenAPI 기반 **실시간 시세 대시보드 + 계좌/주문 연동 + 모의투자 경쟁**(여러 명이
각자 100만원 시드로 실시간 시세로 겨루는 페이퍼 트레이딩). pnpm 워크스페이스 모노레포.

```
apps/api        NestJS BFF (토큰·REST 프록시·단일 WS 세션·주문 저널) + Prisma/Postgres — :4000
apps/web        React + Vite 대시보드 (FSD 4계층) — :5173
packages/*      BFF↔web 공용 zod 계약 · 키움 코드 카탈로그
```

## 요구사항

- **Node ≥ 20**, **pnpm 10** (`corepack enable` 로 활성화 가능)
- **Supabase(또는 PostgreSQL)** — 경쟁·주문 저널·관심종목 등 저장소
- **키움 OpenAPI 자격증명** — https://openapi.kiwoom.com 에서 발급(실전/모의 앱키가 다름).
  `KIWOOM_ENV=mock` 이라도 모의투자용 앱키·시크릿이 필요하다.

## 빠른 시작

```bash
# 1) 의존성 설치
pnpm install

# 2) 환경변수 — 루트에 .env 하나만 쓴다
cp .env.example .env
#   KIWOOM_APP_KEY / KIWOOM_SECRET_KEY (필수)
#   DATABASE_URL / DIRECT_URL          (필수, Supabase Connection string)
#   나머지는 기본값으로 동작

# 3) DB 스키마 적용 (최초 1회, 이후 스키마 변경 시)
pnpm db:migrate

# 4) 개발 서버 실행 — 공용 패키지 빌드 후 api(4000) + web(5173) 동시 기동
pnpm dev
```

브라우저에서 **http://localhost:5173** 접속.

| 주소 | 설명 |
| --- | --- |
| http://localhost:5173 | 웹 대시보드 |
| http://localhost:4000 | BFF (API) |
| http://localhost:4000/docs | Swagger UI (API 계약) |

> **다른 기기(폰 등)에서 접속**: dev 서버가 LAN 에도 바인딩되어 있어(`vite server.host`),
> `pnpm dev` 실행 시 콘솔에 찍히는 `Network: http://<IP>:5173` 주소로 같은 네트워크의
> 기기에서 열 수 있다. macOS 방화벽이 node 수신 연결을 물으면 허용한다.

## 명령

```bash
pnpm dev            # 패키지 빌드 후 api + web 동시 실행
pnpm dev:api        # BFF 만 (:4000)
pnpm dev:web        # 웹 만 (:5173)

pnpm build          # 패키지 → 앱 순서로 빌드
pnpm typecheck      # 전체 워크스페이스 타입체크
pnpm test           # vitest (api / web)

pnpm db:migrate     # Prisma 마이그레이션 (루트 .env 필요)
pnpm db:generate    # Prisma 클라이언트 재생성
```

## 환경변수

루트 `.env` 하나만 쓰고 커밋하지 않는다(`.env.example` 만 커밋). 전체 목록은 `.env.example` 참고.

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `KIWOOM_APP_KEY`·`KIWOOM_SECRET_KEY` | ✅ | 키움 OpenAPI 자격증명 |
| `DATABASE_URL`·`DIRECT_URL` | ✅ | Supabase Postgres (앱 런타임 / 마이그레이션) |
| `KIWOOM_ENV` | | `mock`(기본) / `real`. **real 은 실제 주문이 체결된다** |
| `ACCOUNT_ENABLED` | | 실계좌 조회(잔고·미체결) 스위치. `false` 면 끔(기본 활성) |
| `SESSION_SECRET` | | 경쟁 로그인 토큰(HMAC) 서명 키. 운영에서 교체 |
| `PORT`·`WEB_ORIGIN`·`KIWOOM_RPS` | | 기본값 있음 |

## 더 보기

- [`CLAUDE.md`](./CLAUDE.md) — 설계 원칙·제약(키움 API 규약)·코드 배치 규칙
- [`docs/`](./docs/) — [기능 현황](./docs/FEATURES.md) · [변경 이력](./docs/CHANGELOG.md) ·
  [ERD](./docs/ERD.md) · [설계 배경(ARCHITECTURE)](./ARCHITECTURE.md)
- 각 앱 기능 목록: [`apps/api/CLAUDE.md`](./apps/api/CLAUDE.md) · [`apps/web/CLAUDE.md`](./apps/web/CLAUDE.md)

## 설계상 반드시 지킬 것 (요약)

- 브라우저는 키움을 직접 부르지 않는다 — appkey/토큰은 BFF 에만 있다.
- 실시간은 WebSocket, REST 폴링 금지(유량 초과로 막힌다).
- 키움 값 정규화(부호·단위)는 BFF mapper 에서만 — 프론트에는 camelCase·number·원 단위만.
- 경쟁(페이퍼)과 실계좌는 완전히 분리 — 경쟁의 현금·보유·체결은 우리 DB 가 진실이다.

자세한 근거는 `CLAUDE.md` 와 `ARCHITECTURE.md`.
