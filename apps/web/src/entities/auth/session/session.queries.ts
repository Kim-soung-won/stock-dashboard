import { queryOptions, useQuery } from '@tanstack/react-query';
import { SessionService } from '@/shared/api/auth/session';
import { authStore, useAuthToken } from '@/shared/lib';

export const authQueries = {
  all: () => ['auth'] as const,

  /**
   * 현재 토큰의 참가자. 토큰이 있을 때만 조회한다. 토큰이 만료/무효면 401 이 오고
   * base.service 가 토큰을 비우므로, 이 쿼리 실패가 곧 로그아웃으로 이어진다.
   */
  me: () =>
    queryOptions({
      queryKey: [...authQueries.all(), 'me'],
      queryFn: () => SessionService.me(),
      enabled: !!authStore.getToken(),
      retry: false,
      staleTime: Infinity,
    }),
};

/** 로그인 상태. 토큰 유무가 진실이고, participant 는 검증되면 채워진다. */
export const useSession = () => {
  const token = useAuthToken();
  const me = useQuery(authQueries.me());
  return {
    token,
    participant: me.data ?? null,
    isAuthed: !!token,
    isVerifying: !!token && me.isLoading,
  };
};
