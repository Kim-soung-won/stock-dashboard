import { listPayloadSchema, rankingItemSchema } from '@stock/contracts';

export const RankingDtoSchemas = {
  item: rankingItemSchema,
  list: listPayloadSchema(rankingItemSchema),
} as const;
