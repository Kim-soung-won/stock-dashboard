import { HttpException, HttpStatus } from '@nestjs/common';
import { AUTH_ERROR_CODES, KIWOOM_ERROR_MESSAGE, THROTTLE_ERROR_CODES } from '@stock/kiwoom-codes';

/**
 * 키움 응답은 HTTP 200 이어도 바디 `return_code !== 0` 이면 실패다.
 * 그 실패를 우리 예외로 승격시켜 컨트롤러 레벨에서 일관되게 다룬다.
 */
export class KiwoomApiError extends HttpException {
  constructor(
    readonly apiId: string,
    readonly returnCode: string,
    readonly returnMessage: string,
  ) {
    const known = KIWOOM_ERROR_MESSAGE[returnCode];
    super(
      {
        code: Number.isNaN(Number(returnCode)) ? -1 : Number(returnCode),
        message: returnMessage || known || '키움 API 호출에 실패했습니다',
        data: { kiwoomCode: returnCode, detail: `api-id=${apiId}` },
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  /** 유량 초과 계열 — 백오프 후 재시도 대상. */
  get isThrottled(): boolean {
    return (THROTTLE_ERROR_CODES as readonly string[]).includes(this.returnCode);
  }

  /** 토큰 계열 — 재발급 후 1회 재시도 대상. */
  get isAuthFailure(): boolean {
    return (AUTH_ERROR_CODES as readonly string[]).includes(this.returnCode);
  }

  /**
   * 8010(토큰 발급 IP != 요청 IP)은 재시도해도 낫지 않는다.
   * egress IP 가 바뀌는 환경(서버리스 등)에 배포했다는 신호다.
   */
  get isIpMismatch(): boolean {
    return this.returnCode === '8010';
  }
}

/**
 * 키움 토큰 엔드포인트는 `return_code` 를 2/3 처럼 뭉뚱그려 주고, 실제 원인 코드는
 * `return_msg` 안에 `[8030:...]` 형태로 끼워 보낸다. 그 하위 코드를 꺼낸다.
 */
export const extractKiwoomSubCode = (message: string | undefined): string | null => {
  const matched = /\[(\d{4})[:\]]/.exec(message ?? '');
  return matched?.[1] ?? null;
};

/** 원인 코드별 조치 안내. 로그만 보고 무엇을 고쳐야 할지 알 수 있게 한다. */
export const tokenFailureHint = (subCode: string | null): string => {
  if (subCode === '8030' || subCode === '8031') {
    return '앱키의 투자구분(실전/모의)이 서버 설정과 다릅니다. .env 의 KIWOOM_ENV 를 앱키와 맞추세요 (실전 앱키 -> real, 모의투자 앱키 -> mock)';
  }
  if (subCode === '8001' || subCode === '8002') {
    return '앱키/시크릿키 검증 실패 — .env 의 KIWOOM_APP_KEY / KIWOOM_SECRET_KEY 를 확인하세요';
  }
  if (subCode === '8010') {
    return '토큰 발급 IP 와 요청 IP 가 다릅니다. egress IP 가 고정된 환경에서 실행하세요';
  }
  return '접근토큰 발급에 실패했습니다';
};
