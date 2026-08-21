import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { toErrorReport } from '@/shared/lib';
import { ErrorFallback } from '@/shared/ui';

/**
 * 라우트 단계 에러 표시 (react-router `errorElement`).
 *
 * 컴포넌트 렌더 예외는 ErrorBoundary 가 잡지만, **loader 에서 던진 예외와 존재하지 않는
 * 경로**는 react-router 가 가로채 자기 화면을 띄운다. 그 화면에는 우리 에러 정보(키움
 * 코드 등)가 없으므로 같은 패널로 통일한다.
 */
export const RouteErrorBoundary = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="page">
        <ErrorFallback
          context="route"
          report={{
            title: `${error.status} ${error.statusText}`,
            message: typeof error.data === 'string' ? error.data : '요청한 경로를 찾을 수 없습니다',
            code: error.status,
            kiwoomCode: null,
            detail: null,
            stack: null,
            componentStack: null,
          }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <ErrorFallback context="route" report={toErrorReport(error)} />
    </div>
  );
};
