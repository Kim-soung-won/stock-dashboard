import { API_ROUTES } from '@stock/contracts';
import { BaseService } from '../../base';
import { BalanceDtoSchemas } from './balance-dto.contracts';
import type { BalanceDtoTypes } from './balance-dto.types';

export const BalanceService = {
  /** 잔고는 키움이 진실이라 우리가 보관하지 않는다. 필요할 때 조회한다. */
  fetchBalance: (): Promise<BalanceDtoTypes.Balance> =>
    BaseService.get(API_ROUTES.account.balance, BalanceDtoSchemas.balance),

  fetchPendingOrders: (code?: string): Promise<BalanceDtoTypes.PendingOrderList> =>
    BaseService.get(
      API_ROUTES.account.pendingOrders + (code ? '?code=' + code : ''),
      BalanceDtoSchemas.pendingOrderList,
    ),
};
