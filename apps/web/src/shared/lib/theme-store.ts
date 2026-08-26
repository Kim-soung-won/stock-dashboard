import { useSyncExternalStore } from 'react';

/**
 * UI 스킨 테마 보관소 (도메인 무관 인프라).
 *
 * claude.ai/design "Stock Arcade Dashboard" 의 테마 프리셋(arcade / terminal)을 이식했다.
 * 실제 색·테두리·폰트는 index.css 의 CSS 변수(`:root[data-theme='terminal']`)가 흡수하므로,
 * 이 보관소는 선택값을 localStorage 에 저장하고 `<html data-theme>` 만 바꾼다.
 * React 컴포넌트는 `useTheme()` 로 현재 테마에 반응한다(브랜드 문구 전환 등).
 */

export type Theme = 'arcade' | 'terminal';

const THEME_KEY = 'ui.theme';
const DEFAULT_THEME: Theme = 'arcade';

let theme: Theme = readInitial();
const listeners = new Set<() => void>();

function readInitial(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'terminal' ? 'terminal' : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** arcade 는 기본값이라 속성을 지운다(선택자 `:root[data-theme='terminal']` 만 오버라이드). */
function apply(next: Theme): void {
  const root = document.documentElement;
  if (next === 'arcade') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', next);
}

// 최초 렌더 전에 저장된 테마를 문서에 반영한다(FOUC 방지).
apply(theme);

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const themeStore = {
  get: (): Theme => theme,

  set: (next: Theme): void => {
    theme = next;
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 저장 실패해도 이번 세션은 메모리 값으로 동작한다 */
    }
    emit();
  },

  toggle: (): void => {
    themeStore.set(theme === 'terminal' ? 'arcade' : 'terminal');
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** 현재 테마에 반응하는 훅. */
export const useTheme = (): Theme =>
  useSyncExternalStore(themeStore.subscribe, themeStore.get, () => DEFAULT_THEME);
