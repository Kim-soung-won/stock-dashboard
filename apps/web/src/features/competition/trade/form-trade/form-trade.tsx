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
import { useSymbolPicker } from '@/entities/market/symbol';
import type { SeedSymbol } from '@/entities/market/symbol';
import { formatWon } from '@/shared/lib';
import { SymbolSearchInput } from '@/shared/ui';

const INITIAL: TradeFormValues = { code: '', side: 'buy', quantity: 1 };

interface FormTradeProps {
  /**
   * 미리 채울 종목. 차트 옆에 붙는 주문 창처럼 "지금 보고 있는 종목"이 있을 때 넘긴다.
   * 종목이 바뀌면 호출부가 `key={symbol.code}` 로 폼을 갈아끼운다.
   */
  symbol?: SeedSymbol | null;
}

/**
 * 매매 폼 (시장가).
 *
 * 종목은 **이름으로 검색해 고른다**(코드를 그대로 붙여넣어도 된다). 확정된 코드는
 * useSymbolPicker 가 판정하고, 정해지기 전에는 제출을 막는다. `symbol` 을 받으면
 * 그 종목으로 시작한다 — 차트 옆에 붙어 "보는 중인 종목을 바로 매매"하는 용도다.
 *
 * 체결가는 서버가 관측한 현재가로 정해지므로 단가 입력이 없다. 성공하면 포트폴리오·
 * 체결이력·리더보드를 무효화한다 — 여러 슬라이스를 건드리는 조합이라 이 features
 * 계층에서 한다(엔티티끼리 직접 참조하지 않는다).
 */
export const FormTrade = ({ symbol }: FormTradeProps = {}) => {
  const [values, setValues] = useState<TradeFormValues>(INITIAL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const trade = useTrade();
  const picker = useSymbolPicker(symbol);

  // 종목코드는 폼 상태가 아니라 picker 가 확정하는 파생값이다(effect 로 되쓰지 않는다).
  const formValues: TradeFormValues = { ...values, code: picker.code ?? '' };

  const update = <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const submit = () => {
    const message = validateTradeForm(formValues);
    setValidationError(message);
    if (message) return;

    trade.mutate(toTradeRequest(formValues), {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: portfolioQueries.all() });
        void queryClient.invalidateQueries({ queryKey: leaderboardQueries.all() });
        picker.reset();
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
        <span>종목</span>
        <SymbolSearchInput
          value={picker.query}
          onChange={picker.onChange}
          suggestions={picker.suggestions}
          isSearching={picker.isSearching}
          onPick={picker.onPick}
          placeholder="종목명 또는 코드 (예: 삼성전자)"
        />
        <span className="field__hint">
          {picker.code ? '선택: ' + picker.code : '이름으로 검색해 종목을 고르세요'}
        </span>
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
        disabled={trade.isPending || !picker.code}
      >
        {trade.isPending ? '체결 중…' : SIDE_LABEL[values.side]}
      </button>
    </form>
  );
};
