# 국내주식 API 카탈로그

> 자동 생성 문서 — `scripts/build_reference.py` 로 재생성. 요청/응답 필드 전체는 `python scripts/kiwoom_spec.py show <apiId>` 로 확인.

국내 주식·금현물 REST API. WebSocket(실시간·조건검색)은 `realtime.md` 참고.
총 187개 API. 모든 호출은 `POST` + JSON, `api-id` 헤더로 TR을 구분한다.


## 국내 주문 (현물/금현물) — `POST /api/dostk/ordr` (8개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `kt10000` | 주식 매수주문 | `dmst_stex_tp`, `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp`, `cond_uv` |
| `kt10001` | 주식 매도주문 | `dmst_stex_tp`, `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp`, `cond_uv` |
| `kt10002` | 주식 정정주문 | `dmst_stex_tp`, `orig_ord_no`, `stk_cd`, `mdfy_qty`, `mdfy_uv`, `mdfy_cond_uv` |
| `kt10003` | 주식 취소주문 | `dmst_stex_tp`, `orig_ord_no`, `stk_cd`, `cncl_qty` |
| `kt50000` | 금현물 매수주문 | `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp` |
| `kt50001` | 금현물 매도주문 | `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp` |
| `kt50002` | 금현물 정정주문 | `stk_cd`, `orig_ord_no`, `mdfy_qty`, `mdfy_uv` |
| `kt50003` | 금현물 취소주문 | `orig_ord_no`, `stk_cd`, `cncl_qty` |

## 국내 신용 주문 — `POST /api/dostk/crdordr` (4개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `kt10006` | 신용 매수주문 | `dmst_stex_tp`, `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp`, `cond_uv` |
| `kt10007` | 신용 매도주문 | `dmst_stex_tp`, `stk_cd`, `ord_qty`, `ord_uv`, `trde_tp`, `crd_deal_tp`, `crd_loan_dt`, `cond_uv` |
| `kt10008` | 신용 정정주문 | `dmst_stex_tp`, `orig_ord_no`, `stk_cd`, `mdfy_qty`, `mdfy_uv`, `mdfy_cond_uv` |
| `kt10009` | 신용 취소주문 | `dmst_stex_tp`, `orig_ord_no`, `stk_cd`, `cncl_qty` |

