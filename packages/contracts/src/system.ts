import { z } from 'zod';
import { tradingEnvSchema } from './trading';

/** BFF 상태. 화면 상단 배지와 주문 폼의 실전/모의 판정에 쓴다. */
export const healthSchema = z.object({
  /** real 이면 실제 주문이 체결된다. 화면에 항상 표시할 것. */
  kiwoomEnv: tradingEnvSchema,
  upstream: z.enum(['connecting', 'ready', 'disconnected']),
  subscribedCodes: z.number(),
});

export type Health = z.infer<typeof healthSchema>;
