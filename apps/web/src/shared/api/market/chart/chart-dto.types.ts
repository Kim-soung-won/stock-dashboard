import type { z } from 'zod';
import type { ChartDtoSchemas } from './chart-dto.contracts';

export namespace ChartDtoTypes {
  export type Candle = z.infer<typeof ChartDtoSchemas.candle>;
  export type CandleList = z.infer<typeof ChartDtoSchemas.candleList>;
}
