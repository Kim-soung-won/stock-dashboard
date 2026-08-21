import { useSuspenseQuery } from '@tanstack/react-query';
import { balanceQueries, sortPositions } from '@/entities/account/balance';
import { mergeTick, quoteQueries, useTickStream } from '@/entities/market/quote';
import { formatQuantity, formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';
import { PnlCell } from './components/pnl-cell';

/**
 * 보유 종목 표.
 *
 * 잔고는 REST(kt00018)로 받고, 현재가만 실시간으로 갱신한다. 평가손익을 프론트에서
 * 다시 계산하지 않는 이유는 수수료·세금 산정이 키움 쪽 값과 어긋나기 때문이다 —
 * 실시간 값은 "현재가"에만 반영하고 손익 숫자는 서버 값을 그대로 보여준다.
 */
export const TableBalance = () => {
  const { data: balance } = useSuspenseQuery(balanceQueries.balance());
  const positions = sortPositions(balance.positions);
  const codes = positions.map((position) => position.code);
  const ticks = useTickStream('balance', codes);

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>종목</th>
          <th className="grid__num">보유수량</th>
          <th className="grid__num">매입가</th>
          <th className="grid__num">현재가</th>
          <th className="grid__num">평가금액</th>
          <th className="grid__num">평가손익</th>
        </tr>
      </thead>
      <tbody>
        {positions.map((position) => {
          const tick = ticks.get(position.code);
          const currentPrice = tick?.price ?? position.currentPrice;
          return (
            <tr key={position.code}>
              <td>
                <span className="grid__name">{position.name}</span>
                <span className="grid__code">{position.code}</span>
              </td>
              <td className="grid__num">{formatQuantity(position.quantity)}</td>
              <td className="grid__num">{formatWon(position.averagePrice)}</td>
              <td className="grid__num">
                <ValueText value={formatWon(currentPrice)} direction={tick?.direction ?? 'flat'} />
              </td>
              <td className="grid__num">{formatWon(position.evaluationAmount)}</td>
              <td className="grid__num">
                <PnlCell amount={position.profitLoss} rate={position.profitLossRate} />
              </td>
            </tr>
          );
        })}
        {positions.length === 0 ? (
          <tr>
            <td colSpan={6} className="state">
              보유 종목이 없습니다.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
