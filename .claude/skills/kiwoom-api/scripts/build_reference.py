#!/usr/bin/env python3
"""kiwoom-rest-api-spec.json 에서 reference/*.md 문서를 생성한다.

스펙 JSON이 갱신되면 이 스크립트만 다시 돌리면 된다.

  python scripts/build_reference.py            # ../reference 에 생성
  python scripts/build_reference.py --out DIR
"""
from __future__ import annotations

import argparse
from pathlib import Path

from kiwoom_spec import (body_param_names, clean, depth_of, is_websocket,
                         load, split_io)

GROUP_TITLES = [
    ("/oauth2/token", "인증 - 토큰 발급"),
    ("/oauth2/revoke", "인증 - 토큰 폐기"),
    ("/api/dostk/ordr", "국내 주문 (현물/금현물)"),
    ("/api/dostk/crdordr", "국내 신용 주문"),
    ("/api/dostk/acnt", "국내 계좌 (잔고/예수금/손익/미체결)"),
    ("/api/dostk/stkinfo", "국내 종목정보"),
    ("/api/dostk/mrkcond", "국내 시세 (호가/체결/일별)"),
    ("/api/dostk/chart", "국내 차트 (틱/분/일/주/월/년)"),
    ("/api/dostk/rkinfo", "국내 순위정보"),
    ("/api/dostk/sect", "국내 업종"),
    ("/api/dostk/thme", "국내 테마"),
    ("/api/dostk/etf", "국내 ETF"),
    ("/api/dostk/elw", "국내 ELW"),
    ("/api/dostk/slb", "국내 대차거래"),
    ("/api/dostk/frgnistt", "국내 기관/외국인"),
    ("/api/dostk/shsa", "국내 공매도"),
    ("/api/dostk/watchlist", "국내 관심종목"),
    ("/api/us/ordr", "미국 주문"),
    ("/api/us/acnt", "미국 계좌"),
    ("/api/us/stkinfo", "미국 종목정보"),
    ("/api/us/mrkcond", "미국 시세"),
    ("/api/us/chart", "미국 차트"),
    ("/api/us/rkinfo", "미국 순위정보"),
    ("/api/us/sect", "미국 업종"),
    ("/api/us/exchange", "미국 환전/환율"),
    ("/api/us/invtinfo", "미국 투자정보"),
    ("/api/us/watchlist", "미국 관심종목"),
]

HEADER_NOTE = (
    "> 자동 생성 문서 — `scripts/build_reference.py` 로 재생성. "
    "요청/응답 필드 전체는 `python scripts/kiwoom_spec.py show <apiId>` 로 확인.\n"
)


def catalog_section(apis, url):
    rows = sorted((k, v) for k, v in apis.items() if v["url"] == url)
    lines = []
    lines.append("| api-id | 이름 | 요청 파라미터(바디) |")
    lines.append("| --- | --- | --- |")
    for k, v in rows:
        params = ", ".join("`%s`" % p for p in body_param_names(v)) or "(없음)"
        lines.append("| `%s` | %s | %s |" % (k, v["apiNm"], params))
    return lines


def build_catalog(apis, out: Path, prefix: str, title: str, intro: str):
    lines = ["# " + title, "", HEADER_NOTE, intro, ""]
    total = 0
    for url, label in GROUP_TITLES:
        if not url.startswith(prefix):
            continue
        n = sum(1 for v in apis.values() if v["url"] == url)
        if not n:
            continue
        total += n
        lines.append("## %s — `POST %s` (%d개)" % (label, url, n))
        lines.append("")
        lines += catalog_section(apis, url)
        lines.append("")
    lines.insert(4, "총 %d개 API. 모든 호출은 `POST` + JSON, `api-id` 헤더로 TR을 구분한다.\n" % total)
    out.write_text("\n".join(lines), encoding="utf-8")
    return total


