---
name: kiwoom-api
description: 키움증권 REST/WebSocket API(342개 TR) 스펙 조회와 호출 규약 가이드. 국내·미국 주식 시세·차트·순위·계좌·주문 API를 찾거나, 실시간(WebSocket) 시세를 구독하거나, 토큰 발급·연속조회·에러코드·필드 의미를 확인해야 할 때 사용한다. api-id(ka10081, kt10000, 0B 같은 TR 코드), 실시간 FID, 주식 대시보드/자동매매 연동 작업이 나오면 적용된다.
---

# 키움증권 OpenAPI (REST + WebSocket)

원본 스펙: `kiwoom-rest-api-spec.json` (프로젝트 루트, 약 2.4MB, 342개 API).
**이 JSON을 통째로 읽지 말고** 아래 조회 도구와 카탈로그로 필요한 부분만 꺼내 쓴다.

## 스펙 구조 (한 문단 요약)

JSON은 `apiId → 항목` 맵 + `errorCodeList` 다. 각 항목은
`apiId, apiNm, method, domain, mockDomain, url, format, contentType, description,
requestIo[], responseIo[], requestExample, responseExample` 를 가진다.
`requestIo`/`responseIo` 원소는 `{itemId, itemNm, type, length, desc}` 이고,
`itemId` 의 `- ` / `- - ` 접두사가 **중첩 깊이**(리스트 안 필드, 실시간 FID)를 뜻한다.
REST API의 `requestIo` 앞 4개(`api-id`, `authorization`, `cont-yn`, `next-key`)는
바디가 아니라 **HTTP 헤더**다.

## 조회 도구 (먼저 이걸 쓴다)

```bash
cd .claude/skills/kiwoom-api

python scripts/kiwoom_spec.py groups                 # 29개 그룹과 API 수
python scripts/kiwoom_spec.py list dostk/acnt        # 그룹 목록 + 요청 파라미터
python scripts/kiwoom_spec.py search 일봉            # 이름·설명·필드에서 검색
python scripts/kiwoom_spec.py search 잔고 --scope name
python scripts/kiwoom_spec.py show ka10081 kt10000   # 요청/응답 필드 + 예시 (핵심)
python scripts/kiwoom_spec.py show 0B --full         # 실시간 FID 전체
python scripts/kiwoom_spec.py fields kt00018 --res   # 필드명만 빠르게
python scripts/kiwoom_spec.py errors 8005            # 에러코드
python scripts/kiwoom_spec.py show ka10081 --json    # 코드 생성용 원본 JSON
```

스펙 경로는 스크립트 위치에서 상위로 올라가며 자동 탐색한다.
다른 곳에 두면 `--spec PATH` 또는 환경변수 `KIWOOM_SPEC`.

## 문서 (필요할 때만 열기)

| 파일 | 내용 | 언제 |
| --- | --- | --- |
| `reference/constraints.md` | **이 API가 강제하는 제약** (IP 바인딩·유량·실전/모의 키 분리·멱등성 없음·장 운영시간·미확인 항목) | 아키텍처·배포·재시도 정책을 정할 때 |
| `reference/conventions.md` | 인증·헤더·연속조회·값 표기 함정·거래소 코드·유량·필드 약어 | **API 코드 처음 작성할 때 필수** |
| `reference/playbook.md` | 목적별 api-id 선택표(대시보드/계좌/주문/미국) | 어떤 TR을 쓸지 정할 때 |
| `reference/realtime.md` | WebSocket 등록/해지 프로토콜 + 실시간 23타입 FID 전체 | 실시간 시세 구현할 때 |
| `reference/catalog-domestic.md` | 국내 187개 API 표(id·이름·요청 파라미터) | 그룹 훑어볼 때 |
| `reference/catalog-us.md` | 미국 122개 API 표 | |
| `reference/catalog-auth.md` | 토큰 발급/폐기 2개 | |
| `reference/error-codes.md` | 에러코드 37개 + 분류 | 에러 핸들링 설계할 때 |

문서는 `python scripts/build_reference.py` 로 스펙에서 재생성된다.
스펙 JSON이 갱신되면 이 스크립트만 다시 돌린다. **문서를 손으로 고치지 말 것**
(`conventions.md`·`playbook.md`·`constraints.md` 세 개는 수동 관리 문서라 재생성 대상이 아니다).

## 절대 놓치면 안 되는 규칙 6개

1. **전부 POST + JSON.** GET/쿼리스트링 없음. URL은 기능 그룹이고 실제 TR은
   `api-id` 헤더로 구분한다(같은 URL에 API 33개가 붙는다).
2. **`authorization: Bearer <token>` + `api-id: <apiId>`** 두 헤더가 없으면 무조건 실패.
   토큰은 `au10001`(`POST /oauth2/token`, `grant_type=client_credentials`)로 발급,
   `expires_dt`(yyyyMMddHHmmss) 전에 갱신. 토큰은 발급 IP에 묶인다(에러 `8010`).
3. **HTTP 200 ≠ 성공.** 바디의 `return_code == 0` 을 확인한다.
4. **연속조회**는 응답 헤더 `cont-yn == "Y"` 일 때 같은 바디로 재요청하면서
   요청 헤더 `cont-yn`/`next-key` 를 채운다.
5. **모든 값이 문자열이고 가격에 부호가 붙는다**(`"-20800"` = 20800원, 하락).
   단위도 필드마다 다르다(원/천원/백만원/억원/%). `desc` 를 읽고 어댑터에서 정규화.
6. **실시간은 WebSocket으로.** REST 폴링을 실시간 대용으로 쓰면 유량 에러
   (`1700`/`1701`/`1702`)에 막힌다. `wss://api.kiwoom.com:10000` 접속 →
   `LOGIN`(토큰) → `REG`(그룹·종목·타입) → `PING` 받으면 그대로 되돌려주기.

## 작업 순서 권장

1. 목적 → `reference/playbook.md` 에서 후보 api-id 찾기 (없으면 `search`)
2. `show <apiId>` 로 요청/응답 필드와 실제 예시 확인
3. 코드 작성 전 `reference/conventions.md` 의 해당 절(인증/연속조회/값 파싱) 재확인
4. 실시간이면 `reference/realtime.md` 에서 FID 표를 보고 파싱 매핑 작성
5. 주문 계열(`kt10000`~, `ust2000x`)은 **모의 도메인에서 검증 후** 실전 전환.
   중복 주문 방지, `ord_no` 추적, 접수≠체결 구분은 `playbook.md` C절 참고

## 코딩 시 지킬 점

- appkey/secretkey/token은 `.env` 등 환경변수로만. 코드·로그·커밋에 남기지 않는다.
- 스펙 필드명(`stk_cd`, `cur_prc`, FID `10`)을 UI까지 그대로 끌고 가지 말고
  경계에서 도메인 모델로 변환한다.
- api-id는 상수/enum으로 모아 관리한다(오타가 런타임 에러로만 드러난다).
- 실전 주문 코드를 작성·수정할 때는 사용자에게 실전/모의 여부를 확인한다.
