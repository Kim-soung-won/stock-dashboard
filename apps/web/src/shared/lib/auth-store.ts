import { useSyncExternalStore } from 'react';

/**
 * 경쟁 로그인 토큰 보관소 (도메인 무관 인프라).
 *
 * 캐주얼 경쟁이라 httpOnly 쿠키 대신 localStorage + Bearer 헤더를 쓴다. 토큰은
 * BFF 가 HMAC 서명한 문자열이라 클라이언트가 위조할 수 없고, base.service 가 매 요청에
 * 실어 보낸다. React 컴포넌트는 `useAuthToken()` 으로 로그인 여부에 반응한다.
 */

const TOKEN_KEY = 'competition.token';

let token: string | null = readInitial();
const listeners = new Set<() => void>();

function readInitial(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const authStore = {
  getToken: (): string | null => token,

  setToken: (next: string): void => {
    token = next;
    try {
      localStorage.setItem(TOKEN_KEY, next);
    } catch {
      /* 저장 실패해도 메모리 토큰으로 이번 세션은 동작한다 */
    }
    emit();
  },

  clear: (): void => {
    token = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* noop */
    }
    emit();
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** 로그인 여부에 반응하는 훅. 토큰 문자열(없으면 null)을 돌려준다. */
export const useAuthToken = (): string | null =>
  useSyncExternalStore(authStore.subscribe, authStore.getToken, () => null);
