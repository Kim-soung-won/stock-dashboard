import { candleSchema, listPayloadSchema } from '@stock/contracts';

export const ChartDtoSchemas = {
  candle: candleSchema,
  candleList: listPayloadSchema(candleSchema),
} as const;
