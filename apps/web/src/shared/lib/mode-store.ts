import { useSyncExternalStore } from 'react';

/**
 * 명암 모드 보관소 (도메인 무관 인프라).
 *
 * 테마(arcade/terminal)와 직교하는 축. 각 테마에 dark/light 팔레트가 있고,
 * 실제 색 교체는 index.css 의 `:root[data-mode='light']` 및
 * `:root[data-theme='terminal'][data-mode='light']` CSS 변수가 흡수한다.
 * 여기서는 선택값을 localStorage 에 저장하고 `<html data-mode>` 만 바꾼다.
 */

export type Mode = 'dark' | 'light';

const MODE_KEY = 'ui.mode';
const DEFAULT_MODE: Mode = 'dark';

let mode: Mode = readInitial();
const listeners = new Set<() => void>();

function readInitial(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'light' ? 'light' : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/** dark 가 기본값이라 속성을 지운다(라이트 선택자만 오버라이드). */
function apply(next: Mode): void {
  const root = document.documentElement;
  if (next === 'dark') root.removeAttribute('data-mode');
  else root.setAttribute('data-mode', next);
}

// 최초 렌더 전에 저장된 모드를 문서에 반영한다(FOUC 방지).
apply(mode);

const emit = (): void => {
  for (const listener of listeners) listener();
};

export const modeStore = {
  get: (): Mode => mode,

  set: (next: Mode): void => {
    mode = next;
    apply(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* 저장 실패해도 이번 세션은 메모리 값으로 동작한다 */
    }
    emit();
  },

  toggle: (): void => {
    modeStore.set(mode === 'light' ? 'dark' : 'light');
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** 현재 명암 모드에 반응하는 훅. */
export const useMode = (): Mode =>
  useSyncExternalStore(modeStore.subscribe, modeStore.get, () => DEFAULT_MODE);
