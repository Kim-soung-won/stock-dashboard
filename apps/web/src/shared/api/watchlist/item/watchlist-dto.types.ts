import type { z } from 'zod';
import type { WatchlistDtoSchemas } from './watchlist-dto.contracts';

export namespace WatchlistDtoTypes {
  export type Item = z.infer<typeof WatchlistDtoSchemas.item>;
  export type List = z.infer<typeof WatchlistDtoSchemas.list>;
}
