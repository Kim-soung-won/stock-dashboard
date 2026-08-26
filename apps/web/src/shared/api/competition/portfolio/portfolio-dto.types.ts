import type { z } from 'zod';
import type { PortfolioDtoSchemas } from './portfolio-dto.contracts';

export namespace PortfolioDtoTypes {
  export type Portfolio = z.infer<typeof PortfolioDtoSchemas.portfolio>;
  export type TradeResult = z.infer<typeof PortfolioDtoSchemas.tradeResult>;
  export type TradeList = z.infer<typeof PortfolioDtoSchemas.tradeList>;
}
