import { queryOptions } from '@tanstack/react-query';
import { SeasonService } from '@/shared/api/competition/season';

export const seasonQueries = {
  all: () => ['competition', 'season'] as const,

  current: () =>
    queryOptions({
      queryKey: [...seasonQueries.all(), 'current'],
      queryFn: () => SeasonService.fetchSeason(),
      staleTime: 60_000,
    }),
};
