# 미국주식 API 카탈로그

> 자동 생성 문서 — `scripts/build_reference.py` 로 재생성. 요청/응답 필드 전체는 `python scripts/kiwoom_spec.py show <apiId>` 로 확인.

미국주식 REST API. WebSocket(실시간·조건검색)은 `realtime.md` 참고.
총 122개 API. 모든 호출은 `POST` + JSON, `api-id` 헤더로 TR을 구분한다.


## 미국 주문 — `POST /api/us/ordr` (5개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ust20000` | 미국주식 매수 주문 | `stex_tp`, `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp` |
| `ust20001` | 미국주식 매도 주문 | `stk_cd`, `stex_tp`, `ord_qty`, `ord_uv`, `stop_pric`, `trde_tp` |
| `ust20002` | 미국주식 정정 주문 | `orig_ord_no`, `stex_tp`, `stk_cd`, `mdfy_uv`, `stop_pric` |
| `ust20003` | 미국주식 취소 주문 | `orig_ord_no`, `stex_tp`, `stk_cd` |
| `ust31490` | 미국주식 주문가능수량(종목/증거금률별) | `stex_tp`, `stk_cd`, `uv` |

## 미국 계좌 — `POST /api/us/acnt` (28개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa21670` | 미국주식 일별계좌수익률현황 | `from`, `to` |
| `usa21680` | 미국주식 월별계좌수익률현황 | `from`, `to` |
| `usa21690` | 미국주식 연도별계좌수익률현황 | `from`, `to` |
| `usa21730` | 미국주식 일별종목수익률현황 | `from`, `to`, `stex_tp`, `stk_cd` |
| `usa21731` | 미국주식 월별종목수익률현황 | `from`, `to`, `stex_tp`, `stk_cd` |
| `usa21732` | 미국주식 연도별종목수익률현황 | `from`, `to`, `stex_tp`, `stk_cd` |
| `ust21050` | 미국주식 원장 미체결 | `ord_dt`, `slby_tp`, `stex_tp`, `stk_cd` |
| `ust21070` | 미국주식 원장잔고확인 | `stex_tp`, `stk_cd` |
| `ust21100` | 미국주식 거래내역 | `strt_dt`, `end_dt`, `tp`, `stex_tp`, `stk_cd`, `krw_repl_skip_yn` |
| `ust21110` | 해외주식 예수금 | (없음) |
| `ust21111` | 원화출금가능 금액 조회(원화대용 포함) | (없음) |
| `ust21120` | 통화별 예수금 및 증권 평가금현황 | `cmsn_incl_tp`, `exrt_tp` |
| `ust21121` | 해외증권 원장 평가금액현황 | `cmsn_incl_tp`, `exrt_tp` |
| `ust21131` | 해외증권 특정일 평가금액 | `base_dt` |
| `ust21132` | 특정일 통화별 예수금 및 증권 평가금 | `base_dt` |
| `ust21150` | 미국주식 일별 주문체결내역 | `ord_dt`, `query_tp`, `slby_tp`, `stex_tp`, `stk_cd`, `oppo_trde_tp`, `fr_ord_no` |
| `ust21160` | 미국주식 예수금 상세 | (없음) |
| `ust21170` | 미국주식 당일 종목별 실현손익 | `fc_krw_tp` |
| `ust21180` | 미국주식 기간별 주문내역 | `strt_dt`, `end_dt`, `slby_tp`, `stex_tp`, `stk_cd`, `oppo_trde_tp` |
| `ust21510` | 미국주식 당일 주문체결 확인 | `slby_tp`, `stex_tp`, `stk_cd` |
| `ust21530` | 미국주식 실현손익 | `strt_dt`, `end_dt`, `fc_krw_tp` |
| `ust21610` | 미국주식 당일매매 | `base_dt`, `qry_tp`, `fc_krw_tp` |
| `ust21620` | 미국주식 당일매매정리 | `stex_tp`, `stk_cd`, `fc_krw_tp` |
| `ust21630` | 미국주식 당일 실현손익 | `stex_tp`, `stk_cd`, `fc_krw_tp` |
| `ust21640` | 미국주식 일별 종목별 실현손익 | `stex_tp`, `stk_cd`, `cntr_dt`, `fc_krw_tp` |
| `ust21650` | 미국주식 기간별 수익률 현황 | `fr_dt`, `to_dt` |
| `ust21660` | 미국주식 일별 실현손익 | `strt_dt`, `end_dt` |
| `ust21661` | 미국주식 월별 실현손익 | `strt_dt`, `end_dt` |

