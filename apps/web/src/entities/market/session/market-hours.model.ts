import { useEffect, useState } from 'react';
import { isKrxRegularSession, krxClosedReason } from '@stock/contracts';

export interface MarketHoursState {
  /** 지금 거래할 수 있는가. 서버가 쓰는 규칙과 같다(@stock/contracts). */
  isOpen: boolean;
  /** 닫혀 있을 때 사용자에게 보여줄 사유. 열려 있으면 null. */
  closedReason: string | null;
}

/** 경계(09:00·15:30)를 늦어도 이만큼 안에 반영한다. */
const TICK_MS = 30_000;

const read = (): MarketHoursState => {
  const now = new Date();
  return isKrxRegularSession(now)
    ? { isOpen: true, closedReason: null }
    : { isOpen: false, closedReason: krxClosedReason(now) };
};

/**
 * 장 운영시간 — **화면용 안내**.
 *
 * 거래를 실제로 막는 것은 서버다(BFF 가 체결 전에 거부한다). 이 훅은 같은 규칙으로
 * 버튼을 미리 잠가 "눌렀는데 거부당하는" 경험을 없애는 용도다. 규칙은 서버와 공유하는
 * `@stock/contracts` 한 곳에서 온다 — 두 벌로 두면 서로 어긋난다.
 *
 * 실시간 `0s` 장 상태(useSessionState().phase)를 쓰지 않는 이유: 장외에는 이벤트가
 * 아예 오지 않아 "아직 못 받았다"와 "닫혔다"를 구분할 수 없다. 그래서 시계로 판정한다.
 *
 * 경계를 넘는 순간(09:00·15:30) 화면이 저절로 바뀌어야 하므로 짧은 주기로 다시 읽는다.
 * 시세 폴링이 아니라 로컬 시계 확인이라 네트워크를 쓰지 않는다.
 */
export const useMarketHours = (): MarketHoursState => {
  const [state, setState] = useState<MarketHoursState>(read);

  useEffect(() => {
    const timer = setInterval(() => {
      // 값이 그대로면 setState 를 호출해도 리렌더가 없다(객체를 새로 만들지 않는다).
      setState((previous) => {
        const next = read();
        return next.isOpen === previous.isOpen && next.closedReason === previous.closedReason
          ? previous
          : next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return state;
};
