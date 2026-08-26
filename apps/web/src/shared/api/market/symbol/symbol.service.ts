import { API_ROUTES } from '@stock/contracts';
import type { MarketKind } from '@stock/contracts';
import { BaseService } from '../../base';
import { SymbolDtoSchemas } from './symbol-dto.contracts';
import type { SymbolDtoTypes } from './symbol-dto.types';

export const SymbolService = {
  /** 종목 마스터. BFF 가 하루 단위로 캐시하므로 자주 불러도 유량을 태우지 않는다. */
  fetchSymbols: (market: MarketKind): Promise<SymbolDtoTypes.SymbolList> =>
    BaseService.get(API_ROUTES.market.symbols + '?market=' + market, SymbolDtoSchemas.symbolList),

  /**
   * 종목명·코드 부분일치 검색(전 시장 통합).
   *
   * 시장별 마스터를 통째로 받아 브라우저에서 훑는 대신 BFF 에 묻는다 — 사용자가 아직
   * 열어보지 않은 시장(코스닥·ETF)도 걸리고, 응답이 상한 건수로 끝난다.
   */
  searchSymbols: (keyword: string, limit = 20): Promise<SymbolDtoTypes.SymbolList> =>
    BaseService.get(
      API_ROUTES.market.symbolSearch +
        '?keyword=' +
        encodeURIComponent(keyword) +
        '&limit=' +
        limit,
      SymbolDtoSchemas.symbolList,
    ),
};
