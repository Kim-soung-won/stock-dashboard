import type { ReactNode } from 'react';

interface StaleOverlayProps {
  /** 지연된 값으로 그리고 있는 중인지 (= 새 결과를 기다리는 중) */
  isStale: boolean;
  children: ReactNode;
}

/**
 * 재조회 중 이전 데이터를 흐리게 유지한다.
 *
 * useSuspenseQuery 는 쿼리 키가 바뀔 때마다 suspend 하므로, 봉 간격을 바꾸는 것만으로도
 * 차트가 폴백으로 교체돼 깜빡인다. useDeferredValue 로 이전 값을 유지하고 여기서
 * "갱신 중"만 표시하면 화면이 튀지 않는다.
 */
export const StaleOverlay = ({ isStale, children }: StaleOverlayProps) => (
  <div className={'stale-overlay' + (isStale ? ' stale-overlay--stale' : '')}>{children}</div>
);
