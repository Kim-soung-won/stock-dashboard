import { useSuspenseQuery } from '@tanstack/react-query';
import { portfolioQueries, SIDE_LABEL } from '@/entities/competition/portfolio';
import { formatQuantity, formatSignedWon, formatWon } from '@/shared/lib';

/** 내 체결 이력(가상). append-only 저널을 최신순으로 보여준다. */
export const TableTrades = () => {
  const { data: trades } = useSuspenseQuery(portfolioQueries.trades());

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>시각</th>
          <th>종목</th>
          <th>구분</th>
          <th className="grid__num">수량</th>
          <th className="grid__num">체결가</th>
          <th className="grid__num">수수료+세금</th>
          <th className="grid__num">순현금</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <tr key={trade.id}>
            <td>{new Date(trade.at).toLocaleString('ko-KR')}</td>
            <td>
              <span className="grid__name">{trade.name}</span>
              <span className="grid__code">{trade.code}</span>
            </td>
            <td>
              <span className={'badge badge--' + trade.side}>{SIDE_LABEL[trade.side]}</span>
            </td>
            <td className="grid__num">{formatQuantity(trade.quantity)}</td>
            <td className="grid__num">{formatWon(trade.price)}</td>
            <td className="grid__num">{formatWon(trade.fee + trade.tax)}</td>
            <td className="grid__num">{formatSignedWon(trade.cashDelta)}</td>
          </tr>
        ))}
        {trades.length === 0 ? (
          <tr>
            <td colSpan={7} className="state">
              체결 이력이 없습니다.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
