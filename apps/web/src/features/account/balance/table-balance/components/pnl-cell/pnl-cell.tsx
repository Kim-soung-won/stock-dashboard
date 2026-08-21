import { formatRate, formatSignedWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

interface PnlCellProps {
  amount: number | null;
  rate: number | null;
}

/** 손익 금액 + 수익률을 한 칸에. 이 표에서만 쓰는 sub 컴포넌트라 코로케이션한다. */
export const PnlCell = ({ amount, rate }: PnlCellProps) => {
  const direction = (amount ?? 0) > 0 ? 'up' : (amount ?? 0) < 0 ? 'down' : 'flat';
  return (
    <div className="pnl-cell">
      <ValueText value={formatSignedWon(amount)} direction={direction} />
      <ValueText value={formatRate(rate)} direction={direction} size="sm" />
    </div>
  );
};
