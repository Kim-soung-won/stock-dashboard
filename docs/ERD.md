# ERD — 데이터 모델

Prisma 스키마(`apps/api/prisma/schema.prisma`)를 그대로 시각화한 것이다. 스키마가 진실이고
이 문서는 파생물이므로, 스키마가 바뀌면 이 다이어그램도 함께 갱신한다.

## 도메인 경계

DB 는 "키움에 없는 것"만 보관한다. 시세·잔고·예수금의 진실은 키움 서버에 있어 캐시하지 않는다.
두 도메인이 한 DB 안에 공존하지만 **서로 참조하지 않는다**:

- **실계좌 주문**(`Order`, `OrderEvent`) — 키움 주문 API 의 멱등성·상태추적·감사용.
- **모의투자 경쟁**(`Participant`·`Season`·`Portfolio`·`Holding`·`PaperTrade`) — 여기서는 DB 가
  진실이다. 키움 주문 API 를 쓰지 않는다.
- **총평가금액 추이**(`PortfolioSnapshot`) — 리더보드는 즉석 계산이라 이력이 없으므로, 주기적으로
  참가자별 총평가금액을 append-only 로 적재한다(라인차트 시계열). FK 없는 독립 테이블.
- **관심 종목**(`WatchlistItem`) — 참가자별 관심 종목. 코드+이름 스냅샷만 담고 시세는 저장하지 않는다.
- `SymbolCache` — 어느 쪽에도 속하지 않는 종목 마스터 캐시(없어도 동작).
- `ServiceUsageLog` — 전역 인터셉터가 모든 HTTP 요청을 append-only 로 적재하는 사용 이력(감사·분석).
  어느 도메인도 참조하지 않는 독립 테이블이다(FK 없음).

```mermaid
erDiagram
    Order ||--o{ OrderEvent : "has"

    Participant ||--o{ Portfolio : "joins"
    Participant ||--o{ WatchlistItem : "watches"
    Season      ||--o{ Portfolio : "scopes"
    Portfolio   ||--o{ Holding : "holds"
    Portfolio   ||--o{ PaperTrade : "journals"

    Order {
        string   id PK
        string   idempotencyKey UK "클라 멱등키 — 중복 주문 차단"
        string   orderNo "키움 주문번호(접수 후)"
        string   originalOrderNo "정정·취소 원주문번호"
        string   code
        string   name
        string   side "buy | sell"
        string   orderType "limit | market"
        string   exchange "KRX | NXT | SOR"
        int      quantity
        int      price
        int      filledQuantity
        int      averageFilledPrice
        string   status "OrderStatus, 기본 submitting"
        string   env "mock | real — 절대 혼합 집계 금지"
        string   failureReason
        string   requestSnapshot "감사용(토큰 제외)"
        string   responseSnapshot
        datetime createdAt
        datetime updatedAt
    }

    OrderEvent {
        string   id PK
        string   orderId FK
        string   kind "submitted | accepted | filled | ... append-only"
        string   sourceLabel "키움 실시간 913 등 원문"
        int      filledQuantity
        int      filledPrice
        string   payload "이벤트 원문 JSON"
        datetime occurredAt
    }

    Participant {
        string   id PK
        string   nickname UK
        string   pinHash "scrypt salt:derivedKey — 평문 PIN 저장 안 함"
        string   bio "SNS 한 줄 소개(선택)"
        string   avatarEmoji "SNS 아바타 이모지(선택)"
        datetime createdAt
    }

    Season {
        string   id PK
        string   name
        int      startingCash "시드머니(원), 기본 1,000,000"
        datetime startAt
        datetime endAt
        string   status "active 는 동시에 하나만"
        datetime createdAt
    }

    Portfolio {
        string   id PK
        string   participantId FK
        string   seasonId FK
        int      startingCash "시드 스냅샷 — 참가자 기준선 고정"
        int      cash "현재 현금 잔고(원) — 현금의 진실"
        datetime createdAt
        datetime updatedAt
    }

    Holding {
        string   id PK
        string   portfolioId FK
        string   code
        string   name
        int      quantity "0 되면 행 삭제"
        int      averagePrice "매입평균가(원, 수수료 제외)"
        datetime updatedAt
    }

    PaperTrade {
        string   id PK
        string   portfolioId FK
        string   code
        string   name
        string   side "buy | sell"
        int      quantity
        int      price "체결 단가(원)"
        int      fee "매매수수료(원)"
        int      tax "거래세(원, 매도만)"
        int      cashDelta "순현금 이동 — 매수 음수/매도 양수"
        datetime createdAt
    }

    SymbolCache {
        string   market PK "복합키 — 시장 구분이 배타적이지 않음"
        string   code PK
        string   name
        datetime updatedAt
    }

    PortfolioSnapshot {
        string   id PK
        string   seasonId "인덱스 (seasonId, createdAt)"
        string   participantId
        int      totalValue "총평가금액(원) — 라인차트 한 점"
        float    totalProfitLossRate "총수익률 %"
        datetime createdAt
    }

    WatchlistItem {
        string   id PK
        string   participantId FK
        string   code "6자리 종목코드"
        string   name "추가 시점 이름 스냅샷(없으면 null)"
        datetime createdAt
    }

    ServiceUsageLog {
        string   id PK
        string   participantId "토큰에서 확정한 신뢰 신원 — 비로그인이면 null"
        string   headerUserId "X-User-Id 헤더(디바이스/익명, 위조 가능)"
        string   method "GET | POST | ..."
        string   path "쿼리스트링 제외 경로"
        int      statusCode
        int      durationMs
        string   ip
        string   userAgent
        datetime createdAt
    }
```

