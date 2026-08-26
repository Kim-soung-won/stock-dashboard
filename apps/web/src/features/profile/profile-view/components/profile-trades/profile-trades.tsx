import type { PaperTrade } from '@stock/contracts';
import { formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

const SIDE_LABEL = { buy: '매수', sell: '매도' } as const;

/** 프로필 공개 최근 체결(읽기 전용, 최신순). 매수=상승색/매도=하락색으로 구분. */
export const ProfileTrades = ({ trades }: { trades: PaperTrade[] }) => {
  if (trades.length === 0) {
    return <p className="state">체결 이력이 없습니다.</p>;
  }

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>시각</th>
          <th>종목</th>
          <th>구분</th>
          <th className="grid__num">수량</th>
          <th className="grid__num">체결가</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((trade) => (
          <tr key={trade.id}>
            <td className="grid__code">{new Date(trade.at).toLocaleString('ko-KR')}</td>
            <td>
              <span className="grid__name">{trade.name}</span>
              <span className="grid__code">{trade.code}</span>
            </td>
            <td>
              <ValueText
                value={SIDE_LABEL[trade.side]}
                direction={trade.side === 'buy' ? 'up' : 'down'}
              />
            </td>
            <td className="grid__num">{trade.quantity.toLocaleString('ko-KR')}</td>
            <td className="grid__num">{formatWon(trade.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
