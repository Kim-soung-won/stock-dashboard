import type { Server as HttpServer } from 'node:http';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { API_ROUTES, clientMessageSchema } from '@stock/contracts';
import type { ServerMessage } from '@stock/contracts';
import type { RealtimeType } from '@stock/kiwoom-codes';
import { WebSocket, WebSocketServer } from 'ws';
import { KiwoomWsSession } from '../kiwoom/kiwoom-ws.session';
import { toMarketStatus, toTick } from '../kiwoom/realtime.mapper';

interface Subscription {
  codes: string[];
  types: RealtimeType[];
}

/** 스트림 이름 → 키움 실시간 타입 */
const STREAM_TYPE: Readonly<Record<'tick' | 'orderBook', RealtimeType>> = {
  tick: '0B', // 주식체결
  orderBook: '0D', // 주식호가잔량
};

/**
 * 브라우저 ↔ BFF 실시간 채널.
 *
 * 키움 세션은 하나뿐이고(KiwoomWsSession), 이 게이트웨이가 화면별 구독을 그 위에
 * 다중화한다. 브라우저는 종목코드만 말하고 grp_no·REG/REMOVE·재등록은 알지 못한다.
 *
 * `@nestjs/websockets` 의 event/data 규약을 쓰지 않고 `ws` 서버를 직접 붙인다 —
 * 프론트와 주고받는 메시지 형태를 contracts 의 discriminated union 그대로 두기 위해서다.
 */
@Injectable()
export class RealtimeGateway implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RealtimeGateway.name);
  private server: WebSocketServer | null = null;
  private readonly clients = new Map<WebSocket, Map<string, Subscription>>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly session: KiwoomWsSession,
  ) {}

  onApplicationBootstrap(): void {
    const httpServer = this.adapterHost.httpAdapter.getHttpServer() as HttpServer;
    this.server = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      const path = (request.url ?? '').split('?')[0];
      if (path !== API_ROUTES.realtimeSocket) {
        socket.destroy();
        return;
      }
      this.server?.handleUpgrade(request, socket, head, (client) => {
        this.server?.emit('connection', client, request);
      });
    });

    this.server.on('connection', (client) => this.handleConnection(client));

    // 키움 → 브라우저 팬아웃
    this.session.on('real', (item) => {
      if (item.type === '0B') {
        const tick = toTick(item);
        // 구독 코드는 접미사 없는 6자리이므로 정규화된 code 로 매칭한다.
        this.broadcastToCode(tick.code, { type: 'tick', payload: tick });
        return;
      }
      if (item.type === '0s') {
        this.broadcastAll({ type: 'marketStatus', payload: toMarketStatus(item) });
      }
    });

    this.session.on('state', (state, message) => {
      this.broadcastAll({
        type: 'sessionState',
        payload: {
          upstream: state,
          subscribedCodes: this.session.subscribedCount,
          message: message ?? null,
        },
      });
    });

    this.logger.log(`실시간 채널 준비: ${API_ROUTES.realtimeSocket}`);
  }

  private handleConnection(client: WebSocket): void {
    this.clients.set(client, new Map());

    // 장 상태(0s)는 종목과 무관하므로 클라이언트가 붙으면 한 번만 등록한다.
    this.session.subscribe(['0s'], ['']);

    this.send(client, {
      type: 'sessionState',
      payload: {
        upstream: this.session.currentState,
        subscribedCodes: this.session.subscribedCount,
        message: null,
      },
    });

    client.on('message', (raw) => this.handleMessage(client, raw.toString()));
    client.on('close', () => this.handleClose(client));
    client.on('error', (error) => this.logger.warn(`클라이언트 오류: ${error.message}`));
  }

  private handleMessage(client: WebSocket, raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.send(client, { type: 'error', payload: { message: 'JSON 파싱 실패', kiwoomCode: null } });
      return;
    }

    const result = clientMessageSchema.safeParse(parsed);
    if (!result.success) {
      this.send(client, {
        type: 'error',
        payload: { message: '알 수 없는 메시지 형식입니다', kiwoomCode: null },
      });
      return;
    }

    const message = result.data;
    if (message.type === 'ping') {
      this.send(client, { type: 'pong' });
      return;
    }

    const channels = this.clients.get(client);
    if (!channels) return;

    if (message.type === 'unsubscribe') {
      const previous = channels.get(message.channel);
      if (previous) {
        this.session.unsubscribe(previous.types, previous.codes);
        channels.delete(message.channel);
      }
      return;
    }

    // subscribe: 같은 채널을 다시 구독하면 이전 구독을 해지하고 교체한다(화면 전환).
    const previous = channels.get(message.channel);
    if (previous) this.session.unsubscribe(previous.types, previous.codes);

    const types = message.streams.map((stream) => STREAM_TYPE[stream]);
    const subscription: Subscription = { codes: message.codes, types };
    channels.set(message.channel, subscription);
    this.session.subscribe(types, message.codes);
  }

  private handleClose(client: WebSocket): void {
    const channels = this.clients.get(client);
    if (channels) {
      for (const subscription of channels.values()) {
        this.session.unsubscribe(subscription.types, subscription.codes);
      }
    }
    this.session.unsubscribe(['0s'], ['']);
    this.clients.delete(client);
  }

  /** 해당 종목을 구독 중인 클라이언트에게만 보낸다. */
  private broadcastToCode(code: string, message: ServerMessage): void {
    for (const [client, channels] of this.clients) {
      const interested = [...channels.values()].some((subscription) =>
        subscription.codes.includes(code),
      );
      if (interested) this.send(client, message);
    }
  }

  private broadcastAll(message: ServerMessage): void {
    for (const client of this.clients.keys()) this.send(client, message);
  }

  private send(client: WebSocket, message: ServerMessage): void {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message));
  }

  onApplicationShutdown(): void {
    for (const client of this.clients.keys()) client.close();
    this.server?.close();
  }
}
