import { ApiError } from '@/shared/api/base';

/**
 * 잡힌 에러를 "디버깅에 필요한 정보"로 정형화한다.
 *
 * 이 앱의 에러는 대개 BFF 봉투에서 온다(`ApiError`). 그때 진짜 원인은 HTTP 상태가
 * 아니라 **키움 코드**(`8030` 투자구분 불일치, `8010` IP 불일치, `1700` 유량 초과 …)라서
 * 화면과 콘솔 양쪽에 그 코드를 반드시 남긴다.
 */
export interface ErrorReport {
  title: string;
  message: string;
  /** BFF 봉투 code (0 이 아니면 실패) */
  code: number | null;
  /** 키움 return_code / 하위 코드 */
  kiwoomCode: string | null;
  /** 키움 return_msg 등 원문 */
  detail: string | null;
  stack: string | null;
  /** React 가 알려주는 컴포넌트 트리 (어느 컴포넌트에서 터졌는지) */
  componentStack: string | null;
}

export const toErrorReport = (error: unknown, componentStack?: string | null): ErrorReport => {
  if (error instanceof ApiError) {
    return {
      title: `API 오류 (code ${error.code})`,
      message: error.message,
      code: error.code,
      kiwoomCode: error.kiwoomCode,
      detail: error.detail,
      stack: error.stack ?? null,
      componentStack: componentStack ?? null,
    };
  }

  if (error instanceof Error) {
    return {
      title: error.name || 'Error',
      message: error.message,
      code: null,
      kiwoomCode: null,
      detail: null,
      stack: error.stack ?? null,
      componentStack: componentStack ?? null,
    };
  }

  return {
    title: '알 수 없는 오류',
    message: typeof error === 'string' ? error : JSON.stringify(error),
    code: null,
    kiwoomCode: null,
    detail: null,
    stack: null,
    componentStack: componentStack ?? null,
  };
};

/** 이슈에 붙이거나 채팅에 던질 수 있는 텍스트 리포트. */
export const formatErrorReport = (report: ErrorReport, context?: string): string =>
  [
    `[${report.title}] ${report.message}`,
    context ? `위치: ${context}` : null,
    report.code === null ? null : `BFF code: ${report.code}`,
    report.kiwoomCode ? `키움 코드: ${report.kiwoomCode}` : null,
    report.detail ? `원문: ${report.detail}` : null,
    `시각: ${new Date().toISOString()}`,
    `URL: ${typeof window === 'undefined' ? '-' : window.location.href}`,
    report.componentStack ? `\n컴포넌트 스택:${report.componentStack}` : null,
    report.stack ? `\n스택:\n${report.stack}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
