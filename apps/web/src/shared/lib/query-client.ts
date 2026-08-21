import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { debugLog } from './debug-log';

/**
 * 시세는 WebSocket 이 밀어주므로 react-query 의 폴링(refetchInterval)은 쓰지 않는다.
 * REST 재조회를 실시간 대용으로 돌리면 유량 초과(1700/1701)에 걸린다.
 *
 * 캐시 레벨 onError 를 두는 이유: 바운더리는 "지금 화면에 붙은" 실패만 보여준다.
 * 백그라운드 재조회나 이미 언마운트된 화면의 실패는 어디에도 남지 않으므로,
 * 쿼리 키와 함께 디버그 로그(+콘솔)에 남겨 추적 가능하게 만든다.
 */
const logFailure = (kind: string, key: unknown, error: unknown): void => {
  debugLog.pushError(`${kind} ${JSON.stringify(key)}`, error);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => logFailure('query', query.queryKey, error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      logFailure('mutation', mutation.options.mutationKey ?? 'unnamed', error),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
