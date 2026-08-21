import { useSuspenseQuery } from '@tanstack/react-query';
import { balanceQueries, totalDirection } from '@/entities/account/balance';
import { formatRate, formatSignedWon, formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

/**
 * 잔고 요약 — 데이터 레이어.
 *
 * 요약 숫자는 서버(kt00018/kt00001) 값을 그대로 쓴다. 프론트에서 재계산하면
 * 수수료·세금 처리가 어긋나 "화면과 증권사 앱이 다른" 상황이 된다.
 *
 * 조회 실패는 감싸는 바운더리가 보여준다. 예전처럼 `?? null` 로 흘리면 실패와
 * "값이 0" 이 화면에서 똑같이 '-' 로 보여 원인을 알 수 없다.
 */
export const SummaryBalance = () => {
  const { data: balance } = useSuspenseQuery(balanceQueries.balance());
  const direction = totalDirection(balance);

  return (
    <div className="summary">
      <div className="summary__item">
        <span>총평가금액</span>
        <strong>{formatWon(balance.totalEvaluationAmount)}</strong>
      </div>
      <div className="summary__item">
        <span>총매입금액</span>
        <strong>{formatWon(balance.totalPurchaseAmount)}</strong>
      </div>
      <div className="summary__item">
        <span>총평가손익</span>
        <ValueText size="lg" value={formatSignedWon(balance.totalProfitLoss)} direction={direction} />
      </div>
      <div className="summary__item">
        <span>총수익률</span>
        <ValueText size="lg" value={formatRate(balance.totalProfitLossRate)} direction={direction} />
      </div>
      <div className="summary__item">
        <span>예수금 / 주문가능</span>
        <strong>
          {formatWon(balance.deposit)} / {formatWon(balance.orderableCash)}
        </strong>
      </div>
    </div>
  );
};
