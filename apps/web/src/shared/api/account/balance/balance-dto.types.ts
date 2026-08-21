import type { z } from 'zod';
import type { BalanceDtoSchemas } from './balance-dto.contracts';

export namespace BalanceDtoTypes {
  export type Balance = z.infer<typeof BalanceDtoSchemas.balance>;
  export type PendingOrderList = z.infer<typeof BalanceDtoSchemas.pendingOrderList>;
}
