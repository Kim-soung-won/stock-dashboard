import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { previewTrade } from '@stock/contracts';
import { leaderboardQueries } from '@/entities/competition/leaderboard';
import {
  portfolioQueries,
  SIDE_LABEL,
  toTradeRequest,
  useTrade,
  validateTradeForm,
} from '@/entities/competition/portfolio';
import type { TradeFormValues } from '@/entities/competition/portfolio';
import { quoteQueries, useTickStream } from '@/entities/market/quote';
import { useMarketHours } from '@/entities/market/session';
import { useSymbolPicker } from '@/entities/market/symbol';
import type { SeedSymbol } from '@/entities/market/symbol';
import { formatWon } from '@/shared/lib';
import { Dialog, SymbolSearchInput } from '@/shared/ui';
import { TradeConfirm } from './components/trade-confirm';

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
 * **장 운영시간 밖에는 잠근다.** 장외에는 시세가 전일 종가로 멈춰 있어 이미 결과를 아는
 * 가격에 체결되기 때문이다. 실제로 막는 것은 서버이고 여기서는 미리 잠가 이유를 보여준다.
 *
 * 시장가라 사용자는 **얼마가 빠져나가는지 모른 채** 버튼을 누르게 된다. 그래서 바로
 * 체결하지 않고 확인 창을 띄워 거래대금·수수료·세금과 체결 후 예수금을 먼저 보여준다.
 * 금액 계산은 서버가 실제 현금을 옮길 때 쓰는 식(@stock/contracts previewTrade)과 같다.
 *
 * 체결가는 서버가 관측한 현재가로 정해지므로 단가 입력이 없다. 성공하면 포트폴리오·
 * 체결이력·리더보드를 무효화한다 — 여러 슬라이스를 건드리는 조합이라 이 features
 * 계층에서 한다(엔티티끼리 직접 참조하지 않는다).
 */
export const FormTrade = ({ symbol }: FormTradeProps = {}) => {
  const [values, setValues] = useState<TradeFormValues>(INITIAL);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();
  const trade = useTrade();
  const picker = useSymbolPicker(symbol);
  const marketHours = useMarketHours();

  // 종목코드는 폼 상태가 아니라 picker 가 확정하는 파생값이다(effect 로 되쓰지 않는다).
  const formValues: TradeFormValues = { ...values, code: picker.code ?? '' };

  // 확인 창에 보여줄 예상 체결가: REST 스냅샷 위에 실시간 틱을 얹는다(폴링 없음).
  const { data: quote } = useQuery(quoteQueries.detail(formValues.code));
  const ticks = useTickStream('trade', formValues.code ? [formValues.code] : []);
  const price = ticks.get(formValues.code)?.price ?? quote?.price ?? null;

  // 예수금·보유수량은 이미 받아둔 포트폴리오에서 읽는다(확인 창 때문에 더 부르지 않는다).
  const { data: portfolio } = useQuery(portfolioQueries.current());
  const holdingQuantity =
    portfolio?.holdings.find((holding) => holding.code === formValues.code)?.quantity ?? 0;

  const preview =
    price !== null && portfolio
      ? previewTrade({
          side: formValues.side,
          price,
          quantity: formValues.quantity,
          cash: portfolio.cash,
          holdingQuantity,
        })
      : null;

  const update = <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  /** 1단계: 입력을 검증하고 확인 창을 연다. 여기서 체결하지 않는다. */
  const askConfirm = () => {
    if (!marketHours.isOpen) return;
    const message = validateTradeForm(formValues);
    setValidationError(message);
    if (message) return;
    setIsConfirming(true);
  };

  /** 2단계: 사용자가 금액을 확인한 뒤 실제로 체결한다. */
  const confirm = () => {
    setIsConfirming(false);
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
        askConfirm();
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

      {marketHours.isOpen ? (
        <p className="form-trade__hint">시장가로 즉시 체결됩니다(체결가 = 현재 시세).</p>
      ) : (
        <p className="state state--error">
          {marketHours.closedReason} — 거래는 평일 09:00~15:30 에만 가능합니다.
        </p>
      )}

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
        disabled={trade.isPending || !picker.code || !marketHours.isOpen}
      >
        {trade.isPending ? '체결 중…' : marketHours.isOpen ? SIDE_LABEL[values.side] : '거래시간 아님'}
      </button>

      <Dialog
        open={isConfirming}
        onClose={() => setIsConfirming(false)}
        title={SIDE_LABEL[values.side] + ' 확인'}
        footer={
          <>
            <button type="button" onClick={() => setIsConfirming(false)}>
              취소
            </button>
            <button
              type="button"
              className={'btn-trade btn-trade--' + values.side}
              // 예상치를 못 만들었거나(시세·예수금 미도착) 서버가 거부할 상태면 잠근다.
              disabled={!preview || preview.blockedReason !== null}
              onClick={confirm}
            >
              {SIDE_LABEL[values.side]} 확정
            </button>
          </>
        }
      >
        {preview && price !== null ? (
          <TradeConfirm
            side={formValues.side}
            name={picker.name ?? formValues.code}
            code={formValues.code}
            quantity={formValues.quantity}
            price={price}
            preview={preview}
          />
        ) : (
          <p className="state">
            현재가와 예수금을 확인하는 중입니다. 시세를 받지 못하면 체결할 수 없습니다.
          </p>
        )}
      </Dialog>
    </form>
  );
};
