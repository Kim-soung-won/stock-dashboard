import { quoteQueries } from '@/entities/market/quote';
import { queryClient } from '@/shared/lib';

const STORAGE_KEY = 'watchlist';
const DEFAULT_CODES = ['005930', '000660', '035420', '005380'];

/**
 * 관심종목 store (싱글턴).
 *
 * 서버에 관심종목 API(ka01300/ka01301)가 있지만, 우선 로컬에 두고 화면을 완성한다.
 * useSyncExternalStore 로 구독하므로 컴포넌트는 이 모듈만 알면 된다.
 */
const load = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CODES;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : DEFAULT_CODES;
  } catch {
    return DEFAULT_CODES;
  }
};

let codes: string[] = load();
const listeners = new Set<() => void>();

const emit = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  for (const listener of listeners) listener();
};

export const watchlistStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): string[] => codes,
  add: (code: string) => {
    if (code.length < 6 || codes.includes(code)) return;
    codes = [...codes, code];
    emit();
  },
  remove: (code: string) => {
    codes = codes.filter((item) => item !== code);
    emit();
  },
};

/** 라우트 진입 시 스냅샷을 미리 받아둔다(첫 렌더 깜빡임 방지). */
export const dashboardLoader = async (): Promise<null> => {
  await Promise.all(
    watchlistStore.getSnapshot().map((code) => queryClient.prefetchQuery(quoteQueries.detail(code))),
  );
  return null;
};
