import { queryOptions } from '@tanstack/react-query';
import { HealthService } from '@/shared/api/system/health';

export const healthQueries = {
  all: () => ['system', 'health'] as const,

  /** 실전/모의 판정의 근거. 프론트 상태가 아니라 서버가 알려주는 값이어야 한다. */
  status: () =>
    queryOptions({
      queryKey: healthQueries.all(),
      queryFn: () => HealthService.fetchHealth(),
      staleTime: 60_000,
    }),
};
