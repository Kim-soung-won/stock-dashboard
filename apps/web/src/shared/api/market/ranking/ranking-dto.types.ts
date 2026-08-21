import type { z } from 'zod';
import type { RankingDtoSchemas } from './ranking-dto.contracts';

export namespace RankingDtoTypes {
  export type Item = z.infer<typeof RankingDtoSchemas.item>;
  export type List = z.infer<typeof RankingDtoSchemas.list>;
}
