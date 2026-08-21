import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { balanceQueries } from '@/entities/account/balance';
import { healthQueries } from '@/entities/system/health';
import {
  ORDER_TYPE_LABEL,
  SIDE_LABEL,
  createIdempotencyKey,
  orderQueries,
  toPlaceOrderRequest,
  usePlaceOrder,
  validateOrderForm,
} from '@/entities/trading/order';
import type { OrderFormValues } from '@/entities/trading/order';
import { formatWon } from '@/shared/lib';

const INITIAL: OrderFormValues = {
  code: '',
  side: 'buy',
  orderType: 'limit',
  quantity: 1,
  price: 0,
};

/**
 * 주문 폼.
 *
 * 안전장치를 UI 에 박아둔다:
 *  1. 실전(real) 환경이면 확인 체크박스 없이는 전송 버튼이 활성되지 않는다.
 *  2. 전송 중에는 버튼을 잠근다(중복 클릭 = 중복 주문).
 *  3. 멱등키는 제출 시점에 1개 생성하고, 성공/실패가 확정될 때까지 재사용한다.
 *  4. 응답은 "접수"다. 체결 확정은 실시간 00 이벤트로 저널 상태가 바뀔 때 확인한다.
 */
export const FormOrder = () => {
  const [values, setValues] = useState<OrderFormValues>(INITIAL);
  const [confirmedReal, setConfirmedReal] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [validationError, setValidationError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: health } = useQuery(healthQueries.status());
  const { data: orderability } = useQuery(
    orderQueries.orderability(values.code, values.orderType === 'limit' ? values.price : 0),
  );
  const placeOrder = usePlaceOrder();

  const isReal = health?.kiwoomEnv === 'real';
  const blockedByRealGuard = isReal && !confirmedReal;

  const update = <K extends keyof OrderFormValues>(key: K, value: OrderFormValues[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const submit = () => {
    const message = validateOrderForm(values);
    setValidationError(message);
    if (message || !health) return;

    placeOrder.mutate(toPlaceOrderRequest(values, health.kiwoomEnv, idempotencyKey), {
      onSettled: () => {
        // 접수 이후 잔고·미체결·저널이 모두 변한다. 조합은 이 계층에서 한다.
        void queryClient.invalidateQueries({ queryKey: balanceQueries.all() });
        void queryClient.invalidateQueries({ queryKey: orderQueries.all() });
      },
      onSuccess: () => {
        // 다음 주문은 새 멱등키로. 같은 키를 재사용하면 서버가 재전송을 막는다.
        setIdempotencyKey(createIdempotencyKey());
        setConfirmedReal(false);
      },
    });
  };

  return (
    <form
      className="form-order"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={'form-order__env ' + (isReal ? 'form-order__env--real' : '')}>
        {isReal ? '실전 계좌 — 실제 주문이 체결됩니다' : '모의투자 환경'}
      </div>

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
            onChange={(event) => update('side', event.target.value as OrderFormValues['side'])}
          >
            {(['buy', 'sell'] as const).map((side) => (
              <option key={side} value={side}>
                {SIDE_LABEL[side]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>가격유형</span>
          <select
            value={values.orderType}
            onChange={(event) =>
              update('orderType', event.target.value as OrderFormValues['orderType'])
            }
          >
            {(['limit', 'market'] as const).map((type) => (
              <option key={type} value={type}>
                {ORDER_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>수량(주)</span>
          <input
            type="number"
            min={1}
            value={values.quantity}
            onChange={(event) => update('quantity', Number(event.target.value))}
          />
        </label>

        <label className="field">
          <span>단가(원)</span>
          <input
            type="number"
            min={0}
            value={values.price}
            disabled={values.orderType === 'market'}
            onChange={(event) => update('price', Number(event.target.value))}
          />
        </label>
      </div>

      {orderability ? (
        <p className="form-order__hint">
          주문가능금액 {formatWon(orderability.orderableCash)}원 / 주문가능수량{' '}
          {formatWon(orderability.orderableQuantity)}주
        </p>
      ) : null}

      {isReal ? (
        <label className="form-order__confirm">
          <input
            type="checkbox"
            checked={confirmedReal}
            onChange={(event) => setConfirmedReal(event.target.checked)}
          />
          실전 주문임을 확인했습니다
        </label>
      ) : null}

      {validationError ? <p className="state state--error">{validationError}</p> : null}
      {placeOrder.isError ? (
        <p className="state state--error">주문 실패: {placeOrder.error.message}</p>
      ) : null}
      {placeOrder.data ? (
        <p className="state state--ok">
          접수됨 — 주문번호 {placeOrder.data.orderNo ?? '-'} (체결은 별도 확인)
        </p>
      ) : null}

      <button type="submit" disabled={placeOrder.isPending || blockedByRealGuard}>
        {placeOrder.isPending ? '전송 중…' : SIDE_LABEL[values.side] + ' 주문'}
      </button>
    </form>
  );
};
