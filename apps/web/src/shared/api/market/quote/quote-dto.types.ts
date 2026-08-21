import type { z } from 'zod';
import type { QuoteDtoSchemas } from './quote-dto.contracts';

export namespace QuoteDtoTypes {
  export type Quote = z.infer<typeof QuoteDtoSchemas.quote>;
  export type OrderBook = z.infer<typeof QuoteDtoSchemas.orderBook>;
}
