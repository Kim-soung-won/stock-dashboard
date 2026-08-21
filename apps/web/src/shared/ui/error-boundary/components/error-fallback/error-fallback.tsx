import { useState } from 'react';
import type { ErrorReport } from '@/shared/lib';
import { formatErrorReport } from '@/shared/lib';

interface ErrorFallbackProps {
  report: ErrorReport;
  /** 어디서 터졌는지 (바운더리 이름). 리포트에 함께 실린다 */
  context?: string;
  onRetry?: () => void;
}

/**
 * 에러 표시 + 디버깅 정보 패널.
 *
 * "문제가 발생했습니다" 만 띄우면 개발 중에 아무 도움이 안 된다. 그래서
 * (1) 키움 코드를 눈에 보이게, (2) 스택·컴포넌트 스택을 접어서, (3) 리포트 복사 버튼을
 * 제공한다. 이 바운더리 전용 sub 컴포넌트라 하위 components/ 에 코로케이션한다.
 */
export const ErrorFallback = ({ report, context, onRetry }: ErrorFallbackProps) => {
  const [copied, setCopied] = useState(false);
  const hasTrace = Boolean(report.stack ?? report.componentStack);

  const copy = () => {
    void navigator.clipboard
      .writeText(formatErrorReport(report, context))
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div className="error-fallback" role="alert">
      <div className="error-fallback__head">
        <strong className="error-fallback__title">{report.title}</strong>
        {report.kiwoomCode ? (
          <span className="error-fallback__code">키움 {report.kiwoomCode}</span>
        ) : null}
        {context ? <span className="error-fallback__context">{context}</span> : null}
      </div>

      <p className="error-fallback__message">{report.message}</p>
      {report.detail ? <p className="error-fallback__detail">{report.detail}</p> : null}

      <div className="error-fallback__actions">
        {onRetry ? (
          <button type="button" onClick={onRetry}>
            다시 시도
          </button>
        ) : null}
        <button type="button" onClick={copy}>
          {copied ? '복사됨' : '리포트 복사'}
        </button>
      </div>

      {hasTrace ? (
        <details className="error-fallback__trace">
          <summary>스택 보기</summary>
          {report.componentStack ? (
            <pre>
              <b>컴포넌트 스택</b>
              {report.componentStack}
            </pre>
          ) : null}
          {report.stack ? <pre>{report.stack}</pre> : null}
        </details>
      ) : null}
    </div>
  );
};
