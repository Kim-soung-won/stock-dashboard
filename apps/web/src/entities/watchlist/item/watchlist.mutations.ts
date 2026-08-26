import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { AddWatchlistRequest, WatchlistItem } from '@stock/contracts';
import { WatchlistService } from '@/shared/api/watchlist/item';
import { watchlistQueries } from './watchlist.queries';

/**
 * 관심종목 추가/삭제 — **낙관적 갱신**.
 *
 * ★ 는 "눌렀는데 반응이 없다"가 곧바로 드러나는 UI 다. 그래서 서버 왕복을 기다리지 않고
 * `onMutate` 에서 캐시를 먼저 바꾼다(클릭 → 즉시 리렌더). 실패하면 `onError` 가 직전
 * 목록으로 되돌리므로 잘못된 상태가 남지 않는다.
 *
 * 성공 응답은 **갱신된 전체 목록**이라 재조회 없이 그걸로 캐시를 확정한다. 단, 아직
 * 진행 중인 다른 토글이 있으면 확정하지 않는다 — 응답이 뒤집혀 도착하면 방금 누른 ★ 가
 * 되살아나 보인다. 마지막으로 끝나는 요청이 확정한다.
 *
 * 자기 슬라이스(watchlist)의 캐시만 건드린다 — 다른 슬라이스를 무효화하는 조합은
 * features 계층의 몫이다.
 */
const MUTATION_KEY = [...watchlistQueries.all(), 'mutate'] as const;

/** 낙관적 갱신의 롤백 지점. onMutate 가 만들어 onError 로 전달한다. */
interface Rollback {
  previous: WatchlistItem[];
}

const listKey = () => watchlistQueries.list().queryKey;

/** 진행 중인 토글이 이것 하나뿐일 때만 서버 목록으로 확정한다(응답 역전 방지). */
const isLastInFlight = (queryClient: QueryClient): boolean =>
  queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1;

/** 낙관적으로 바꾼 목록을 캐시에 넣고, 되돌릴 직전 목록을 돌려준다. */
const applyOptimistic = async (
  queryClient: QueryClient,
  update: (previous: WatchlistItem[]) => WatchlistItem[],
): Promise<Rollback> => {
  // 진행 중인 목록 조회가 나중에 도착해 낙관적 상태를 덮어쓰는 것을 막는다.
  await queryClient.cancelQueries({ queryKey: listKey() });
  const previous = queryClient.getQueryData<WatchlistItem[]>(listKey()) ?? [];
  queryClient.setQueryData<WatchlistItem[]>(listKey(), update(previous));
  return { previous };
};

export const useAddWatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: (request: AddWatchlistRequest) => WatchlistService.add(request),
    retry: false,
    onMutate: (request) =>
      applyOptimistic(queryClient, (previous) =>
        // 서버와 같은 규칙: 이미 담긴 종목은 중복 추가하지 않고, 새 종목은 맨 뒤에 붙는다.
        previous.some((item) => item.code === request.code)
          ? previous
          : [
              ...previous,
              {
                code: request.code,
                name: request.name ?? null,
                // 서버가 확정해 줄 값의 자리표시자. 목록 순서(담은 순)만 맞으면 된다.
                createdAt: new Date().toISOString(),
              },
            ],
      ),
    onError: (_error, _request, rollback) => {
      if (rollback) queryClient.setQueryData(listKey(), rollback.previous);
    },
    onSuccess: (list) => {
      if (isLastInFlight(queryClient)) queryClient.setQueryData(listKey(), list.items);
    },
  });
};

export const useRemoveWatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: MUTATION_KEY,
    mutationFn: (code: string) => WatchlistService.remove(code),
    retry: false,
    onMutate: (code) =>
      applyOptimistic(queryClient, (previous) => previous.filter((item) => item.code !== code)),
    onError: (_error, _code, rollback) => {
      if (rollback) queryClient.setQueryData(listKey(), rollback.previous);
    },
    onSuccess: (list) => {
      if (isLastInFlight(queryClient)) queryClient.setQueryData(listKey(), list.items);
    },
  });
};