## 국내 계좌 (잔고/예수금/손익/미체결) — `POST /api/dostk/acnt` (33개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka00001` | 계좌번호조회 | (없음) |
| `ka01690` | 일별잔고수익률 | `qry_dt` |
| `ka10072` | 일자별종목별실현손익요청_일자 | `stk_cd`, `strt_dt` |
| `ka10073` | 일자별종목별실현손익요청_기간 | `stk_cd`, `strt_dt`, `end_dt` |
| `ka10074` | 일자별실현손익요청 | `strt_dt`, `end_dt` |
| `ka10075` | 미체결요청 | `all_stk_tp`, `trde_tp`, `stk_cd`, `stex_tp` |
| `ka10076` | 체결요청 | `stk_cd`, `qry_tp`, `sell_tp`, `ord_no`, `stex_tp` |
| `ka10077` | 당일실현손익상세요청 | `stk_cd` |
| `ka10085` | 계좌수익률요청 | `stex_tp` |
| `ka10088` | 미체결 분할주문 상세 | `ord_no` |
| `ka10170` | 당일매매일지요청 | `base_dt`, `ottks_tp`, `ch_crd_tp` |
| `kt00001` | 예수금상세현황요청 | `qry_tp` |
| `kt00002` | 일별추정예탁자산현황요청 | `start_dt`, `end_dt` |
| `kt00003` | 추정자산조회요청 | `qry_tp` |
| `kt00004` | 계좌평가현황요청 | `qry_tp`, `dmst_stex_tp` |
| `kt00005` | 체결잔고요청 | `dmst_stex_tp` |
| `kt00007` | 계좌별주문체결내역상세요청 | `ord_dt`, `qry_tp`, `stk_bond_tp`, `sell_tp`, `stk_cd`, `fr_ord_no`, `dmst_stex_tp` |
| `kt00008` | 계좌별익일결제예정내역요청 | `strt_dcd_seq` |
| `kt00009` | 계좌별주문체결현황요청 | `ord_dt`, `stk_bond_tp`, `mrkt_tp`, `sell_tp`, `qry_tp`, `stk_cd`, `fr_ord_no`, `dmst_stex_tp` |
| `kt00010` | 주문인출가능금액요청 | `io_amt`, `stk_cd`, `trde_tp`, `trde_qty`, `uv`, `exp_buy_unp` |
| `kt00011` | 증거금율별주문가능수량조회요청 | `stk_cd`, `uv` |
| `kt00012` | 신용보증금율별주문가능수량조회요청 | `stk_cd`, `uv` |
| `kt00013` | 증거금세부내역조회요청 | (없음) |
| `kt00015` | 위탁종합거래내역요청 | `strt_dt`, `end_dt`, `tp`, `stk_cd`, `crnc_cd`, `gds_tp`, `frgn_stex_code`, `dmst_stex_tp`, `qry_sort_tp` |
| `kt00016` | 일별계좌수익률상세현황요청 | `fr_dt`, `to_dt` |
| `kt00017` | 계좌별당일현황요청 | (없음) |
| `kt00018` | 계좌평가잔고내역요청 | `qry_tp`, `dmst_stex_tp` |
| `kt50020` | 금현물 잔고확인 | (없음) |
| `kt50021` | 금현물 예수금 | (없음) |
| `kt50030` | 금현물 주문체결전체조회 | `ord_dt`, `qry_tp`, `mrkt_deal_tp`, `stk_bond_tp`, `slby_tp`, `stk_cd`, `fr_ord_no`, `dmst_stex_tp` |
| `kt50031` | 금현물 주문체결조회 | `ord_dt`, `qry_tp`, `stk_bond_tp`, `sell_tp`, `stk_cd`, `fr_ord_no`, `dmst_stex_tp` |
| `kt50032` | 금현물 거래내역조회 | `strt_dt`, `end_dt`, `tp`, `stk_cd` |
| `kt50075` | 금현물 미체결조회 | `ord_dt`, `qry_tp`, `mrkt_deal_tp`, `stk_bond_tp`, `sell_tp`, `stk_cd`, `fr_ord_no`, `dmst_stex_tp` |

