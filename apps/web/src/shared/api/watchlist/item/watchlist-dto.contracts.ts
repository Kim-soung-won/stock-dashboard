import { listPayloadSchema, watchlistItemSchema } from '@stock/contracts';

export const WatchlistDtoSchemas = {
  item: watchlistItemSchema,
  list: listPayloadSchema(watchlistItemSchema),
} as const;
