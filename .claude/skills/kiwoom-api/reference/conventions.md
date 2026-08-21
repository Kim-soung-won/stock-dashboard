# 호출 규약 (공통)

스펙 JSON(342개 API) 전체에서 공통으로 적용되는 규칙. 개별 API 필드는
`python scripts/kiwoom_spec.py show <apiId>` 로 확인한다.

## 1. 엔드포인트

| 구분 | 실전 | 모의 |
| --- | --- | --- |
| REST | `https://api.kiwoom.com` | `https://mockapi.kiwoom.com` |
| WebSocket | `wss://api.kiwoom.com:10000` | `wss://mockapi.kiwoom.com:10000` |

- **342개 API 전부 `POST` + `Content-Type: application/json;charset=UTF-8`** 이다.
  GET은 없고, 쿼리스트링도 쓰지 않는다. 모든 입력은 JSON 바디 또는 헤더로 들어간다.
- 경로는 기능 그룹 단위(`/api/dostk/acnt`, `/api/us/chart` …)이고, **실제 TR 구분은
  `api-id` 헤더**가 한다. 즉 같은 URL에 33개 API가 매달려 있을 수 있다.
- 스펙에는 각 API마다 `mockDomain` 이 적혀 있지만, 모의투자에서 해당 TR이 실제로
  동작하는지는 스펙만으로 보장되지 않는다. 실패하면 실전 도메인으로 확인한다.

## 2. 인증

```
POST /oauth2/token   (au10001)
{"grant_type":"client_credentials","appkey":"...","secretkey":"..."}
→ {"token":"...","token_type":"bearer","expires_dt":"20241107083713","return_code":0}
```

- `expires_dt` 는 `yyyyMMddHHmmss` 문자열. 만료 전에 재발급한다.
- 폐기는 `POST /oauth2/revoke` (au10002, 바디 `appkey`/`secretkey`/`token`).
- 이 두 개만 `authorization` 헤더가 없다. 나머지 전부 필요.
- 토큰은 **발급 요청한 IP에 묶인다** (에러 `8010`). 로컬 개발 → 서버 배포 시 주의.
- appkey/secretkey/token은 절대 소스·로그·커밋에 넣지 않는다. `.env` + `.gitignore`.

## 3. REST 요청 형태

헤더 4개가 스펙의 `requestIo` 앞부분에 필드처럼 섞여 있다(`api-id`, `authorization`,
`cont-yn`, `next-key`). **이 4개는 헤더, 나머지는 바디**다.
`kiwoom_spec.py show` 는 이미 둘을 분리해서 보여준다.

```python
import requests

def call(api_id, body, token, cont_yn="N", next_key="", base="https://api.kiwoom.com", path=None):
    r = requests.post(
        base + path,
        headers={
            "Content-Type": "application/json;charset=UTF-8",
            "authorization": f"Bearer {token}",
            "api-id": api_id,
            "cont-yn": cont_yn,
            "next-key": next_key,
        },
        json=body,
        timeout=10,
    )
    r.raise_for_status()
    return r.headers, r.json()
```

## 4. 응답 규약

- 바디에 `return_code`(0=정상) / `return_msg` 가 온다. **HTTP 200이어도
  `return_code != 0` 이면 실패**이므로 반드시 확인한다.
- 응답 헤더로 `api-id`, `cont-yn`, `next-key` 가 돌아온다.
- 리스트형 결과는 API마다 이름이 다르다(`stk_dt_pole_chart_qry`, `result_list`, …).
  단일 공통 래퍼가 없으므로 API별 필드명을 확인해야 한다.

## 5. 연속조회 (페이지네이션)

응답 헤더 `cont-yn == "Y"` 면 데이터가 더 있다. **같은 바디**로 재요청하면서 요청 헤더
`cont-yn`, `next-key` 에 응답 헤더 값을 넣는다.

```python
cont, key = "N", ""
while True:
    headers, data = call(api_id, body, token, cont, key, path=path)
    yield data
    if headers.get("cont-yn") != "Y":
        break
    cont, key = "Y", headers.get("next-key", "")
```

일부 WebSocket 조건검색(ka10172 등)은 헤더가 아니라 **메시지 바디**의
`cont_yn`/`next_key` 필드로 같은 일을 한다(언더스코어 vs 하이픈 주의).

## 6. 값 표기 관례 (파싱 시 함정)

- **모든 값이 문자열**이다(`type`이 대부분 `String`). 숫자 변환은 직접 해야 한다.
- 가격·등락 값에 **부호가 붙는다**: `"-20800"`, `"+82"`. 이때 부호는 "음수"가 아니라
  전일대비 방향 표시인 경우가 많다(현재가 `10`: `-20800` = 20800원, 하락).
  → `abs(int(v))` 로 값을, 부호/`pred_pre_sig` 로 방향을 읽는 게 안전하다.