## 국내 종목정보 — `POST /api/dostk/stkinfo` (32개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka00198` | 실시간종목조회순위 | `qry_tp` |
| `ka10001` | 주식기본정보요청 | `stk_cd` |
| `ka10002` | 주식거래원요청 | `stk_cd` |
| `ka10003` | 체결정보요청 | `stk_cd` |
| `ka10013` | 신용매매동향요청 | `stk_cd`, `dt`, `qry_tp` |
| `ka10015` | 일별거래상세요청 | `stk_cd`, `strt_dt` |
| `ka10016` | 신고저가요청 | `mrkt_tp`, `ntl_tp`, `high_low_close_tp`, `stk_cnd`, `trde_qty_tp`, `crd_cnd`, `updown_incls`, `dt`, `stex_tp` |
| `ka10017` | 상하한가요청 | `mrkt_tp`, `updown_tp`, `sort_tp`, `stk_cnd`, `trde_qty_tp`, `crd_cnd`, `trde_gold_tp`, `stex_tp` |
| `ka10018` | 고저가근접요청 | `high_low_tp`, `alacc_rt`, `mrkt_tp`, `trde_qty_tp`, `stk_cnd`, `crd_cnd`, `stex_tp` |
| `ka10019` | 가격급등락요청 | `mrkt_tp`, `flu_tp`, `tm_tp`, `tm`, `trde_qty_tp`, `stk_cnd`, `crd_cnd`, `pric_cnd`, `updown_incls`, `stex_tp` |
| `ka10024` | 거래량갱신요청 | `mrkt_tp`, `cycle_tp`, `trde_qty_tp`, `stex_tp` |
| `ka10025` | 매물대집중요청 | `mrkt_tp`, `prps_cnctr_rt`, `cur_prc_entry`, `prpscnt`, `cycle_tp`, `stex_tp` |
| `ka10026` | 고저PER요청 | `pertp`, `stex_tp` |
| `ka10028` | 시가대비등락률요청 | `sort_tp`, `trde_qty_cnd`, `mrkt_tp`, `updown_incls`, `stk_cnd`, `crd_cnd`, `trde_prica_cnd`, `flu_cnd`, `stex_tp` |
| `ka10043` | 거래원매물대분석요청 | `stk_cd`, `strt_dt`, `end_dt`, `qry_dt_tp`, `pot_tp`, `dt`, `sort_base`, `mmcm_cd`, `stex_tp` |
| `ka10052` | 거래원순간거래량요청 | `mmcm_cd`, `stk_cd`, `mrkt_tp`, `qty_tp`, `pric_tp`, `stex_tp` |
| `ka10054` | 변동성완화장치발동종목요청 | `mrkt_tp`, `bf_mkrt_tp`, `stk_cd`, `motn_tp`, `skip_stk`, `trde_qty_tp`, `min_trde_qty`, `max_trde_qty`, `trde_prica_tp`, `min_trde_prica`, `max_trde_prica`, `motn_drc`, `stex_tp` |
| `ka10055` | 당일전일체결량요청 | `stk_cd`, `tdy_pred` |
| `ka10058` | 투자자별일별매매종목요청 | `strt_dt`, `end_dt`, `trde_tp`, `mrkt_tp`, `invsr_tp`, `stex_tp` |
| `ka10059` | 종목별투자자기관별요청 | `dt`, `stk_cd`, `amt_qty_tp`, `trde_tp`, `unit_tp` |
| `ka10061` | 종목별투자자기관별합계요청 | `stk_cd`, `strt_dt`, `end_dt`, `amt_qty_tp`, `trde_tp`, `unit_tp` |
| `ka10084` | 당일전일체결요청 | `stk_cd`, `tdy_pred`, `tic_min`, `tm` |
| `ka10095` | 지정종목 정보요청 | `stk_cd` |
| `ka10099` | 종목정보 리스트 | `mrkt_tp` |
| `ka10100` | 종목정보 조회 | `stk_cd` |
| `ka10101` | 업종코드 리스트 | `mrkt_tp` |
| `ka10102` | 회원사 리스트 | (없음) |
| `ka10103` | 종목메모 조회 | `input_list` |
| `ka90003` | 프로그램순매수상위50요청 | `trde_upper_tp`, `amt_qty_tp`, `mrkt_tp`, `stex_tp` |
| `ka90004` | 종목별프로그램매매현황요청 | `dt`, `mrkt_tp`, `stex_tp` |
| `kt20016` | 신용융자 가능종목요청 | `crd_stk_grde_tp`, `mrkt_deal_tp`, `stk_cd` |
| `kt20017` | 신용융자 가능문의 | `stk_cd` |

## 국내 시세 (호가/체결/일별) — `POST /api/dostk/mrkcond` (25개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10004` | 주식호가요청 | `stk_cd` |
| `ka10005` | 주식일주월시분요청 | `stk_cd` |
| `ka10006` | 주식시분요청 | `stk_cd` |
| `ka10007` | 시세표성정보요청 | `stk_cd` |
| `ka10011` | 신주인수권전체시세요청 | `newstk_recvrht_tp` |
| `ka10044` | 일별기관매매종목요청 | `strt_dt`, `end_dt`, `trde_tp`, `mrkt_tp`, `stex_tp` |
| `ka10045` | 종목별기관매매추이요청 | `stk_cd`, `strt_dt`, `end_dt`, `orgn_prsm_unp_tp`, `for_prsm_unp_tp` |
| `ka10046` | 체결강도추이시간별요청 | `stk_cd` |
| `ka10047` | 체결강도추이일별요청 | `stk_cd` |
| `ka10063` | 장중투자자별매매요청 | `mrkt_tp`, `amt_qty_tp`, `invsr`, `frgn_all`, `smtm_netprps_tp`, `stex_tp` |
| `ka10066` | 장마감후투자자별매매요청 | `mrkt_tp`, `amt_qty_tp`, `trde_tp`, `stex_tp` |
| `ka10078` | 증권사별종목매매동향요청 | `mmcm_cd`, `stk_cd`, `strt_dt`, `end_dt` |
| `ka10086` | 일별주가요청 | `stk_cd`, `qry_dt`, `indc_tp` |
| `ka10087` | 시간외단일가요청 | `stk_cd` |
| `ka50010` | 금현물체결추이 | `stk_cd` |
| `ka50012` | 금현물일별추이 | `stk_cd`, `base_dt` |
| `ka50087` | 금현물예상체결 | `stk_cd` |
| `ka50100` | 금현물 시세정보 | `stk_cd` |
| `ka50101` | 금현물 호가 | `stk_cd`, `tic_scope` |
| `ka90005` | 프로그램매매추이요청 시간대별 | `date`, `amt_qty_tp`, `mrkt_tp`, `min_tic_tp`, `stex_tp` |
| `ka90006` | 프로그램매매차익잔고추이요청 | `date`, `stex_tp` |
| `ka90007` | 프로그램매매누적추이요청 | `date`, `amt_qty_tp`, `mrkt_tp`, `stex_tp` |
| `ka90008` | 종목시간별프로그램매매추이요청 | `amt_qty_tp`, `stk_cd`, `date` |
| `ka90010` | 프로그램매매추이요청 일자별 | `date`, `amt_qty_tp`, `mrkt_tp`, `min_tic_tp`, `stex_tp` |
| `ka90013` | 종목일별프로그램매매추이요청 | `amt_qty_tp`, `stk_cd`, `date` |

