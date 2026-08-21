import { useEffect, useRef, useState } from 'react';
import type { Tick } from '@stock/contracts';
import { realtimeClient } from '@/shared/lib';

/**
 * 실시간 체결 스트림 구독.
 *
 * 종목코드만 넘기면 된다 — 키움의 REG/REMOVE·그룹번호(grp_no)·재접속 재등록은 BFF 가
 * 처리한다. `channel` 은 화면 단위 키로, 화면을 벗어나면 그 채널만 통째로 해지된다.
 *
 * 틱은 초당 수십 건까지 올 수 있어 상태를 매 틱마다 갱신하면 렌더가 밀린다. 그래서
 * 들어온 틱을 버퍼에 모으고 애니메이션 프레임 단위로만 커밋한다.
 */
export const useTickStream = (channel: string, codes: string[]): Map<string, Tick> => {
  const [ticks, setTicks] = useState<Map<string, Tick>>(new Map());
  const buffer = useRef<Map<string, Tick>>(new Map());
  const frame = useRef<number | null>(null);
  const codesKey = codes.join(',');

  useEffect(() => {
    const flush = () => {
      frame.current = null;
      if (buffer.current.size === 0) return;
      const pending = buffer.current;
      buffer.current = new Map();
      setTicks((previous) => {
        const next = new Map(previous);
        for (const [code, tick] of pending) next.set(code, tick);
        return next;
      });
    };

    const unsubscribe = realtimeClient.subscribe((message) => {
      if (message.type !== 'tick') return;
      buffer.current.set(message.payload.code, message.payload);
      frame.current ??= window.requestAnimationFrame(flush);
    });

    const targets = codesKey.length > 0 ? codesKey.split(',') : [];
    if (targets.length > 0) {
      realtimeClient.send({ type: 'subscribe', channel, codes: targets, streams: ['tick'] });
    }

    return () => {
      unsubscribe();
      realtimeClient.send({ type: 'unsubscribe', channel });
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [channel, codesKey]);

  return ticks;
};
