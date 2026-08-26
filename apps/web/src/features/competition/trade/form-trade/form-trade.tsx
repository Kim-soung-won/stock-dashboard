import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { leaderboardQueries } from '@/entities/competition/leaderboard';
import {
  portfolioQueries,
  SIDE_LABEL,
  toTradeRequest,
  useTrade,
  validateTradeForm,
} from '@/entities/competition/portfolio';
import type { TradeFormValues } from '@/entities/competition/portfolio';
import { formatWon } from '@/shared/lib';

const INITIAL: TradeFormValues = { code: '', side: 'buy', quantity: 1 };

/**
 * 매매 폼 (시장가).
 *
 * 체결가는 서버가 관측한 현재가로 정해지므로 단가 입력이 없다. 성공하면 포트폴리오·
 * 체결이력·리더보드를 무효화한다 — 여러 슬라이스를 건드리는 조합이라 이 features
 * 계층에서 한다(엔티티끼리 직접 참조하지 않는다).
 */
export const FormTrade = () => {
  const [values, setValues] = useState<TradeFormValues>(INITIAL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const trade = useTrade();

  const update = <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const submit = () => {
    const message = validateTradeForm(values);
    setValidationError(message);
    if (message) return;

    trade.mutate(toTradeRequest(values), {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: portfolioQueries.all() });
        void queryClient.invalidateQueries({ queryKey: leaderboardQueries.all() });
      },
    });
  };

  return (
    <form
      className="form-trade"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="field">
        <span>종목코드</span>
        <input
          value={values.code}
          onChange={(event) => update('code', event.target.value.trim())}
          placeholder="005930"
          maxLength={12}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>구분</span>
          <select
            value={values.side}
            onChange={(event) => update('side', event.target.value as TradeFormValues['side'])}
          >
            {(['buy', 'sell'] as const).map((side) => (
              <option key={side} value={side}>
                {SIDE_LABEL[side]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>수량(주)</span>
          <input
            type="number"
            min={1}
            value={values.quantity}
            onChange={(event) => update('quantity', Number(event.target.value))}
          />
        </label>
      </div>

      <p className="form-trade__hint">시장가로 즉시 체결됩니다(체결가 = 현재 시세).</p>

      {validationError ? <p className="state state--error">{validationError}</p> : null}
      {trade.isError ? <p className="state state--error">체결 실패: {trade.error.message}</p> : null}
      {trade.data ? (
        <p className="state state--ok">
          {SIDE_LABEL[trade.data.trade.side]} 체결 — {trade.data.trade.name}{' '}
          {trade.data.trade.quantity}주 @ {formatWon(trade.data.trade.price)}원 (수수료·세금{' '}
          {formatWon(trade.data.trade.fee + trade.data.trade.tax)}원)
        </p>
      ) : null}

      <button
        type="submit"
        className={'btn-trade btn-trade--' + values.side}
        disabled={trade.isPending}
      >
        {trade.isPending ? '체결 중…' : SIDE_LABEL[values.side]}
      </button>
    </form>
  );
};