## 국내 차트 (틱/분/일/주/월/년) — `POST /api/dostk/chart` (21개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10060` | 종목별투자자기관별차트요청 | `dt`, `stk_cd`, `amt_qty_tp`, `trde_tp`, `unit_tp` |
| `ka10064` | 장중투자자별매매차트요청 | `mrkt_tp`, `amt_qty_tp`, `trde_tp`, `stk_cd` |
| `ka10079` | 주식틱차트조회요청 | `stk_cd`, `tic_scope`, `upd_stkpc_tp` |
| `ka10080` | 주식분봉차트조회요청 | `stk_cd`, `tic_scope`, `upd_stkpc_tp`, `base_dt` |
| `ka10081` | 주식일봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka10082` | 주식주봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka10083` | 주식월봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka10094` | 주식년봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka20004` | 업종틱차트조회요청 | `inds_cd`, `tic_scope` |
| `ka20005` | 업종분봉조회요청 | `inds_cd`, `tic_scope`, `base_dt` |
| `ka20006` | 업종일봉조회요청 | `inds_cd`, `base_dt` |
| `ka20007` | 업종주봉조회요청 | `inds_cd`, `base_dt` |
| `ka20008` | 업종월봉조회요청 | `inds_cd`, `base_dt` |
| `ka20019` | 업종년봉조회요청 | `inds_cd`, `base_dt` |
| `ka50079` | 금현물틱차트조회요청 | `stk_cd`, `tic_scope`, `upd_stkpc_tp` |
| `ka50080` | 금현물분봉차트조회요청 | `stk_cd`, `tic_scope`, `upd_stkpc_tp` |
| `ka50081` | 금현물일봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka50082` | 금현물주봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka50083` | 금현물월봉차트조회요청 | `stk_cd`, `base_dt`, `upd_stkpc_tp` |
| `ka50091` | 금현물당일틱차트조회요청 | `stk_cd`, `tic_scope` |
| `ka50092` | 금현물당일분봉차트조회요청 | `stk_cd`, `tic_scope` |

