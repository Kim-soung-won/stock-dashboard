import type { Holding } from '@stock/contracts';
import { formatRate, formatSignedWon, formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

/** 프로필 공개 보유 종목(읽기 전용). 손익 부호로 방향색을 정한다. */
export const ProfileHoldings = ({ holdings }: { holdings: Holding[] }) => {
  if (holdings.length === 0) {
    return <p className="state">보유 종목이 없습니다.</p>;
  }

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>종목</th>
          <th className="grid__num">수량</th>
          <th className="grid__num">평균가</th>
          <th className="grid__num">현재가</th>
          <th className="grid__num">평가손익</th>
          <th className="grid__num">수익률</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((holding) => {
          const direction =
            holding.profitLoss === null ? 'flat' : holding.profitLoss >= 0 ? 'up' : 'down';
          return (
            <tr key={holding.code}>
              <td>
                <span className="grid__name">{holding.name}</span>
                <span className="grid__code">{holding.code}</span>
              </td>
              <td className="grid__num">{holding.quantity.toLocaleString('ko-KR')}</td>
              <td className="grid__num">{formatWon(holding.averagePrice)}</td>
              <td className="grid__num">{formatWon(holding.currentPrice)}</td>
              <td className="grid__num">
                <ValueText value={formatSignedWon(holding.profitLoss)} direction={direction} />
              </td>
              <td className="grid__num">
                <ValueText value={formatRate(holding.profitLossRate)} direction={direction} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
