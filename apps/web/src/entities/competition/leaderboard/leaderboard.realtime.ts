import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { realtimeClient } from '@/shared/lib';
import { leaderboardQueries } from './leaderboard.queries';

/**
 * 실시간 순위 스트림.
 *
 * 리더보드는 특정 종목 구독과 무관하게 전 클라이언트에 브로드캐스트되므로 구독 메시지를
 * 보낼 필요가 없다. 들어온 순위를 쿼리 캐시에 직접 써 넣으면, 이 캐시를 읽는 표가
 * 자동으로 다시 그려진다(폴링 없음).
 */
export const useLeaderboardStream = (): void => {
  const queryClient = useQueryClient();
  useEffect(() => {
    return realtimeClient.subscribe((message) => {
      if (message.type !== 'leaderboard') return;
      queryClient.setQueryData(leaderboardQueries.current().queryKey, message.payload);
    });
  }, [queryClient]);
};