## 국내 순위정보 — `POST /api/dostk/rkinfo` (26개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka00190` | 대량체결상위 | `mrkt_tp`, `sort_tp`, `case_pric_tp`, `trde_prica_tp`, `stk_tp`, `trde_qty_tp`, `crd_tp`, `pric_tp`, `mac_tp`, `price_cnd_tp`, `price_cnd_min`, `price_cnd_max`, `price_cnd_min_sign`, `price_cnd_max_sign`, `mac_cnd_tp`, `mac_cnd_min`, `mac_cnd_max`, `mac_cnd_min_sign`, `mac_cnd_max_sign`, `trde_prica_cnd_tp`, `trde_prica_cnd_min`, `trde_prica_cnd_max`, `trde_prica_cnd_min_sgin`, `trde_prica_cnd_max_sign`, `trde_qty_cnd_tp`, `trde_qty_cnd_min`, `trde_qty_cnd_max`, `trde_qty_cnd_min_sign`, `trde_qty_cnd_max_sign`, `stex_tp` |
| `ka00196` | 체결금액대별매매비중 | `stk_cd` |
| `ka04196` | 수익률상위고객매매상세 | `stk_cd`, `st_dt`, `ed_dt`, `qry_tp`, `stex_tp` |
| `ka10020` | 호가잔량상위요청 | `mrkt_tp`, `sort_tp`, `trde_qty_tp`, `stk_cnd`, `crd_cnd`, `stex_tp` |
| `ka10021` | 호가잔량급증요청 | `mrkt_tp`, `trde_tp`, `sort_tp`, `tm_tp`, `trde_qty_tp`, `stk_cnd`, `stex_tp` |
| `ka10022` | 잔량율급증요청 | `mrkt_tp`, `rt_tp`, `tm_tp`, `trde_qty_tp`, `stk_cnd`, `stex_tp` |
| `ka10023` | 거래량급증요청 | `mrkt_tp`, `sort_tp`, `tm_tp`, `trde_qty_tp`, `tm`, `stk_cnd`, `pric_tp`, `stex_tp` |
| `ka10027` | 전일대비등락률상위요청 | `mrkt_tp`, `sort_tp`, `trde_qty_cnd`, `stk_cnd`, `crd_cnd`, `updown_incls`, `pric_cnd`, `trde_prica_cnd`, `stex_tp` |
| `ka10029` | 예상체결등락률상위요청 | `mrkt_tp`, `sort_tp`, `trde_qty_cnd`, `stk_cnd`, `crd_cnd`, `pric_cnd`, `stex_tp` |
| `ka10030` | 당일거래량상위요청 | `mrkt_tp`, `sort_tp`, `mang_stk_incls`, `crd_tp`, `trde_qty_tp`, `pric_tp`, `trde_prica_tp`, `mrkt_open_tp`, `stex_tp` |
| `ka10031` | 전일거래량상위요청 | `mrkt_tp`, `qry_tp`, `rank_strt`, `rank_end`, `stex_tp` |
| `ka10032` | 거래대금상위요청 | `mrkt_tp`, `mang_stk_incls`, `stex_tp` |
| `ka10033` | 신용비율상위요청 | `mrkt_tp`, `trde_qty_tp`, `stk_cnd`, `updown_incls`, `crd_cnd`, `stex_tp` |
| `ka10034` | 외인기간별매매상위요청 | `mrkt_tp`, `trde_tp`, `dt`, `stex_tp` |
| `ka10035` | 외인연속순매매상위요청 | `mrkt_tp`, `trde_tp`, `base_dt_tp`, `stex_tp` |
| `ka10036` | 외인한도소진율증가상위 | `mrkt_tp`, `dt`, `stex_tp` |
| `ka10037` | 외국계창구매매상위요청 | `mrkt_tp`, `dt`, `trde_tp`, `sort_tp`, `stex_tp` |
| `ka10038` | 종목별증권사순위요청 | `stk_cd`, `strt_dt`, `end_dt`, `qry_tp`, `dt` |
| `ka10039` | 증권사별매매상위요청 | `mmcm_cd`, `trde_qty_tp`, `trde_tp`, `dt`, `stex_tp` |
| `ka10040` | 당일주요거래원요청 | `stk_cd` |
| `ka10042` | 순매수거래원순위요청 | `stk_cd`, `strt_dt`, `end_dt`, `qry_dt_tp`, `pot_tp`, `dt`, `sort_base` |
| `ka10053` | 당일상위이탈원요청 | `stk_cd` |
| `ka10062` | 동일순매매순위요청 | `strt_dt`, `end_dt`, `mrkt_tp`, `trde_tp`, `sort_cnd`, `unit_tp`, `stex_tp` |
| `ka10065` | 장중투자자별매매상위요청 | `trde_tp`, `mrkt_tp`, `orgn_tp`, `amt_qty_tp` |
| `ka10098` | 시간외단일가등락율순위요청 | `mrkt_tp`, `sort_base`, `stk_cnd`, `trde_qty_cnd`, `crd_cnd`, `trde_prica` |
| `ka90009` | 외국인기관매매상위요청 | `mrkt_tp`, `amt_qty_tp`, `qry_dt_tp`, `date`, `stex_tp` |

## 국내 업종 — `POST /api/dostk/sect` (6개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10010` | 업종프로그램요청 | `stk_cd` |
| `ka10051` | 업종별투자자순매수요청 | `mrkt_tp`, `amt_qty_tp`, `base_dt`, `stex_tp` |
| `ka20001` | 업종현재가요청 | `mrkt_tp`, `inds_cd` |
| `ka20002` | 업종별주가요청 | `mrkt_tp`, `inds_cd`, `stex_tp` |
| `ka20003` | 전업종지수요청 | `inds_cd` |
| `ka20009` | 업종현재가일별요청 | `mrkt_tp`, `inds_cd` |

