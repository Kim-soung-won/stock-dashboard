import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { pathKeys, useAuthToken } from '@/shared/lib';

/**
 * 인증 게이트. 토큰이 없으면 로그인 화면으로 보낸다.
 *
 * 슬라이스가 아니라 라우팅 진입점이므로 src 직속에 둔다(app-layout 과 같은 위치).
 * 토큰 유무만 본다 — 만료된 토큰은 첫 API 호출의 401 에서 base.service 가 비우고,
 * 그 변화가 이 게이트를 다시 로그인으로 돌려보낸다.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const token = useAuthToken();
  if (!token) return <Navigate to={pathKeys.auth.login} replace />;
  return <>{children}</>;
};
