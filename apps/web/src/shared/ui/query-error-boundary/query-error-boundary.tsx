import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '../error-boundary';

interface QueryErrorBoundaryProps {
  children: ReactNode;
  /** 재시도 시 리셋할 쿼리 루트 키 (예: quoteQueries.all()) */
  queryKey?: readonly unknown[];
  /** 바운더리 식별용 라벨 */
  context?: string;
  /** 이 값이 바뀌면 에러를 자동 해제 */
  resetKeys?: readonly unknown[];
  /** Suspense 폴백. 기본은 한 줄 로딩 문구 */
  fallback?: ReactNode;
}

/**
 * 쿼리용 경계 = ErrorBoundary + Suspense.
 *
 * `useSuspenseQuery` 는 실패를 **throw** 한다. 그래서 Suspense 만 두고 ErrorBoundary 를
 * 빼면 조회 실패가 그대로 트리 밖으로 나가 흰 화면이 된다. 두 개는 항상 같이 둔다.
 *
 * 재시도는 화면 상태만 되돌리는 게 아니라 `resetQueries` 로 캐시된 실패까지 지운다 —
 * 그러지 않으면 버튼을 눌러도 같은 에러가 즉시 다시 뜬다.
 */
export const QueryErrorBoundary = ({
  children,
  queryKey,
  context,
  resetKeys,
  fallback,
}: QueryErrorBoundaryProps) => {
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      context={context}
      resetKeys={resetKeys}
      onReset={() => {
        if (queryKey) void queryClient.resetQueries({ queryKey });
      }}
    >
      <Suspense fallback={fallback ?? <p className="state">불러오는 중…</p>}>{children}</Suspense>
    </ErrorBoundary>
  );
};