## 국내 테마 — `POST /api/dostk/thme` (2개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka90001` | 테마그룹별요청 | `qry_tp`, `stk_cd`, `date_tp`, `thema_nm`, `flu_pl_amt_tp`, `stex_tp` |
| `ka90002` | 테마구성종목요청 | `date_tp`, `thema_grp_cd`, `stex_tp` |

## 국내 ETF — `POST /api/dostk/etf` (9개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka40001` | ETF수익율요청 | `stk_cd`, `etfobjt_idex_cd`, `dt` |
| `ka40002` | ETF종목정보요청 | `stk_cd` |
| `ka40003` | ETF일별추이요청 | `stk_cd` |
| `ka40004` | ETF전체시세요청 | `txon_type`, `navpre`, `mngmcomp`, `txon_yn`, `trace_idex`, `stex_tp` |
| `ka40006` | ETF시간대별추이요청 | `stk_cd` |
| `ka40007` | ETF시간대별체결요청 | `stk_cd` |
| `ka40008` | ETF일자별체결요청 | `stk_cd` |
| `ka40009` | ETF시간대별NAV현황 | `stk_cd` |
| `ka40010` | ETF시간대별수급현황 | `stk_cd` |

## 국내 ELW — `POST /api/dostk/elw` (11개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10048` | ELW일별민감도지표요청 | `stk_cd` |
| `ka10050` | ELW민감도지표요청 | `stk_cd` |
| `ka30001` | ELW가격급등락요청 | `flu_tp`, `tm_tp`, `tm`, `trde_qty_tp`, `isscomp_cd`, `bsis_aset_cd`, `rght_tp`, `lpcd`, `trde_end_elwskip` |
| `ka30002` | 거래원별ELW순매매상위요청 | `isscomp_cd`, `trde_qty_tp`, `trde_tp`, `dt`, `trde_end_elwskip` |
| `ka30003` | ELWLP보유일별추이요청 | `bsis_aset_cd`, `base_dt` |
| `ka30004` | ELW괴리율요청 | `isscomp_cd`, `bsis_aset_cd`, `rght_tp`, `lpcd`, `trde_end_elwskip` |
| `ka30005` | ELW조건검색요청 | `isscomp_cd`, `bsis_aset_cd`, `rght_tp`, `lpcd`, `sort_tp` |
| `ka30009` | ELW등락율순위요청 | `sort_tp`, `rght_tp`, `trde_end_skip` |
| `ka30010` | ELW잔량순위요청 | `sort_tp`, `rght_tp`, `trde_end_skip` |
| `ka30011` | ELW근접율요청 | `stk_cd` |
| `ka30012` | ELW종목상세정보요청 | `stk_cd` |

## 국내 대차거래 — `POST /api/dostk/slb` (4개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10068` | 대차거래추이요청 | `strt_dt`, `end_dt`, `all_tp` |
| `ka10069` | 대차거래상위10종목요청 | `strt_dt`, `end_dt`, `mrkt_tp` |
| `ka20068` | 대차거래추이요청(종목별) | `strt_dt`, `end_dt`, `all_tp`, `stk_cd` |
| `ka90012` | 대차거래내역요청 | `dt`, `mrkt_tp` |

## 국내 기관/외국인 — `POST /api/dostk/frgnistt` (3개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10008` | 주식외국인종목별매매동향 | `stk_cd` |
| `ka10131` | 기관외국인연속매매현황요청 | `dt`, `strt_dt`, `end_dt`, `mrkt_tp`, `netslmt_tp`, `stk_inds_tp`, `amt_qty_tp`, `stex_tp` |
| `ka52301` | 금현물투자자현황 | (없음) |

## 국내 공매도 — `POST /api/dostk/shsa` (1개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka10014` | 공매도추이요청 | `stk_cd`, `tm_tp`, `strt_dt`, `end_dt` |

## 국내 관심종목 — `POST /api/dostk/watchlist` (2개)

| api-id | 이름 | 요청 파라미터(바디) |
| --- | --- | --- |
| `ka01300` | 관심종목 그룹 리스트 조회 | (없음) |
| `ka01301` | 관심종목 그룹 상세 조회 | `arn_grp_id` |
