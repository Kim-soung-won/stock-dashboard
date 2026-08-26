import { useSuspenseQuery } from '@tanstack/react-query';
import { portfolioQueries } from '@/entities/competition/portfolio';
import { formatQuantity, formatRate, formatSignedWon, formatWon, signDirection } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

/** 보유 종목 — 현재가로 평가한 스냅샷(서버 계산). */
export const TableHoldings = () => {
  const { data: portfolio } = useSuspenseQuery(portfolioQueries.current());

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>종목</th>
          <th className="grid__num">수량</th>
          <th className="grid__num">평균단가</th>
          <th className="grid__num">현재가</th>
          <th className="grid__num">평가금액</th>
          <th className="grid__num">평가손익</th>
          <th className="grid__num">수익률</th>
        </tr>
      </thead>
      <tbody>
        {portfolio.holdings.map((holding) => {
          const direction = signDirection(holding.profitLoss);
          return (
            <tr key={holding.code}>
              <td>
                <span className="grid__name">{holding.name}</span>
                <span className="grid__code">{holding.code}</span>
              </td>
              <td className="grid__num">{formatQuantity(holding.quantity)}</td>
              <td className="grid__num">{formatWon(holding.averagePrice)}</td>
              <td className="grid__num">{formatWon(holding.currentPrice)}</td>
              <td className="grid__num">{formatWon(holding.evaluationAmount)}</td>
              <td className="grid__num">
                <ValueText value={formatSignedWon(holding.profitLoss)} direction={direction} />
              </td>
              <td className="grid__num">
                <ValueText value={formatRate(holding.profitLossRate)} direction={direction} />
              </td>
            </tr>
          );
        })}
        {portfolio.holdings.length === 0 ? (
          <tr>
            <td colSpan={7} className="state">
              보유 종목이 없습니다. 매수로 시작하세요.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
