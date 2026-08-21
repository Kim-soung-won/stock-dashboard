import { listPayloadSchema, stockSymbolSchema } from '@stock/contracts';

export const SymbolDtoSchemas = {
  symbol: stockSymbolSchema,
  symbolList: listPayloadSchema(stockSymbolSchema),
} as const;
