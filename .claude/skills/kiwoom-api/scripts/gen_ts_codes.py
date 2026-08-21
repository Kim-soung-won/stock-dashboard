#!/usr/bin/env python3
"""스펙 JSON → TypeScript 코드 생성 (packages/kiwoom-codes/src/generated).

생성물:
  api-catalog.generated.ts   apiId -> {name, url, transport} 전체 342개 + ApiId 타입
  realtime.generated.ts      실시간 타입 코드 -> 이름, 타입별 FID -> 이름 맵
  error-codes.generated.ts   에러코드 -> 메시지

사용:
  python scripts/gen_ts_codes.py                       # 기본 출력 경로
  python scripts/gen_ts_codes.py --out ../../packages/kiwoom-codes/src/generated
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from kiwoom_spec import clean, depth_of, is_oauth, is_websocket, load

BANNER = ("// 이 파일은 kiwoom-rest-api-spec.json 에서 생성되었습니다. 직접 수정하지 마세요.\n"
          "// 재생성: python .claude/skills/kiwoom-api/scripts/gen_ts_codes.py\n")


def ts_key(key: str) -> str:
    """객체 키로 안전하게 감싼다(숫자로 시작하는 실시간 코드 대응)."""
    return json.dumps(key, ensure_ascii=False)


def gen_catalog(apis: dict, out: Path) -> int:
    lines = [BANNER, "export type Transport = 'rest' | 'ws';", "",
             "export interface ApiSpec {",
             "  /** 스펙상의 한글 TR 이름 */",
             "  readonly name: string;",
             "  /** REST 경로 또는 WebSocket 경로 */",
             "  readonly url: string;",
             "  readonly transport: Transport;",
             "}", "",
             "export const API_CATALOG = {"]
    for k, v in sorted(apis.items()):
        transport = "ws" if is_websocket(v) else "rest"
        lines.append("  %s: { name: %s, url: %s, transport: %s }," % (
            ts_key(k),
            json.dumps(v["apiNm"], ensure_ascii=False),
            json.dumps(v["url"], ensure_ascii=False),
            json.dumps(transport),
        ))
    lines += ["} as const satisfies Record<string, ApiSpec>;", "",
              "export type ApiId = keyof typeof API_CATALOG;", "",
              "/** REST 로 호출하는 api-id (WebSocket 메시지 타입 제외) */",
              "export type RestApiId = {",
              "  [K in ApiId]: (typeof API_CATALOG)[K]['transport'] extends 'rest' ? K : never;",
              "}[ApiId];", "",
              "export const isRestApiId = (id: ApiId): id is RestApiId =>",
              "  API_CATALOG[id].transport === 'rest';", "",
              "/** api-id 로 호출 경로를 얻는다. URL 은 기능 그룹이고 TR 구분은 헤더가 한다. */",
              "export const urlOf = (id: ApiId): string => API_CATALOG[id].url;", ""]
    out.write_text("\n".join(lines), encoding="utf-8")
    return len(apis)


def gen_realtime(apis: dict, out: Path) -> int:
    ws = {k: v for k, v in apis.items() if is_websocket(v)}
    # 실시간 타입은 조건검색(ka1017x 등)과 달리 2자 코드다.
    real = {k: v for k, v in ws.items() if len(k) == 2}
    lines = [BANNER,
             "/** 실시간 등록(REG) 시 사용하는 타입 코드. 대소문자를 구분한다(0G ETF NAV vs 0g 주식종목정보). */",
             "export const REALTIME_TYPE_NAME = {"]
    for k, v in sorted(real.items()):
        lines.append("  %s: %s," % (ts_key(k), json.dumps(v["apiNm"], ensure_ascii=False)))
    lines += ["} as const;", "",
              "export type RealtimeType = keyof typeof REALTIME_TYPE_NAME;", "",
              "/** 실시간 타입별 FID(응답 values 의 키) -> 한글 필드명 */",
              "export const REALTIME_FIDS = {"]
    total = 0
    for k, v in sorted(real.items()):
        fids = [f for f in v["responseIo"] if depth_of(f["itemId"])[0] == 2]
        total += len(fids)
        lines.append("  %s: {" % ts_key(k))
        for f in fids:
            _, fid = depth_of(f["itemId"])
            lines.append("    %s: %s," % (ts_key(fid), json.dumps(f.get("itemNm", ""), ensure_ascii=False)))
        lines.append("  },")
    lines += ["} as const satisfies Record<RealtimeType, Record<string, string>>;", "",
              "export type RealtimeFid<T extends RealtimeType> = keyof (typeof REALTIME_FIDS)[T];", "",
              "/** WebSocket REAL 수신 페이로드 */",
              "export interface RealtimeMessage {",
              "  readonly trnm: 'REAL';",
              "  readonly data: readonly {",
              "    readonly type: RealtimeType;",
              "    readonly name: string;",
              "    readonly item: string;",
              "    readonly values: Readonly<Record<string, string>>;",
              "  }[];",
              "}", ""]
    out.write_text("\n".join(lines), encoding="utf-8")
    return total


def gen_errors(errors: list, out: Path) -> int:
    lines = [BANNER, "export const KIWOOM_ERROR_MESSAGE: Readonly<Record<string, string>> = {"]
    for e in errors:
        lines.append("  %s: %s," % (ts_key(e["errCode"]), json.dumps(e["errMsg"], ensure_ascii=False)))
    lines += ["};", "",
              "/** 유량(호출 개수) 초과 계열 — 백오프 대상 */",
              "export const THROTTLE_ERROR_CODES = ['1700', '1701', '1702', '1687'] as const;", "",
              "/** 토큰/인증 계열 — 재발급 후 재시도 대상 */",
              "export const AUTH_ERROR_CODES = ['8005', '8006', '8009', '8010'] as const;", ""]
    out.write_text("\n".join(lines), encoding="utf-8")
    return len(errors)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--spec")
    default_out = (Path(__file__).resolve().parents[4]
                   / "packages" / "kiwoom-codes" / "src" / "generated")
    p.add_argument("--out", default=str(default_out))
    args = p.parse_args()
    apis, errors = load(args.spec)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    n1 = gen_catalog(apis, out / "api-catalog.generated.ts")
    n2 = gen_realtime(apis, out / "realtime.generated.ts")
    n3 = gen_errors(errors, out / "error-codes.generated.ts")
    print("api-catalog %d개 / realtime FID %d개 / error %d개 -> %s" % (n1, n2, n3, out))


if __name__ == "__main__":
    main()
