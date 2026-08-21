import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { ErrorReport } from '@/shared/lib';
import { debugLog, formatErrorReport, toErrorReport } from '@/shared/lib';
import { ErrorFallback } from './components/error-fallback';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** 바운더리 식별용 라벨. 콘솔 로그와 리포트에 실린다 */
  context?: string;
  /** 이 값들이 바뀌면 에러 상태를 자동으로 해제한다(필터·종목 변경 등) */
  resetKeys?: readonly unknown[];
  /** 재시도 버튼을 눌렀을 때 호출 (쿼리 리셋 등) */
  onReset?: () => void;
  /** 기본 패널 대신 직접 그릴 때 */
  fallback?: (report: ErrorReport, retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  report: ErrorReport | null;
}

const sameKeys = (a: readonly unknown[] = [], b: readonly unknown[] = []): boolean =>
  a.length === b.length && a.every((value, index) => value === b[index]);

/**
 * 렌더 단계의 예외를 잡는 경계.
 *
 * React 에서 렌더 중 던져진 예외를 잡는 방법은 클래스 컴포넌트뿐이다
 * (`componentDidCatch`). 잡지 않으면 트리 전체가 언마운트돼 **흰 화면**이 되고, 원인은
 * 콘솔 어딘가에만 남는다. 이 경계는 그 지점에서 멈추고 원인을 화면에 보여준다.
 *
 * 쿼리 에러까지 함께 다루려면 `QueryErrorBoundary` 를 쓴다(Suspense + 쿼리 리셋 포함).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { report: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { report: toErrorReport(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    const report = toErrorReport(error, info.componentStack);
    this.setState({ report });
    // 콘솔에는 항상 남긴다 — 화면을 닫아도 추적할 수 있어야 한다.
    console.error(
      `[ErrorBoundary${this.props.context ? ':' + this.props.context : ''}]\n` +
        formatErrorReport(report, this.props.context),
    );
  }

  override componentDidUpdate(previous: ErrorBoundaryProps): void {
    // 종목·필터가 바뀌면 이전 에러를 붙들고 있지 않는다.
    if (this.state.report && !sameKeys(previous.resetKeys, this.props.resetKeys)) {
      this.setState({ report: null });
    }
  }

  private readonly retry = (): void => {
    this.setState({ report: null });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    const { report } = this.state;
    if (!report) return this.props.children;

    if (this.props.fallback) return this.props.fallback(report, this.retry);
    return <ErrorFallback report={report} context={this.props.context} onRetry={this.retry} />;
  }
}