## 핵심 제약 (스키마의 unique / 복합키가 강제하는 규칙)

| 제약 | 대상 | 이유 |
| --- | --- | --- |
| `idempotencyKey` unique | `Order` | 같은 키의 두 번째 요청은 키움으로 나가지 않는다(멱등성). |
| `nickname` unique | `Participant` | 닉네임이 곧 로그인 아이디. |
| `(participantId, seasonId)` unique | `Portfolio` | 한 시즌에 참가자당 포트폴리오 1개. |
| `(portfolioId, code)` unique | `Holding` | 종목당 보유 행 1개(수량 합산). |
| `(participantId, code)` unique | `WatchlistItem` | 참가자당 같은 종목을 한 번만 담는다. |
| `(market, code)` 복합 PK | `SymbolCache` | ka10099 시장 구분이 배타적이지 않아 code 단일키면 서로 덮어씀. |
| `onDelete: Cascade` | 모든 FK | 부모 삭제 시 자식 자동 정리(고아 행 방지). |

## 시각적으로 보는 방법

Mermaid `erDiagram` 이라 **별도 툴 설치 없이** 아래 중 편한 걸로 본다.

1. **GitHub** — 이 `.md` 를 푸시하면 코드블록이 다이어그램으로 자동 렌더링된다(가장 간단).
2. **VS Code** — `Markdown Preview Mermaid Support` 확장 설치 후 `Ctrl/Cmd+Shift+V` 미리보기.
   (이 저장소는 프론트가 VS Code 전제라 팀에 이 방법을 권장)
3. **mermaid.live** — 위 ```mermaid 블록만 복사해 붙이면 즉시 렌더 + PNG/SVG 내보내기.

### 스키마에서 자동 재생성하고 싶다면

수기 동기화가 번거로우면 Prisma 제너레이터로 빌드 시 자동 생성할 수 있다.

```bash
pnpm --filter @stock/api add -D prisma-erd-generator @mermaid-js/mermaid-cli
```

`schema.prisma` 에 추가:

```prisma
generator erd {
  provider = "prisma-erd-generator"
  output   = "../../docs/ERD.svg"   // 또는 .md / .png
}
```

이후 `pnpm --filter @stock/api db:generate` 를 돌리면 `docs/ERD.svg` 가 스키마와 함께 갱신된다.
(단 mermaid-cli 가 Puppeteer/Chromium 을 받으므로 설치 용량이 늘어난다 — 수기 유지가 부담될 때만 도입)
