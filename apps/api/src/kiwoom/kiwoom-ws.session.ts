import { EventEmitter } from 'node:events';
import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import type { RealtimeType } from '@stock/kiwoom-codes';
import WebSocket from 'ws';
import { ENV, type Env, kiwoomHosts } from '../config/env';
import { KiwoomTokenService } from './kiwoom-token.service';

export interface RealtimeItem {
  type: RealtimeType;
  item: string;
  values: Record<string, string>;
}

export type UpstreamState = 'connecting' | 'ready' | 'disconnected';

interface SessionEvents {
  real: (item: RealtimeItem) => void;
  state: (state: UpstreamState, message?: string) => void;
}

/** 재접속 백오프 (ms). 마지막 값에서 더 늘리지 않는다. */
const BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/**
 * 키움 실시간 WebSocket 세션 — 프로세스 전체에서 **하나만** 유지한다.
 *
 * 브라우저 탭마다 연결하면 (1) 토큰이 노출되고 (2) 앱 단위 유량을 나눠 쓰게 되고
 * (3) 재접속마다 등록이 초기화되는 문제를 각 탭이 따로 겪는다. 그래서 BFF 가 단일
 * 세션을 들고, 화면별 구독은 refcount 로 이 세션 위에 다중화한다.
 *
 * 프로토콜(스펙 JSON 에는 페이로드만 있고 핸드셰이크는 문서 기준):
 *   접속 → `{trnm:'LOGIN', token}` → `{trnm:'REG', grp_no, refresh, data:[{item,type}]}`
 *   → 수신 `{trnm:'REAL', data:[{type,name,item,values:{FID:값}}]}`
 *   서버가 보내는 `{trnm:'PING'}` 은 **받은 그대로 되돌려** 연결을 유지한다.
 */
@Injectable()
export class KiwoomWsSession extends EventEmitter implements OnApplicationShutdown {
  private readonly logger = new Logger(KiwoomWsSession.name);
  private socket: WebSocket | null = null;
  private state: UpstreamState = 'disconnected';
  private attempt = 0;
  private stopped = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  /** (실시간타입 → 종목코드 → 구독 참조수). 재접속 시 이 표를 그대로 재등록한다. */
  private readonly desired = new Map<RealtimeType, Map<string, number>>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly tokenService: KiwoomTokenService,
  ) {
    super();
  }

  override on<K extends keyof SessionEvents>(event: K, listener: SessionEvents[K]): this {
    return super.on(event, listener);
  }

  get currentState(): UpstreamState {
    return this.state;
  }

  get subscribedCount(): number {
    let count = 0;
    for (const items of this.desired.values()) count += items.size;
    return count;
  }

  /** 구독 추가. 이미 등록된 (타입, 종목)은 참조수만 올린다. */
  subscribe(types: RealtimeType[], codes: string[]): void {
    const added: { type: RealtimeType; codes: string[] }[] = [];
    for (const type of types) {
      const items = this.desired.get(type) ?? new Map<string, number>();
      const fresh: string[] = [];
      for (const code of codes) {
        const next = (items.get(code) ?? 0) + 1;
        if (next === 1) fresh.push(code);
        items.set(code, next);
      }
      this.desired.set(type, items);
      if (fresh.length > 0) added.push({ type, codes: fresh });
    }
    void this.ensureConnected();
    for (const entry of added) this.sendRegister(entry.type, entry.codes);
  }

  /** 구독 해제. 참조수가 0이 된 (타입, 종목)만 키움에 REMOVE 를 보낸다. */
  unsubscribe(types: RealtimeType[], codes: string[]): void {
    for (const type of types) {
      const items = this.desired.get(type);
      if (!items) continue;
      const removed: string[] = [];
      for (const code of codes) {
        const next = (items.get(code) ?? 0) - 1;
        if (next <= 0) {
          items.delete(code);
          removed.push(code);
        } else {
          items.set(code, next);
        }
      }
      if (items.size === 0) this.desired.delete(type);
      if (removed.length > 0) this.send({ trnm: 'REMOVE', grp_no: '1', data: [{ item: removed, type: [type] }] });
    }
  }

  async ensureConnected(): Promise<void> {
    if (this.socket || this.stopped) return;
    this.setState('connecting');

    const { ws } = kiwoomHosts(this.env);
    const url = `${ws}/api/dostk/websocket`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.on('open', async () => {
      try {
        const token = await this.tokenService.getToken();
        this.send({ trnm: 'LOGIN', token });
      } catch (error) {
        this.logger.error(`LOGIN 전송 실패: ${(error as Error).message}`);
        socket.close();
      }
    });

    socket.on('message', (raw) => this.handleMessage(raw.toString()));

    socket.on('close', () => {
      this.socket = null;
      if (this.stopped) return;
      this.setState('disconnected', '키움 세션이 끊어졌습니다');
      this.scheduleReconnect();
    });

    socket.on('error', (error) => {
      this.logger.warn(`WebSocket 오류: ${error.message}`);
    });
  }

  private handleMessage(raw: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.logger.warn(`파싱 불가 메시지: ${raw.slice(0, 200)}`);
      return;
    }

    const trnm = message['trnm'];

    // PING 은 받은 그대로 돌려보낸다.
    if (trnm === 'PING') {
      this.send(message);
      return;
    }

    if (trnm === 'LOGIN') {
      if (message['return_code'] === 0) {
        this.attempt = 0;
        this.setState('ready');
        this.reregisterAll();
      } else {
        this.setState('disconnected', String(message['return_msg'] ?? 'LOGIN 실패'));
        this.logger.error(`LOGIN 실패: ${String(message['return_msg'] ?? '')}`);
        this.socket?.close();
      }
      return;
    }

    if (trnm === 'REAL') {
      const items = (message['data'] as RealtimeItem[] | undefined) ?? [];
      for (const item of items) this.emit('real', item);
      return;
    }

    if (trnm === 'REG' || trnm === 'REMOVE') {
      if (message['return_code'] !== 0) {
        this.logger.warn(`${String(trnm)} 실패: ${String(message['return_msg'] ?? '')}`);
      }
    }
  }

  /** 재접속하면 기존 등록이 사라지므로 desired 표를 다시 전송한다. */
  private reregisterAll(): void {
    for (const [type, items] of this.desired) {
      const codes = [...items.keys()];
      if (codes.length > 0) this.sendRegister(type, codes);
    }
  }

  private sendRegister(type: RealtimeType, codes: string[]): void {
    // refresh:'1' = 기존 등록 유지. '0' 이면 기존 등록이 해지되고 교체된다.
    this.send({ trnm: 'REG', grp_no: '1', refresh: '1', data: [{ item: codes, type: [type] }] });
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)] ?? 30_000;
    this.attempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private setState(state: UpstreamState, message?: string): void {
    this.state = state;
    this.emit('state', state, message);
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }
}
