import { useEffect, useState } from 'react';
import type { MarketPhase } from '@stock/contracts';
import { realtimeClient } from '@/shared/lib';

export interface SessionState {
  /** 키움 ↔ BFF 업스트림 상태. disconnected 면 화면 값이 멈춘 값이다. */
  upstream: 'connecting' | 'ready' | 'disconnected';
  subscribedCodes: number;
  /** 실시간 0s(장시작시간)에서 받은 장 상태 */
  phase: MarketPhase;
  message: string | null;
}

const INITIAL: SessionState = {
  upstream: 'connecting',
  subscribedCodes: 0,
  phase: 'unknown',
  message: null,
};

/**
 * 실시간 세션·장 상태.
 *
 * 대시보드는 "지금 값이 살아있는 값인지"를 반드시 보여줘야 한다. 업스트림이 끊긴 채
 * 마지막 가격이 그대로 떠 있으면 사용자는 그것을 현재가로 오인한다.
 */
export const useSessionState = (): SessionState => {
  const [state, setState] = useState<SessionState>(INITIAL);

  useEffect(
    () =>
      realtimeClient.subscribe((message) => {
        if (message.type === 'sessionState') {
          setState((previous) => ({
            ...previous,
            upstream: message.payload.upstream,
            subscribedCodes: message.payload.subscribedCodes,
            message: message.payload.message,
          }));
          return;
        }
        if (message.type === 'marketStatus') {
          setState((previous) => ({ ...previous, phase: message.payload.phase }));
        }
      }),
    [],
  );

  return state;
};

export const MARKET_PHASE_LABEL: Readonly<Record<MarketPhase, string>> = {
  preOpen: '장 시작 전',
  open: '장중',
  closed: '장 마감',
  afterHours: '시간외',
  unknown: '알 수 없음',
};
