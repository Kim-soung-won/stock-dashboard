import { listPayloadSchema, paperTradeSchema, portfolioSchema, tradeResultSchema } from '@stock/contracts';

export const PortfolioDtoSchemas = {
  portfolio: portfolioSchema,
  tradeResult: tradeResultSchema,
  tradeList: listPayloadSchema(paperTradeSchema),
} as const;
