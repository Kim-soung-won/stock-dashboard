import { useSuspenseQuery } from '@tanstack/react-query';
import { portfolioQueries, usePortfolioLiveSync } from '@/entities/competition/portfolio';
import { formatRate, formatSignedWon, formatWon, signDirection } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

/**
 * 내 포트폴리오 요약 — 데이터 레이어.
 *
 * 평가는 서버가 WS 시세로 계산한다. usePortfolioLiveSync 가 순위 갱신 시점에 맞춰
 * 이 값을 다시 읽어 내 수익률이 실시간처럼 흐르게 한다.
 */
export const SummaryPortfolio = () => {
  usePortfolioLiveSync();
  const { data: portfolio } = useSuspenseQuery(portfolioQueries.current());
  const direction = signDirection(portfolio.totalProfitLoss);

  return (
    <div className="summary">
      <div className="summary__item">
        <span>총평가금액</span>
        <strong>{formatWon(portfolio.totalValue)}</strong>
      </div>
      <div className="summary__item">
        <span>현금</span>
        <strong>{formatWon(portfolio.cash)}</strong>
      </div>
      <div className="summary__item">
        <span>시드머니</span>
        <strong>{formatWon(portfolio.startingCash)}</strong>
      </div>
      <div className="summary__item">
        <span>총손익</span>
        <ValueText size="lg" value={formatSignedWon(portfolio.totalProfitLoss)} direction={direction} />
      </div>
      <div className="summary__item">
        <span>총수익률</span>
        <ValueText size="lg" value={formatRate(portfolio.totalProfitLossRate)} direction={direction} />
      </div>
    </div>
  );
};
