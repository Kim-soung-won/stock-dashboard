import type { z } from 'zod';
import type { SymbolDtoSchemas } from './symbol-dto.contracts';

export namespace SymbolDtoTypes {
  export type StockSymbol = z.infer<typeof SymbolDtoSchemas.symbol>;
  export type SymbolList = z.infer<typeof SymbolDtoSchemas.symbolList>;
}
