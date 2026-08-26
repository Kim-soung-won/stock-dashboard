import { queryOptions } from '@tanstack/react-query';
import { ProfileService } from '@/shared/api/profile/detail';

export const profileQueries = {
  all: () => ['profile'] as const,

  /** 공개 프로필. 실시간 시세는 관심종목 표(TableWatchlist)가 별도로 붙인다. */
  detail: (participantId: string | undefined) =>
    queryOptions({
      queryKey: [...profileQueries.all(), participantId ?? ''] as const,
      queryFn: () => ProfileService.fetchProfile(participantId as string),
      enabled: !!participantId,
    }),
};
