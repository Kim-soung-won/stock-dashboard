import { API_ROUTES } from '@stock/contracts';
import type { CandleInterval } from '@stock/contracts';
import { BaseService } from '../../base';
import { ChartDtoSchemas } from './chart-dto.contracts';
import type { ChartDtoTypes } from './chart-dto.types';

export const ChartService = {
  /** 과거 봉. 캐시해두고 마지막 봉만 실시간 체결로 갱신하는 용도. */
  fetchCandles: (code: string, interval: CandleInterval): Promise<ChartDtoTypes.CandleList> =>
    BaseService.get(
      API_ROUTES.market.candles(code) + '?interval=' + interval,
      ChartDtoSchemas.candleList,
    ),
};
