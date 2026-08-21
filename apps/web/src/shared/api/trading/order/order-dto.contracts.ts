import { listPayloadSchema, orderabilitySchema, orderRecordSchema } from '@stock/contracts';

export const OrderDtoSchemas = {
  order: orderRecordSchema,
  orderList: listPayloadSchema(orderRecordSchema),
  orderability: orderabilitySchema,
} as const;
