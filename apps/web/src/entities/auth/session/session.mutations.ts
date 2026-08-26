import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginRequest } from '@stock/contracts';
import { SessionService } from '@/shared/api/auth/session';
import { authStore } from '@/shared/lib';
import { authQueries } from './session.queries';

/**
 * 참가/로그인. 성공하면 토큰을 저장하고 참가자 정보를 캐시에 심는다.
 * 자동 재시도는 끈다 — PIN 오류를 조용히 재시도하지 않는다.
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: LoginRequest) => SessionService.login(request),
    retry: false,
    onSuccess: (session) => {
      authStore.setToken(session.token);
      queryClient.setQueryData(authQueries.me().queryKey, session.participant);
    },
  });
};

/** 로그아웃 — 토큰을 비우고 참가자 스코프 캐시를 걷어낸다. */
export const useLogout = () => {
  const queryClient = useQueryClient();
  return () => {
    authStore.clear();
    queryClient.removeQueries({ queryKey: authQueries.all() });
    // 포트폴리오 등 참가자 스코프 데이터도 함께 비운다.
    queryClient.removeQueries({ queryKey: ['competition', 'portfolio'] });
  };
};
