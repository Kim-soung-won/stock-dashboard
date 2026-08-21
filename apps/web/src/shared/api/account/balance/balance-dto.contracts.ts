import { balanceSchema, listPayloadSchema, pendingOrderSchema } from '@stock/contracts';

export const BalanceDtoSchemas = {
  balance: balanceSchema,
  pendingOrderList: listPayloadSchema(pendingOrderSchema),
} as const;
