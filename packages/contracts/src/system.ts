import { z } from 'zod';
import { tradingEnvSchema } from './trading';

/** BFF 상태. 화면 상단 배지와 주문 폼의 실전/모의 판정에 쓴다. */
export const healthSchema = z.object({
  /** real 이면 실제 주문이 체결된다. 화면에 항상 표시할 것. */
  kiwoomEnv: tradingEnvSchema,
  upstream: z.enum(['connecting', 'ready', 'disconnected']),
  subscribedCodes: z.number(),
  /**
   * 실계좌 조회(잔고·미체결) 기능 활성 여부(ACCOUNT_ENABLED). false 면 프론트가 잔고
   * 메뉴·페이지를 감춘다. 구버전 서버 호환을 위해 없으면 활성으로 본다.
   */
  accountEnabled: z.boolean().default(true),
});

export type Health = z.infer<typeof healthSchema>;
