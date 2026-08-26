import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeClient } from '@/shared/lib';
import { portfolioQueries } from './portfolio.queries';

/**
 * 내 포트폴리오 실시간 동기화.
 *
 * 평가금액은 서버가 보유종목 시세(WS)로 계산하므로, 순위가 갱신되는 시점(=시세가
 * 움직인 시점)에 맞춰 내 포트폴리오도 다시 읽는다. 별도 폴링 타이머가 아니라
 * 리더보드 브로드캐스트에 얹혀 무효화한다.
 */
export const usePortfolioLiveSync = (): void => {
  const queryClient = useQueryClient();
  useEffect(() => {
    return realtimeClient.subscribe((message) => {
      if (message.type !== 'leaderboard') return;
      void queryClient.invalidateQueries({ queryKey: portfolioQueries.current().queryKey });
    });
  }, [queryClient]);
};