## 미국 종목정보 — `POST /api/us/stkinfo` (34개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa10098` | 미국주식 거래소구분 조회 | `stk_cd` |
| `usa10099` | 미국주식 종목리스트 | `stex_tp` |
| `usa10100` | 미국주식 종목 조회 | `stex_tp`, `stk_cd` |
| `usa10101` | 미국주식 업종리스트 | `gubun` |
| `usa10102` | 미국지수 리스트 | `index_qry_tp` |
| `usa10103` | 미국주식 종목메모 조회 | `input_list` |
| `usa10104` | 미국 ETF,ETN 리스트  | `stex_tp` |
| `usa10105` | 미국 ETF 카테고리 리스트 | `gubun` |
| `usa20520` | 미국주식 거래량급등락(주식/업종) | `stex_tp`, `inds_cd`, `tm`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa20521` | 미국주식 거래량급등락(ETF) | `stex_tp`, `tm`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa20570` | 미국주식 가격대별주가(주식/업종) | `stex_tp`, `stk_tp`, `stk_cnd`, `inds_cd`, `trde_qty_tp`, `pric_cnd1`, `pric_cnd2`, `trde_prica_cnd` |
| `usa20571` | 미국주식 가격대별주가(ETF) | `stex_tp`, `stk_cnd`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `pric_cnd1`, `pric_cnd2`, `trde_prica_cnd` |
| `usa20930` | 미국주식 가격급등락(주식/업종) | `stex_tp`, `stk_tp`, `inds_cd`, `stk_cnd`, `flu_tp`, `tm_tp`, `tm`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd` |
| `usa20931` | 미국주식 가격급등락(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `flu_tp`, `tm_tp`, `tm`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd` |
| `usa20932` | 미국주식 가격급등락(관심종목) | `stex_tp`, `stk_cd`, `flu_tp`, `tm_tp`, `tm`, `stk_cnd`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd` |
| `usa20970` | 미국주식 고가/저가 접근(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `high_low_tp`, `alacc_rt`, `stk_cnd`, `pric_cnd_st`, `pric_cnd_ed`, `trde_pric_cnd_st`, `trde_qty_cnd_fr` |
| `usa20971` | 미국주식 고가/저가 접근(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `high_low_tp`, `alacc_rt`, `stk_cnd`, `pric_cnd_st`, `pric_cnd_ed`, `trde_pric_cnd_st`, `trde_qty_cnd_fr` |
| `usa20972` | 미국주식 고가/저가 접근(관심종목) | `stex_tp`, `stk_cd`, `high_low_tp`, `alacc_rt`, `stk_cnd`, `pric_cnd_st`, `pric_cnd_ed`, `trde_pric_cnd_st`, `trde_qty_cnd_fr` |
| `usa23400` | 미국주식 거래량갱신(주식/업종) | `stex_tp`, `stk_cd`, `trde_qty_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `dt_tp` |
| `usa23401` | 미국주식 거래량갱신(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `dt_tp` |
| `usa23402` | 미국주식 거래량갱신(관심종목) | `stex_tp`, `stk_cd`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `dt_tp` |
| `usa24100` | 미국주식 신고가/신저가(주식/업종) | `stex_tp`, `stk_tp`, `inds_cd`, `stk_cnd`, `ntl_tp`, `high_low_tp`, `dt`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd` |
| `usa24101` | 미국주식 신고가/신저가(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `ntl_tp`, `high_low_tp`, `dt`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd` |
| `usa24140` | 미국주식 갭상승/갭하락(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `sort_tp`, `updown_tp`, `alacc_rt`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa24141` | 미국주식 갭상승/갭하락(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `sort_tp`, `updown_tp`, `alacc_rt`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa24210` | 미국주식 잔량률급증(주식/업종) | `stex_tp`, `inds_cd`, `rt_tp`, `stk_tp`, `tm`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24211` | 미국주식 잔량률급증(ETF) | `stex_tp`, `rt_tp`, `etf_cat1`, `etf_cat2`, `tm`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24220` | 미국주식 매물대집중(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `dt`, `prps_cnctr_rt`, `cond`, `prpscnt`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24221` | 미국주식 매물대집중(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `dt`, `prps_cnctr_rt`, `cond`, `prpscnt`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa26410` | 미국주식 연도별 등락률(종목) | `stex_tp`, `stk_cd` |
| `usa26411` | 미국주식 연도별 업종별 종목등락률 | `inds_cd`, `srch_yr` |
| `usa26412` | 미국주식 연도별 ETF 카테고리별 종목등락률 | `etf_cat1`, `etf_cat2`, `srch_yr` |
| `usa26413` | 미국주식 연도별 등락률(업종) | `inds_cd` |
| `usa26414` | 미국주식 연도별 등락률(ETF) | `etf_cat1`, `etf_cat2` |

## 미국 시세 — `POST /api/us/mrkcond` (5개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa20100` | 미국주식 현재가 종목정보 | `stex_tp`, `stk_cd` |
| `usa20101` | 미국주식 현재가 10호가 | `stex_tp`, `stk_cd` |
| `usa20150` | 미국주식 상세 체결내역 | `stex_tp`, `stk_cd` |
| `usa20151` | 미국주식 일별 체결내역 | `stex_tp`, `stk_cd`, `base_dt` |
| `usa20590` | 미국주식 일별주가 | `stex_tp`, `stk_cd`, `base_dt` |

## 미국 차트 — `POST /api/us/chart` (7개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa06010` | 미국주식 틱 차트 | `stex_tp`, `stk_cd`, `tic_scope`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06011` | 미국주식 분 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `tic_scope`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06012` | 미국주식 일 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06013` | 미국주식 주 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06014` | 미국주식 월 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06015` | 미국주식 년 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `upd_stkpc_tp`, `exrt_appl_tp` |
| `usa06016` | 미국주식 분기 차트 | `stex_tp`, `stk_cd`, `strt_dt`, `upd_stkpc_tp`, `exrt_appl_tp` |

## 미국 순위정보 — `POST /api/us/rkinfo` (35개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa01980` | 미국주식 실시간 종목 조회 순위 | `svc_type` |
| `usa01990` | 미국주식 관심종목 등록 상위 | `dt_unit_tp`, `stk_tp` |
| `usa20510` | 미국주식 기간별 등락률상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `stk_cnd`, `tm`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa20511` | 미국주식 기간별 등락률상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `tm`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa20512` | 미국주식 기간별 등락률상위(관심종목) | `stex_tp`, `stk_cd`, `tm`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20530` | 미국주식 당일 거래량 상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `trde_qty_tp`, `qry_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20531` | 미국주식 당일 거래량 상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `qry_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20540` | 미국주식 당일 거래대금 상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20541` | 미국주식 당일 거래대금 상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20550` | 미국주식 시가총액상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20551` | 미국주식 시가총액상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa20880` | 키움 거래 상위 종목(미국주식) | `qry_tp`, `dt_unit_tp` |
| `usa20881` | 키움 거래 상위 종목(미국 ETF) | `qry_tp`, `dt_unit_tp` |
| `usa20910` | 미국주식 전일대비 등락률상위(주식/업종) | `stex_tp`, `inds_cd`, `inds_cls_tp`, `sort_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa20911` | 미국주식 전일대비 등락률상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `sort_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa20920` | 미국주식 시가대비 등락률상위(주식/업종) | `stex_tp`, `inds_cd`, `trde_qty_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `sort_tp` |
| `usa20921` | 미국주식 시가대비 등락률상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `sort_tp` |
| `usa20922` | 미국주식 시가대비 등락률상위(관심종목) | `stex_tp`, `stk_cd`, `sort_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `trde_qty_tp` |
| `usa20940` | 미국주식 누적 등락률 상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `sort_tp`, `pric_cnd1`, `pric_cnd2`, `base_dt`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa20941` | 미국주식 누적 등락률 상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `sort_tp`, `pric_cnd1`, `pric_cnd2`, `base_dt`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa20960` | 미국주식 전일 거래상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `qry_tp` |
| `usa20961` | 미국주식 전일 거래상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `qry_tp` |
| `usa24110` | 미국주식 최고최저가대비 상승하락(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `sort_tp`, `dt_tp`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24111` | 미국주식 최고최저가대비 상승하락(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `sort_tp`, `dt_tp`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24120` | 미국주식 특정일자 상승/하락 (주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd`, `base_dt`, `sort_tp` |
| `usa24121` | 미국주식 특정일자 상승/하락(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd`, `base_dt`, `sort_tp` |
| `usa24150` | 미국주식 회전율 상위(주식/업종) | `stex_tp`, `inds_cd`, `trde_qty_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa24151` | 미국주식 회전율 상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd` |
| `usa24160` | 미국주식 연속상승/하락 순위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `sort_tp` |
| `usa24161` | 미국주식 연속상승/하락 순위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `sort_tp` |
| `usa24162` | 미국주식 연속상승/하락 순위(관심종목) | `stex_tp`, `stk_cd`, `trde_qty_tp`, `stk_cnd`, `pric_cnd`, `trde_prica_cnd`, `sort_tp` |
| `usa24200` | 미국주식 호가잔량상위(주식/업종) | `stex_tp`, `inds_cd`, `stk_tp`, `sort_tp`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24201` | 미국주식 호가잔량상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `sort_tp`, `stk_cnd`, `trde_qty_tp`, `pric_cnd`, `trde_prica_cnd` |
| `usa24290` | 미국주식 주간거래 괴리율 상위(주식/업종) | `stex_tp`, `inds_cd`, `inds_cls_tp`, `stk_tp`, `stk_cnd`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd`, `sort_tp` |
| `usa24291` | 미국주식 주간거래 괴리율 상위(ETF) | `stex_tp`, `etf_cat1`, `etf_cat2`, `stk_cnd`, `pric_cnd`, `trde_qty_tp`, `trde_prica_cnd`, `sort_tp` |

## 미국 업종 — `POST /api/us/sect` (2개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa23000` | 미국주식 업종별 기간별 수익률 조회 | `stex_tp`, `inds_cd` |
| `usa23100` | 미국주식 업종별 등락률 상위/하위 조회 | `stex_tp`, `sort_tp`, `inds_cd` |

## 미국 환전/환율 — `POST /api/us/exchange` (3개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ust31300` | 환전 예상 금액 조회 | `exch_tp`, `fc_exmn_amt` |
| `ust31301` | 환율 조회 | `exch_tp` |
| `ust31302` | 환전 신청 | `exch_tp`, `fc_exmn_amt` |

## 미국 투자정보 — `POST /api/us/invtinfo` (1개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa24300` | 미국주식 리서치(미국주식/ETF) | `qry_tp` |

## 미국 관심종목 — `POST /api/us/watchlist` (2개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `usa20200` | 미국주식 관심종목 그룹 리스트 조회 | (없음) |
| `usa20201` | 미국주식 관심종목 그룹 상세 조회 | `arn_grp_id` |
