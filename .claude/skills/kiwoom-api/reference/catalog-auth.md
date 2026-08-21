# 인증 API

> 자동 생성 문서 — `scripts/build_reference.py` 로 재생성. 요청/응답 필드 전체는 `python scripts/kiwoom_spec.py show <apiId>` 로 확인.

접근토큰 발급/폐기. 이 두 개만 `authorization` 헤더가 필요 없다.
총 2개 API. 모든 호출은 `POST` + JSON, `api-id` 헤더로 TR을 구분한다.


## 인증 - 토큰 발급 — `POST /oauth2/token` (1개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `au10001` | 접근토큰 발급 | `grant_type`, `appkey`, `secretkey` |

## 인증 - 토큰 폐기 — `POST /oauth2/revoke` (1개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `au10002` | 접근토큰폐기 | `appkey`, `secretkey`, `token` |
