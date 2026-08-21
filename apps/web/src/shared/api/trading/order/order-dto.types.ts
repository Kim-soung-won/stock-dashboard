import type { z } from 'zod';
import type { OrderDtoSchemas } from './order-dto.contracts';

export namespace OrderDtoTypes {
  export type Order = z.infer<typeof OrderDtoSchemas.order>;
  export type OrderList = z.infer<typeof OrderDtoSchemas.orderList>;
  export type Orderability = z.infer<typeof OrderDtoSchemas.orderability>;
}
