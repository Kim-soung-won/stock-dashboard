import { API_ROUTES } from '@stock/contracts';
import type { TradeRequest } from '@stock/contracts';
import { BaseService } from '../../base';
import { PortfolioDtoSchemas } from './portfolio-dto.contracts';
import type { PortfolioDtoTypes } from './portfolio-dto.types';

export const PortfolioService = {
  /** 내 포트폴리오(현금+보유+평가). 인증 필요. */
  fetchPortfolio: (): Promise<PortfolioDtoTypes.Portfolio> =>
    BaseService.get(API_ROUTES.competition.portfolio, PortfolioDtoSchemas.portfolio),

  /** 시장가 매매. 체결 결과 + 갱신된 포트폴리오를 돌려받는다. */
  trade: (request: TradeRequest): Promise<PortfolioDtoTypes.TradeResult> =>
    BaseService.post(API_ROUTES.competition.trade, PortfolioDtoSchemas.tradeResult, request),

  /** 내 체결 이력. */
  fetchTrades: (): Promise<PortfolioDtoTypes.TradeList> =>
    BaseService.get(API_ROUTES.competition.trades, PortfolioDtoSchemas.tradeList),
};