- `pred_pre_sig` / `pre_sig`: `1` 상한, `2` 상승, `3` 보합, `4` 하한, `5` 하락.
- 단위가 필드마다 다르다. `desc` 에 "단위: 원 / 백만원 / 천원 / 억원 / %" 로 명시돼
  있으니 차트·표에 쓸 땐 반드시 확인한다(예: `trde_prica` 거래대금 = 백만원).
- 백분율은 부호 포함 소수점 둘째 자리 포맷 문자열.
- 빈 문자열 `""` 이 "값 없음"으로 온다. `None` 이 아니다.
- 날짜 `yyyyMMdd`, 시간 `HHmmss`(또는 `HHmm`), 체결시간은 6자리 문자열.

## 7. 종목코드 / 거래소 구분

- 거래소별 종목코드 접미사: KRX `039490`, NXT `039490_NX`, SOR(최선주문집행) `039490_AL`.
- 조회계 API의 `stex_tp`: 보통 `K` KRX, `N` NXT, `A` 통합/전체 (API별 `desc` 확인).
- 주문계 API의 `dmst_stex_tp`: `KRX` / `NXT` / `SOR`.
- 두 개가 이름도 값도 다르므로 혼용하지 않는다.

## 8. WebSocket 규약

등록/해지 메시지와 실시간 타입별 FID는 `realtime.md` 참고.

접속 직후 절차는 스펙 JSON에 없다(스펙은 페이로드만 정의). 키움 공식 가이드 기준
아래 순서이며, 첫 연결 시 실제 응답으로 확인할 것:

1. `wss://api.kiwoom.com:10000/api/dostk/websocket` 연결
2. `{"trnm":"LOGIN","token":"<access_token>"}` 전송 → `return_code 0` 확인
3. `{"trnm":"REG", ...}` 로 종목/타입 등록 (그룹번호 `grp_no` 단위)
4. 서버가 보내는 `{"trnm":"PING"}` 은 **받은 그대로 되돌려 보내** 연결을 유지
5. 수신 데이터는 `{"trnm":"REAL","data":[{"type","name","item","values":{FID:값}}]}`

운영 시 고려사항: 재접속 시 등록이 초기화되므로 등록 목록을 클라이언트에 보관하고
재등록한다. `refresh:"1"` 은 기존 등록 유지, `"0"` 은 기존 등록을 해지하고 교체한다.

## 9. 호출량 제한 / 에러

- 스펙에 구체적 수치는 없지만 유량 초과 에러코드가 정의되어 있다:
  `1700`(API별 유량), `1701`(전체 유량), `1702`(그룹 유량), `1687`(재귀 호출 제한).
  → 폴링 대시보드는 **주기적 REST 폴링보다 WebSocket 실시간 등록**을 우선한다.
- 전체 에러코드 표는 `error-codes.md`, 조회는 `python scripts/kiwoom_spec.py errors 8005`.

## 10. 자주 나오는 필드 약어

| 필드 | 뜻 | 필드 | 뜻 |
| --- | --- | --- | --- |
| `stk_cd` / `stk_nm` / `stk_enm` | 종목코드/명/영문명 | `inds_cd` | 업종코드 |
| `cur_prc` | 현재가 | `pred_pre` / `pred_pre_sig` | 전일대비 / 대비기호 |
| `flu_rt` | 등락률 | `open_pric` `high_pric` `low_pric` | 시/고/저가 |
| `trde_qty` / `acc_trde_qty` | 거래량 / 누적거래량 | `trde_prica` / `acc_trde_prica` | 거래대금 / 누적 |
| `sel_bid` / `buy_bid` | 매도호가 / 매수호가 | `cntr_qty` / `cntr_tm` | 체결량 / 체결시간 |
| `ord_no` / `ord_qty` / `ord_uv` | 주문번호/수량/단가 | `orig_ord_no` | 원주문번호 |
| `trde_tp` | 매매구분(가격유형) | `mrkt_tp` | 시장구분 |
| `dt` / `tm` | 일자 / 시간 | `strt_dt` / `end_dt` / `base_dt` | 시작/종료/기준일자 |
| `qry_tp` | 조회구분 | `sort_tp` | 정렬기준 |
| `stex_tp` / `dmst_stex_tp` | 거래소구분(조회/주문) | `upd_stkpc_tp` | 수정주가 적용(0/1) |
| `pl_amt` | 손익금액 | `crnc_code` | 통화코드 |
| `result_list` | 결과 리스트(공통 이름) | `mgn_type` | 증거금률 |
