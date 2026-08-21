import { formatErrorReport, toErrorReport } from './error-report';

/**
 * 인앱 디버그 로그 (링 버퍼).
 *
 * 개발자도구를 열 수 없는 환경(IDE 내장 프리뷰, 정책 제한 PC 등)에서도 원인을 볼 수
 * 있어야 한다. 그래서 에러·쿼리 실패·실시간 세션 변화를 여기에 모아 화면에서 읽는다.
 * 콘솔에도 그대로 흘려보내므로 개발자도구가 열리는 환경에서는 양쪽 다 남는다.
 */

export type DebugLevel = 'error' | 'warn' | 'info';

export interface DebugEntry {
  id: number;
  /** HH:mm:ss */
  at: string;
  level: DebugLevel;
  /** 어디서 왔는지 (`boundary:chart:005930`, `query`, `ws` …) */
  source: string;
  message: string;
  /** 펼쳐 보는 상세 (리포트 전문·쿼리 키·스택) */
  detail?: string;
}

/** 오래된 항목은 버린다. 장중에는 이벤트가 계속 쌓인다. */
const CAPACITY = 200;

let entries: DebugEntry[] = [];
let sequence = 0;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) listener();
};

const timestamp = (): string => new Date().toTimeString().slice(0, 8);

export const debugLog = {
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** useSyncExternalStore 용. push 할 때만 참조가 바뀐다. */
  getSnapshot: (): DebugEntry[] => entries,

  push: (level: DebugLevel, source: string, message: string, detail?: string): void => {
    sequence += 1;
    const entry: DebugEntry = { id: sequence, at: timestamp(), level, source, message, detail };
    entries = [entry, ...entries].slice(0, CAPACITY);

    // 콘솔에도 남긴다 — 개발자도구를 쓸 수 있는 환경에서는 그쪽이 더 편하다.
    const line = `[${source}] ${message}`;
    if (level === 'error') console.error(line, detail ?? '');
    else if (level === 'warn') console.warn(line, detail ?? '');
    else console.info(line);

    emit();
  },

  /** 잡힌 예외를 리포트 전문과 함께 기록한다. */
  pushError: (source: string, error: unknown, componentStack?: string | null): void => {
    const report = toErrorReport(error, componentStack);
    debugLog.push('error', source, `${report.title}: ${report.message}`, formatErrorReport(report, source));
  },

  clear: (): void => {
    entries = [];
    emit();
  },

  errorCount: (): number => entries.filter((entry) => entry.level === 'error').length,
};
