# 변경 이력 (CHANGELOG)

기능 묶음 단위로 기록한다(커밋 1:1 아님). 최신이 위. 날짜는 도입 시점(작업일).
상세 계약은 `/docs`(Swagger)·`FEATURES.md`, 설계 근거는 `../ARCHITECTURE.md`.

---

## 2026-08-26

### 리더보드 총평가금액 추이 라인차트 `4980f94`
순위표는 "지금 순위"만 보여줬다. 시간에 따라 참가자들이 어떻게 벌어졌는지 비교하도록,
총평가금액 시계열을 적재하고 리더보드 화면에 **날짜축 라인차트**를 함께 그린다.
- `PortfolioSnapshot` 테이블 + 주기 적재(기본 5분). 과거는 소급 복원 불가(과거 시세 미보관).
- `GET /api/competition/leaderboard/history`(공개) + ECharts 라인차트(내 곡선 강조).
- **주의**: 곡선은 도입 시점부터 쌓인다 — 첫 스냅샷 전에는 안내 문구를 띄운다.

### 관심종목 (Watchlist)
참가자별 관심종목을 서버에 저장(기존 대시보드의 localStorage 방식을 대체).
- `GET/POST/DELETE /api/watchlist`(멱등), 목록·순위 표의 ★ 토글, 전용 페이지(실시간 시세).

### 유저 프로필 (SNS) `be81853`
다른 사람이 조회 가능한 공개 프로필.
- `GET /api/participants/:id/profile`(공개: 요약·보유·최근 체결·관심종목),
  `PATCH /api/profile`(본인 bio·아바타 편집). 리더보드 닉네임 → 프로필 링크, 헤더 아바타.

### 서비스 사용 이력 (Observability)
전역 인터셉터가 모든 HTTP 요청을 `ServiceUsageLog`에 적재(감사·분석).
- 신원: 토큰 우선 + `X-User-Id` 헤더 보완. 비차단(로깅 실패가 요청을 깨지 않음).

### API 문서 (Swagger)
`/docs`에 Swagger UI. **zod 계약에서 OpenAPI 생성**(데코레이터 없음) → 계약이 바뀌면 문서도 따라옴.

### UI 테마 — Terminal + 다크/라이트
claude.ai/design 의 Terminal 프리셋 이식 + 각 테마의 다크/라이트 모드.
- `data-theme`/`data-mode`를 CSS 변수로 흡수, 헤더 토글 2개. 선택은 localStorage 유지.

### 테스트 구조 확립
콜로케이트 `*.spec.ts(x)` + vitest. 계약 고정(change-detector 금지), 외부(DB·키움) 목킹.
- mapper·서비스·인터셉터·libs·훅 커버리지. 루트/앱 `CLAUDE.md`에 테스트 규칙 문서화.
- 이 과정에서 `CompetitionService.serialize` 락의 미처리 rejection·락 미삭제 버그를 잡아 수정.

### SQLite → Supabase Postgres 전환 `f7bfb34`
로컬 SQLite 에서 Supabase Postgres 로 이전 + ERD 문서 도입.

---

## 2026-08-26 (이전)

### 모의투자 경쟁 (페이퍼 트레이딩) + STOCK ARCADE 스킨 `b35b1f9`
참가자별 100만원 시드로 실시간 시세로 겨루는 페이퍼 트레이딩. 시장가 매매·포트폴리오·
리더보드(WS 2초 팬아웃). 우리 DB 가 현금·보유의 진실. 픽셀 아케이드 스킨.

---

## 2026-08-21

### 키움 OpenAPI 실시간 대시보드 초기 구성 `4f18842`
BFF(토큰·REST 프록시·단일 WS 세션) + React 대시보드(FSD 4계층) + 공용 계약/코드 카탈로그.
브라우저는 키움을 직접 부르지 않는다(토큰은 BFF 에만). 실시간은 WS, REST 폴링 금지.