def build_realtime(apis, out: Path):
    ws = {k: v for k, v in apis.items() if is_websocket(v)}
    # 조건검색류(ka1017x, usa202xx)와 실시간 타입(0B, 04, F5 ...) 분리
    cond = {k: v for k, v in ws.items() if k[0].isalpha() and len(k) > 2}
    real = {k: v for k, v in ws.items() if k not in cond}

    lines = ["# WebSocket (실시간 시세 / 조건검색)", "", HEADER_NOTE, ""]
    lines.append("접속: `wss://api.kiwoom.com:10000/api/dostk/websocket` "
                 "(모의 `wss://mockapi.kiwoom.com:10000`), "
                 "미국주식은 `/api/us/websocket`.")
    lines.append("")
    lines.append("스펙 JSON에는 **메시지 페이로드만** 정의되어 있다. "
                 "접속 직후의 LOGIN 핸드셰이크와 PING/PONG 유지 규약은 "
                 "`reference/conventions.md` 의 WebSocket 절 참고.")
    lines.append("")

    lines.append("## 실시간 등록/해지 메시지 (모든 실시간 타입 공통)")
    lines.append("")
    lines.append("```json")
    lines.append('{"trnm":"REG","grp_no":"1","refresh":"1",'
                 '"data":[{"item":["005930"],"type":["0B"]}]}')
    lines.append("```")
    lines.append("")
    lines.append("- `trnm`: `REG` 등록 / `REMOVE` 해지")
    lines.append("- `grp_no`: 그룹번호(4자리) — 그룹 단위로 등록/해지 관리")
    lines.append("- `refresh`: `1` 기존 등록 유지(기본), `0` 기존 등록 해지 후 교체")
    lines.append("- `data[].item`: 종목코드/업종코드 배열 (거래소 구분: `039490`, `039490_NX`, `039490_AL`)")
    lines.append("- `data[].type`: 실시간 타입 코드 배열 (아래 표)")
    lines.append("")
    lines.append("수신 메시지는 `{\"trnm\":\"REAL\",\"data\":[{\"type\":\"0B\",\"name\":...,"
                 "\"item\":\"005930\",\"values\":{\"<FID>\":\"<값>\"}}]}` 형태이고, "
                 "`values` 의 키는 아래 각 타입의 FID 번호다.")
    lines.append("")

    lines.append("## 실시간 타입 목록")
    lines.append("")
    lines.append("| type | 이름 | 시장 | FID 개수 |")
    lines.append("| --- | --- | --- | --- |")
    for k, v in sorted(real.items()):
        fids = [f for f in v["responseIo"] if depth_of(f["itemId"])[0] == 2]
        market = "미국" if "/us/" in v["url"] else "국내"
        lines.append("| `%s` | %s | %s | %d |" % (k, v["apiNm"], market, len(fids)))
    lines.append("")

    lines.append("## 실시간 타입별 FID")
    lines.append("")
    for k, v in sorted(real.items()):
        lines.append("### `%s` %s" % (k, v["apiNm"]))
        lines.append("")
        fids = [f for f in v["responseIo"] if depth_of(f["itemId"])[0] == 2]
        if not fids:
            lines.append("- (FID 정의 없음 — `python scripts/kiwoom_spec.py show %s` 확인)" % k)
        for f in fids:
            _, fid = depth_of(f["itemId"])
            desc = clean(f.get("desc", ""))
            line = "- `%s` %s" % (fid, f.get("itemNm", ""))
            if desc:
                line += " — " + desc
            lines.append(line)
        lines.append("")

    lines.append("## 조건검색 (WebSocket 전용)")
    lines.append("")
    lines.append("| api-id | 이름 | trnm | 요청 필드 |")
    lines.append("| --- | --- | --- | --- |")
    for k, v in sorted(cond.items()):
        trnm = ""
        for f in v["requestIo"]:
            if f["itemId"] == "trnm":
                trnm = clean(f.get("desc", "")).replace(" 고정값", "").replace("고정값", "")
        params = ", ".join("`%s`" % p for p in body_param_names(v))
        lines.append("| `%s` | %s | %s | %s |" % (k, v["apiNm"], trnm.strip(), params))
    lines.append("")
    lines.append("상세는 `python scripts/kiwoom_spec.py show ka10172 --full`.")
    lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    return len(real), len(cond)


def build_errors(errors, out: Path):
    lines = ["# 에러코드", "", HEADER_NOTE, ""]
    lines.append("응답 바디의 `return_code` 가 0이 아니면 `return_msg` 와 함께 아래 코드가 온다.")
    lines.append("")
    lines.append("| 코드 | 메시지 |")
    lines.append("| --- | --- |")
    for e in errors:
        lines.append("| `%s` | %s |" % (e["errCode"], e["errMsg"].replace("|", "\\|")))
    lines.append("")
    lines.append("분류 요약")
    lines.append("")
    lines.append("- `15xx` 요청 형식/필수값/헤더 오류 → 요청 조립 버그")
    lines.append("- `1687` 재귀 호출 제한, `170x` 유량(요청 개수) 초과 → 호출 빈도 제어 필요")
    lines.append("- `19xx` 종목/시장 코드 오류")
    lines.append("- `80xx` 앱키·시크릿·토큰 문제 (`8005` 토큰 무효, `8010` 토큰 발급 IP 불일치)")
    lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    return len(errors)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--spec")
    p.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "reference"))
    args = p.parse_args()
    apis, errors = load(args.spec)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    n1 = build_catalog(
        apis, out / "catalog-domestic.md", "/api/dostk", "국내주식 API 카탈로그",
        "국내 주식·금현물 REST API. WebSocket(실시간·조건검색)은 `realtime.md` 참고.")
    n2 = build_catalog(
        apis, out / "catalog-us.md", "/api/us", "미국주식 API 카탈로그",
        "미국주식 REST API. WebSocket(실시간·조건검색)은 `realtime.md` 참고.")
    n3 = build_catalog(
        apis, out / "catalog-auth.md", "/oauth2", "인증 API",
        "접근토큰 발급/폐기. 이 두 개만 `authorization` 헤더가 필요 없다.")
    r, c = build_realtime(apis, out / "realtime.md")
    ne = build_errors(errors, out / "error-codes.md")
    print("catalog-domestic %d / catalog-us %d / auth %d / realtime %d types + %d cond / errors %d"
          % (n1, n2, n3, r, c, ne))


if __name__ == "__main__":
    main()
