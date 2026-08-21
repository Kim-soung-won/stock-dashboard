import { API_ROUTES, serverMessageSchema } from '@stock/contracts';
import type { ClientMessage, ServerMessage } from '@stock/contracts';
import { debugLog } from './debug-log';

/**
 * BFF 실시간 채널 클라이언트 (도메인 무관 인프라).
 *
 * 키움에 직접 붙지 않는다 — 붙으면 토큰이 브라우저에 노출되고, 탭마다 유량을 나눠 쓰게
 * 된다. 여기서는 BFF 의 `/ws` 하나만 보고, 화면 단위 구독은 `channel` 문자열로 구분한다.
 */

type Listener = (message: ServerMessage) => void;

const RECONNECT_MS = 2_000;
const PING_INTERVAL_MS = 30_000;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<Listener>();
  /** 재접속 시 되돌려야 할 구독 상태 */
  private readonly channels = new Map<string, ClientMessage>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.ensureSocket();
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** 화면 단위 구독. 같은 channel 로 다시 부르면 교체된다. */
  send(message: ClientMessage): void {
    if (message.type === 'subscribe') this.channels.set(message.channel, message);
    if (message.type === 'unsubscribe') this.channels.delete(message.channel);

    this.ensureSocket();
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private ensureSocket(): void {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return;

    const url = new URL(API_ROUTES.realtimeSocket, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      debugLog.push('info', 'ws', `연결됨 (채널 ${this.channels.size}개 재등록)`);
      // 재접속하면 서버 쪽 구독이 사라졌으므로 보관해둔 채널을 다시 등록한다.
      for (const message of this.channels.values()) socket.send(JSON.stringify(message));
      this.pingTimer = setInterval(() => this.send({ type: 'ping' }), PING_INTERVAL_MS);
    });

    socket.addEventListener('message', (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const result = serverMessageSchema.safeParse(parsed);
      if (!result.success) {
        debugLog.push('warn', 'ws', '알 수 없는 서버 메시지', String(event.data).slice(0, 500));
        return;
      }
      // 시세 틱은 초당 수십 건이라 로그에 남기지 않는다. 상태·에러만 남긴다.
      if (result.data.type === 'sessionState') {
        debugLog.push(
          result.data.payload.upstream === 'disconnected' ? 'warn' : 'info',
          'ws',
          `업스트림 ${result.data.payload.upstream} (구독 ${result.data.payload.subscribedCodes}건)`,
          result.data.payload.message ?? undefined,
        );
      }
      if (result.data.type === 'error') {
        debugLog.push('error', 'ws', result.data.payload.message,
          result.data.payload.kiwoomCode ? `키움 코드: ${result.data.payload.kiwoomCode}` : undefined);
      }
      for (const listener of this.listeners) listener(result.data);
    });

    socket.addEventListener('close', () => {
      debugLog.push('warn', 'ws', 'BFF 실시간 채널 연결 종료 — 재연결 예정');
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      this.socket = null;
      if (this.listeners.size === 0) return;
      this.reconnectTimer ??= setTimeout(() => {
        this.reconnectTimer = null;
        this.ensureSocket();
      }, RECONNECT_MS);
    });
  }
}

/** 앱 전체에서 하나만 쓴다(탭 하나 = 연결 하나). */
export const realtimeClient = new RealtimeClient();
