import { useMutation } from '@tanstack/react-query';
import type { TradeRequest } from '@stock/contracts';
import { PortfolioService } from '@/shared/api/competition/portfolio';

/**
 * 시장가 매매.
 *
 * 자동 재시도는 끈다 — 실패한 매매를 조용히 다시 보내지 않는다. 성공 후 포트폴리오·
 * 리더보드 무효화는 이 훅이 하지 않고 features 계층에서 조합한다(같은 계층 슬라이스
 * 교차 금지).
 */
export const useTrade = () =>
  useMutation({
    mutationFn: (request: TradeRequest) => PortfolioService.trade(request),
    retry: false,
  });
