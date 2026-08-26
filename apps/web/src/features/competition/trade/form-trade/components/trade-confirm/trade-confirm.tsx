import type { OrderSide, TradePreview } from '@stock/contracts';
import { SIDE_LABEL } from '@/entities/competition/portfolio';
import { formatSignedWon, formatWon } from '@/shared/lib';
import { ValueText } from '@/shared/ui';

interface TradeConfirmProps {
  side: OrderSide;
  name: string;
  code: string;
  quantity: number;
  price: number;
  preview: TradePreview;
}

/**
 * 매매 확인 내역 — 예수금이 어떻게 변하는지 보여준다.
 *
 * 이 화면의 목적은 "정말요?"를 묻는 게 아니라 **숫자를 보여주는 것**이다. 시장가라
 * 사용자는 얼마가 빠져나가는지 모른 채 버튼을 누르게 되므로, 거래대금·수수료·세금을
 * 나눠 보여주고 체결 후 예수금까지 계산해 둔다.
 *
 * 금액은 `@stock/contracts` 의 previewTrade 가 계산한다 — 서버가 실제 현금을 옮길 때
 * 쓰는 식과 같은 것이라, 여기 적힌 숫자와 실제 차감액이 어긋나지 않는다.
 */
export const TradeConfirm = ({
  side,
  name,
  code,
  quantity,
  price,
  preview,
}: TradeConfirmProps) => (
  <>
    <dl className="trade-confirm">
      <div className="trade-confirm__row">
        <dt>종목</dt>
        <dd>
          <span className="grid__name">{name}</span>
          <span className="grid__code">{code}</span>
        </dd>
      </div>
      <div className="trade-confirm__row">
        <dt>구분</dt>
        <dd>
          <ValueText value={SIDE_LABEL[side]} direction={side === 'buy' ? 'up' : 'down'} />
        </dd>
      </div>
      <div className="trade-confirm__row">
        <dt>수량 × 예상 체결가</dt>
        <dd>
          {quantity.toLocaleString('ko-KR')}주 × {formatWon(price)}원
        </dd>
      </div>

      <div className="trade-confirm__row">
        <dt>거래대금</dt>
        <dd>{formatWon(preview.amount)}원</dd>
      </div>
      <div className="trade-confirm__row">
        <dt>수수료</dt>
        <dd>{formatWon(preview.fee)}원</dd>
      </div>
      {side === 'sell' ? (
        <div className="trade-confirm__row">
          <dt>거래세</dt>
          <dd>{formatWon(preview.tax)}원</dd>
        </div>
      ) : null}

      {/* 이 줄이 이 창의 핵심이다 — 예수금이 얼마에서 얼마가 되는가. */}
      <div className="trade-confirm__row trade-confirm__row--total">
        <dt>{side === 'buy' ? '결제대금' : '정산금액'}</dt>
        <dd>
          <ValueText
            value={formatSignedWon(preview.cashDelta) + '원'}
            direction={preview.cashDelta >= 0 ? 'up' : 'down'}
          />
        </dd>
      </div>
      <div className="trade-confirm__row trade-confirm__row--total">
        <dt>체결 후 예수금</dt>
        <dd>
          {formatWon(preview.cashBefore)}원 → <strong>{formatWon(preview.cashAfter)}원</strong>
        </dd>
      </div>
    </dl>

    {preview.blockedReason ? (
      <p className="state state--error">{preview.blockedReason}</p>
    ) : (
      // 시장가라 체결가는 서버가 관측한 시세로 정해진다. "예상"임을 숨기지 않는다.
      <p className="trade-confirm__note">
        시장가 주문입니다. 실제 체결가는 서버가 체결 시점에 관측한 시세로 정해지므로 위
        금액과 다를 수 있습니다.
      </p>
    )}
  </>
);
