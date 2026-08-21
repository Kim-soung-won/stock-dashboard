import { useSuspenseQuery } from '@tanstack/react-query';
import { ORDER_STATUS_LABEL, SIDE_LABEL, orderQueries } from '@/entities/trading/order';
import { formatQuantity, formatWon } from '@/shared/lib';

/**
 * 주문 저널.
 *
 * 키움 조회가 아니라 **우리 DB** 를 보여준다. 전송 시각·멱등키·상태 전이가 여기 남아
 * 있어야 "보냈는데 응답을 못 받은 주문"을 사람이 판단할 수 있다.
 */
export const TableOrderJournal = () => {
  // 로딩·에러는 감싸는 QueryErrorBoundary 가 처리한다(데이터 레이어).
  const { data: orders } = useSuspenseQuery(orderQueries.journal());

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>시각</th>
          <th>종목</th>
          <th>구분</th>
          <th className="grid__num">수량</th>
          <th className="grid__num">단가</th>
          <th>상태</th>
          <th>주문번호</th>
          <th>환경</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{new Date(order.createdAt).toLocaleTimeString('ko-KR')}</td>
            <td>
              <span className="grid__name">{order.name ?? order.code}</span>
              <span className="grid__code">{order.code}</span>
            </td>
            <td>{SIDE_LABEL[order.side]}</td>
            <td className="grid__num">
              {formatQuantity(order.filledQuantity)} / {formatQuantity(order.quantity)}
            </td>
            <td className="grid__num">{formatWon(order.price)}</td>
            <td>
              <span className={'badge badge--' + order.status}>
                {ORDER_STATUS_LABEL[order.status]}
              </span>
              {order.failureReason ? (
                <span className="grid__code">{order.failureReason}</span>
              ) : null}
            </td>
            <td>{order.orderNo ?? '-'}</td>
            <td>
              <span className={'badge badge--env-' + order.env}>{order.env}</span>
            </td>
          </tr>
        ))}
        {orders.length === 0 ? (
          <tr>
            <td colSpan={8} className="state">
              주문 이력이 없습니다.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
