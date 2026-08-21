#!/usr/bin/env python3
"""키움증권 REST/WebSocket API 스펙 조회 CLI.

원본 스펙(kiwoom-rest-api-spec.json, 약 2.4MB)을 컨텍스트에 올리지 않고
필요한 API 항목만 뽑아 읽기 위한 도구.

사용법:
  python kiwoom_spec.py show   ka10081 kt10000      # API 상세(요청/응답 필드 전체)
  python kiwoom_spec.py search 일봉                 # 이름/설명/필드에서 키워드 검색
  python kiwoom_spec.py list   dostk/acnt           # 그룹(URL) 필터 목록
  python kiwoom_spec.py groups                      # 그룹별 개수
  python kiwoom_spec.py errors 8005                 # 에러코드 조회
  python kiwoom_spec.py fields ka10081 --res        # 필드명만 간단히

공통 옵션:
  --spec PATH   스펙 JSON 경로 지정(기본: 상위 디렉터리 자동 탐색, 환경변수 KIWOOM_SPEC)
  --json        결과를 JSON으로 출력(스크립트 연동용)
  --full        show 시 요청/응답 예시를 자르지 않고 전체 출력
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

SPEC_FILENAME = "kiwoom-rest-api-spec.json"
HEADER_ITEMS = {"api-id", "authorization", "cont-yn", "next-key"}


def find_spec(explicit=None):
    if explicit:
        return Path(explicit)
    env = os.environ.get("KIWOOM_SPEC")
    if env:
        return Path(env)
    here = Path(__file__).resolve()
    for parent in here.parents:
        cand = parent / SPEC_FILENAME
        if cand.is_file():
            return cand
    raise SystemExit(
        SPEC_FILENAME + " 을 찾을 수 없습니다. --spec 로 경로를 지정하거나 "
        "KIWOOM_SPEC 환경변수를 설정하세요."
    )


def load(explicit=None):
    """(apis, error_codes) 반환. apis 는 apiId -> entry."""
    path = find_spec(explicit)
    with path.open(encoding="utf-8") as fh:
        raw = json.load(fh)
    apis = {k: v for k, v in raw.items() if isinstance(v, dict) and "apiId" in v}
    return apis, raw.get("errorCodeList", [])


# ---------------------------------------------------------------- helpers

def clean(text):
    """desc 안의 HTML 조각/개행을 한 줄로 정리."""
    if not text:
        return ""
    text = re.sub(r"<\s*br\s*/?\s*>", " / ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def depth_of(item_id):
    """'- - 20' -> (2, '20')"""
    d = 0
    while item_id.startswith("- "):
        d += 1
        item_id = item_id[2:]
    return d, item_id.strip()


def is_websocket(entry):
    return entry.get("url", "").endswith("/websocket")


def is_oauth(entry):
    return entry.get("url", "").startswith("/oauth2")


def split_io(entry):
    """requestIo 를 (헤더, 바디) 로 분리. WebSocket/oauth 는 전부 바디."""
    req = entry.get("requestIo", [])
    if is_websocket(entry) or is_oauth(entry):
        return [], req
    headers = [f for f in req if f["itemId"] in HEADER_ITEMS]
    body = [f for f in req if f["itemId"] not in HEADER_ITEMS]
    return headers, body


def body_param_names(entry):
    _, body = split_io(entry)
    out = []
    for f in body:
        d, name = depth_of(f["itemId"])
        if d == 0:
            out.append(name)
    return out


def field_lines(fields, indent_unit="  "):
    lines = []
    for f in fields:
        d, name = depth_of(f["itemId"])
        typ = f.get("type") or "-"
        length = f.get("length") or ""
        desc = clean(f.get("desc", ""))
        meta = typ + ("(" + length + ")" if length else "")
        line = indent_unit * d + "- `" + name + "` " + f.get("itemNm", "") + " [" + meta + "]"
        if desc:
            line += " — " + desc
        lines.append(line)
    return lines


def trunc(text, limit, full):
    if full or not text or len(text) <= limit:
        return text or ""
    return text[:limit] + "\n... (총 " + str(len(text)) + "자, 전체는 --full)"


# ---------------------------------------------------------------- commands

def cmd_show(args, apis, errors):
    out = []
    for api_id in args.api_id:
        entry = apis.get(api_id)
        if entry is None:
            # 실시간 타입은 대소문자를 구분한다(0G ETF NAV vs 0g 주식종목정보).
            cands = [k for k in apis if k.lower() == api_id.lower()]
            if len(cands) > 1:
                print("[모호] " + api_id + " → 대소문자 구분 필요: " + ", ".join(sorted(cands)),
                      file=sys.stderr)
                continue
            entry = apis.get(cands[0]) if cands else None
        if entry is None:
            print("[없음] " + api_id + " — search 로 이름을 찾아보세요.", file=sys.stderr)
            continue
        if args.json:
            out.append(entry)
            continue
        headers, body = split_io(entry)
        ws = is_websocket(entry)
        print("# " + entry["apiId"] + " " + entry["apiNm"])
        print()
        print("- 설명: " + clean(entry.get("description", "")))
        print("- 호출: " + entry["method"] + " " + entry["domain"] + entry["url"])
        print("- 모의: " + entry["mockDomain"] + entry["url"])
        print("- Content-Type: " + entry["contentType"])
        if not ws and not is_oauth(entry):
            print("- 필수 헤더: api-id: " + entry["apiId"] + ", authorization: Bearer <token>")
        if ws:
            print("- 전송: WebSocket JSON 메시지 (HTTP 아님)")
        print()
        if headers:
            print("## 요청 헤더")
            print("\n".join(field_lines(headers)))
            print()
        print("## 요청 " + ("메시지" if ws else "바디"))
        print("\n".join(field_lines(body)) or "- (없음)")
        print()
        print("## 응답")
        print("\n".join(field_lines(entry.get("responseIo", []))) or "- (없음)")
        print()
        print("## 요청 예시")
        print("```json")
        print(trunc(entry.get("requestExample", ""), 1500, args.full))
        print("```")
        print()
        print("## 응답 예시")
        print("```json")
        print(trunc(entry.get("responseExample", ""), 2000, args.full))
        print("```")
        print()
    if args.json:
        print(json.dumps(out, ensure_ascii=False, indent=2))


def cmd_search(args, apis, errors):
    kw = args.keyword.lower()
    scope = args.scope
    hits = []
    for k, v in apis.items():
        why = None
        if scope in ("all", "id") and kw in k.lower():
            why = "id"
        if not why and scope in ("all", "name") and kw in v["apiNm"].lower():
            why = "name"
        if not why and scope in ("all", "desc") and kw in clean(v.get("description", "")).lower():
            why = "desc"
        if not why and scope in ("all", "field"):
            for io_ in ("requestIo", "responseIo"):
                for f in v[io_]:
                    blob = (f["itemId"] + " " + f.get("itemNm", "") + " " + clean(f.get("desc", ""))).lower()
                    if kw in blob:
                        why = ("req:" if io_ == "requestIo" else "res:") + depth_of(f["itemId"])[1]
                        break
                if why:
                    break
        if why:
            hits.append((k, v, why))
    hits.sort(key=lambda t: (t[1]["url"], t[0]))
    if args.json:
        print(json.dumps(
            [{"apiId": k, "apiNm": v["apiNm"], "url": v["url"], "match": w} for k, v, w in hits],
            ensure_ascii=False, indent=2))
        return
    print("'" + args.keyword + "' 검색 결과 " + str(len(hits)) + "건 (scope=" + scope + ")")
    for k, v, w in hits[: args.limit]:
        print("  %-10s %-42s %-24s [%s]" % (k, v["apiNm"], v["url"], w))
    if len(hits) > args.limit:
        print("  ... " + str(len(hits) - args.limit) + "건 더 (--limit 조정)")


def cmd_list(args, apis, errors):
    rows = []
    for k, v in sorted(apis.items(), key=lambda t: (t[1]["url"], t[0])):
        if args.group and args.group not in v["url"]:
            continue
        rows.append((k, v))
    if args.json:
        print(json.dumps([
            {"apiId": k, "apiNm": v["apiNm"], "url": v["url"],
             "params": body_param_names(v)} for k, v in rows],
            ensure_ascii=False, indent=2))
        return
    print(str(len(rows)) + "건")
    for k, v in rows:
        print("  %-10s %-42s %-24s %s" % (k, v["apiNm"], v["url"], ", ".join(body_param_names(v))))


def cmd_groups(args, apis, errors):
    counts = {}
    for v in apis.values():
        counts[v["url"]] = counts.get(v["url"], 0) + 1
    if args.json:
        print(json.dumps(counts, ensure_ascii=False, indent=2))
        return
    for url, c in sorted(counts.items(), key=lambda t: (-t[1], t[0])):
        print("  %4d  %s" % (c, url))
    print("  ---- 총 " + str(sum(counts.values())) + "개 API / " + str(len(counts)) + "개 그룹")


def cmd_errors(args, apis, errors):
    rows = errors
    if args.query:
        q = args.query.lower()
        rows = [e for e in errors if q in e["errCode"].lower() or q in e["errMsg"].lower()]
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return
    for e in rows:
        print("  " + e["errCode"] + "  " + e["errMsg"])
    print("  ---- " + str(len(rows)) + "건")


def cmd_fields(args, apis, errors):
    entry = apis.get(args.api_id)
    if entry is None:
        raise SystemExit("[없음] " + args.api_id)
    which = []
    if args.req or not (args.req or args.res):
        which.append(("요청", entry["requestIo"]))
    if args.res or not (args.req or args.res):
        which.append(("응답", entry["responseIo"]))
    for label, fields in which:
        print("## " + label + " (" + entry["apiId"] + " " + entry["apiNm"] + ")")
        for f in fields:
            d, name = depth_of(f["itemId"])
            print("  " * d + name + "\t" + f.get("itemNm", ""))


def main(argv=None):
    p = argparse.ArgumentParser(description="키움 API 스펙 조회")
    p.add_argument("--spec")
    p.add_argument("--json", action="store_true")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("show", help="API 상세")
    s.add_argument("api_id", nargs="+")
    s.add_argument("--full", action="store_true")
    s.set_defaults(func=cmd_show)

    s = sub.add_parser("search", help="키워드 검색")
    s.add_argument("keyword")
    s.add_argument("--scope", choices=["all", "id", "name", "desc", "field"], default="all")
    s.add_argument("--limit", type=int, default=40)
    s.set_defaults(func=cmd_search)

    s = sub.add_parser("list", help="목록")
    s.add_argument("group", nargs="?")
    s.set_defaults(func=cmd_list)

    s = sub.add_parser("groups", help="그룹 요약")
    s.set_defaults(func=cmd_groups)

    s = sub.add_parser("errors", help="에러코드")
    s.add_argument("query", nargs="?")
    s.set_defaults(func=cmd_errors)

    s = sub.add_parser("fields", help="필드명만")
    s.add_argument("api_id")
    s.add_argument("--req", action="store_true")
    s.add_argument("--res", action="store_true")
    s.set_defaults(func=cmd_fields)

    args = p.parse_args(argv)
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass
    apis, errors = load(args.spec)
    args.func(args, apis, errors)


if __name__ == "__main__":
    main()
