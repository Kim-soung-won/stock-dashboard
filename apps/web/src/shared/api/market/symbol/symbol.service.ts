import { API_ROUTES } from '@stock/contracts';
import type { MarketKind } from '@stock/contracts';
import { BaseService } from '../../base';
import { SymbolDtoSchemas } from './symbol-dto.contracts';
import type { SymbolDtoTypes } from './symbol-dto.types';

export const SymbolService = {
  /** 종목 마스터. BFF 가 하루 단위로 캐시하므로 자주 불러도 유량을 태우지 않는다. */
  fetchSymbols: (market: MarketKind): Promise<SymbolDtoTypes.SymbolList> =>
    BaseService.get(API_ROUTES.market.symbols + '?market=' + market, SymbolDtoSchemas.symbolList),
};
