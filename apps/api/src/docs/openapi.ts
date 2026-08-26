import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';
import type { OpenAPIObject } from '@nestjs/swagger';
import * as C from '@stock/contracts';
import { z } from 'zod';

/**
 * OpenAPI(Swagger) 문서를 packages/contracts 의 **zod 계약에서 직접 생성**한다.
 *
 * 컨트롤러에 `@Api*` 데코레이터를 달지 않는다 — 스키마의 진실은 계약 하나뿐이라,
 * 계약이 바뀌면 이 문서도 자동으로 따라온다(중복 정의 없음). 라우트 문자열은 실제
 * 컨트롤러 경로와 같은 `API_ROUTES` 는 `:code` 형태라, 여기서는 OpenAPI 규격의
 * `{code}` 로만 바꿔 적는다(경로가 어긋나면 컴파일이 아니라 이 파일만 고치면 된다).
 */

// zod 프로토타입에 .openapi() 를 붙인다(계약 패키지와 동일한 zod 인스턴스에 적용됨).
extendZodWithOpenApi(z);

export function buildOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  // 경쟁 도메인은 Bearer 토큰(HMAC 서명)으로 인증한다.
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    description: '/api/auth/login 이 돌려준 토큰. `Authorization: Bearer <token>`',
  });

  // ---- 응답 봉투 / 목록 헬퍼 (top-level 은 code/message/data 만) ----
  const res = (data: z.ZodTypeAny) => C.apiResponseSchema(data);
  const list = (item: z.ZodTypeAny) => C.listPayloadSchema(item);
  const jsonRes = (schema: z.ZodTypeAny, description = '성공') => ({
    200: { description, content: { 'application/json': { schema: res(schema) } } },
  });

  // ---- 재사용 컴포넌트로 등록(=$ref). 등록이 반환한 스키마를 써야 참조가 걸린다 ----
  const Health = registry.register('Health', C.healthSchema);
  const StockSymbol = registry.register('StockSymbol', C.stockSymbolSchema);
  const Quote = registry.register('Quote', C.quoteSchema);
  const Candle = registry.register('Candle', C.candleSchema);
  const RankingItem = registry.register('RankingItem', C.rankingItemSchema);
  const OrderBook = registry.register('OrderBook', C.orderBookSchema);
  const Balance = registry.register('Balance', C.balanceSchema);
  const PendingOrder = registry.register('PendingOrder', C.pendingOrderSchema);
  const OrderRecord = registry.register('OrderRecord', C.orderRecordSchema);
  const Orderability = registry.register('Orderability', C.orderabilitySchema);
  const AuthSession = registry.register('AuthSession', C.authSessionSchema);
  const Participant = registry.register('Participant', C.participantSchema);
  const Season = registry.register('Season', C.seasonSchema);
  const Leaderboard = registry.register('Leaderboard', C.leaderboardSchema);
  const LeaderboardHistory = registry.register('LeaderboardHistory', C.leaderboardHistorySchema);
  const Portfolio = registry.register('Portfolio', C.portfolioSchema);
  const PaperTrade = registry.register('PaperTrade', C.paperTradeSchema);
  const TradeResult = registry.register('TradeResult', C.tradeResultSchema);
  const LoginRequest = registry.register('LoginRequest', C.loginRequestSchema);
  const PlaceOrderRequest = registry.register('PlaceOrderRequest', C.placeOrderRequestSchema);
  const CancelOrderRequest = registry.register('CancelOrderRequest', C.cancelOrderRequestSchema);
  const TradeRequest = registry.register('TradeRequest', C.tradeRequestSchema);
  const WatchlistItem = registry.register('WatchlistItem', C.watchlistItemSchema);
  const AddWatchlistRequest = registry.register(
    'AddWatchlistRequest',
    C.addWatchlistRequestSchema,
  );
  const ParticipantProfile = registry.register(
    'ParticipantProfile',
    C.participantProfileSchema,
  );
  const UpdateProfileRequest = registry.register(
    'UpdateProfileRequest',
    C.updateProfileRequestSchema,
  );

  const codeParam = z.object({
    code: z.string().openapi({ description: '6자리 종목코드', example: '005930' }),
  });
  const jsonBody = (schema: z.ZodTypeAny) => ({
    body: { content: { 'application/json': { schema } } },
  });

  // ============================ System ============================
  registry.registerPath({
    method: 'get',
    path: '/api/health',
    tags: ['System'],
    summary: 'BFF 상태 (키움 환경/업스트림/구독 수)',
    responses: jsonRes(Health),
  });

  // ============================ Market ============================
  registry.registerPath({
    method: 'get',
    path: '/api/market/symbols',
    tags: ['Market'],
    summary: '종목 마스터 목록',
    request: { query: z.object({ market: C.marketKindSchema.default('kospi') }) },
    responses: jsonRes(list(StockSymbol)),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/market/symbols/search',
    tags: ['Market'],
    summary: '종목명·코드 검색(전 시장 통합)',
    request: {
      query: z.object({
        keyword: z.string().min(1).max(40),
        limit: z.coerce.number().int().min(1).max(50).default(20),
      }),
    },
    responses: jsonRes(list(StockSymbol)),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/market/quote/{code}',
    tags: ['Market'],
    summary: '현재가 스냅샷',
    request: { params: codeParam },
    responses: jsonRes(Quote),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/market/candles/{code}',
    tags: ['Market'],
    summary: '봉 데이터(일/분봉)',
    request: {
      params: codeParam,
      query: z.object({
        interval: C.candleIntervalSchema.default('day'),
        baseDate: z
          .string()
          .regex(/^\d{8}$/)
          .optional()
          .openapi({ description: 'yyyyMMDD 기준일', example: '20260826' }),
      }),
    },
    responses: jsonRes(list(Candle)),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/market/ranking/{kind}',
    tags: ['Market'],
    summary: '순위 조회 (인기·거래량·거래대금·등락률·시가총액)',
    request: {
      params: z.object({ kind: C.rankingKindSchema }),
      query: z.object({ market: C.rankingMarketSchema.default('all') }),
    },
    responses: jsonRes(list(RankingItem)),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/market/order-book/{code}',
    tags: ['Market'],
    summary: '호가창',
    request: { params: codeParam },
    responses: jsonRes(OrderBook),
  });

  // ============================ Account ============================
  registry.registerPath({
    method: 'get',
    path: '/api/account/balance',
    tags: ['Account'],
    summary: '계좌 잔고 + 보유 종목 (키움 스냅샷)',
    responses: jsonRes(Balance),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/account/pending-orders',
    tags: ['Account'],
    summary: '미체결 주문',
    request: { query: z.object({ code: z.string().min(6).max(12).optional() }) },
    responses: jsonRes(list(PendingOrder)),
  });

  // ============================ Trading ============================
  registry.registerPath({
    method: 'post',
    path: '/api/trading/orders',
    tags: ['Trading'],
    summary: '주문 접수 (멱등키 필수)',
    request: jsonBody(PlaceOrderRequest),
    responses: jsonRes(OrderRecord),
  });
  registry.registerPath({
    method: 'post',
    path: '/api/trading/orders/cancel',
    tags: ['Trading'],
    summary: '주문 취소',
    request: jsonBody(CancelOrderRequest),
    responses: jsonRes(OrderRecord),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/trading/orderability/{code}',
    tags: ['Trading'],
    summary: '주문가능 금액·수량 사전 확인',
    request: {
      params: codeParam,
      query: z.object({ price: z.coerce.number().int().nonnegative() }),
    },
    responses: jsonRes(Orderability),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/trading/orders',
    tags: ['Trading'],
    summary: '주문 저널 (우리 DB)',
    responses: jsonRes(list(OrderRecord)),
  });

  // ============================ Auth ============================
  registry.registerPath({
    method: 'post',
    path: '/api/auth/login',
    tags: ['Auth'],
    summary: '참가(신규)/로그인 — Bearer 토큰 발급',
    request: jsonBody(LoginRequest),
    responses: jsonRes(AuthSession),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/auth/me',
    tags: ['Auth'],
    summary: '현재 토큰의 참가자',
    security: [{ bearerAuth: [] }],
    responses: jsonRes(Participant),
  });

  // ============================ Competition ============================
  registry.registerPath({
    method: 'get',
    path: '/api/competition/season',
    tags: ['Competition'],
    summary: '현재 활성 시즌 (공개)',
    responses: jsonRes(Season),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/competition/leaderboard',
    tags: ['Competition'],
    summary: '전체 순위 (공개)',
    responses: jsonRes(Leaderboard),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/competition/leaderboard/history',
    tags: ['Competition'],
    summary: '참가자별 총평가금액 추이 (공개, 라인차트용)',
    responses: jsonRes(LeaderboardHistory),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/competition/portfolio',
    tags: ['Competition'],
    summary: '내 포트폴리오 (인증)',
    security: [{ bearerAuth: [] }],
    responses: jsonRes(Portfolio),
  });
  registry.registerPath({
    method: 'post',
    path: '/api/competition/trade',
    tags: ['Competition'],
    summary: '시장가 매매 (인증)',
    security: [{ bearerAuth: [] }],
    request: jsonBody(TradeRequest),
    responses: jsonRes(TradeResult),
  });
  registry.registerPath({
    method: 'get',
    path: '/api/competition/trades',
    tags: ['Competition'],
    summary: '내 체결 이력 (인증)',
    security: [{ bearerAuth: [] }],
    responses: jsonRes(list(PaperTrade)),
  });

  // ============================ Watchlist ============================
  registry.registerPath({
    method: 'get',
    path: '/api/watchlist',
    tags: ['Watchlist'],
    summary: '내 관심종목 목록 (인증)',
    security: [{ bearerAuth: [] }],
    responses: jsonRes(list(WatchlistItem)),
  });
  registry.registerPath({
    method: 'post',
    path: '/api/watchlist',
    tags: ['Watchlist'],
    summary: '관심종목 추가 (인증, 멱등) — 갱신된 전체 목록 반환',
    security: [{ bearerAuth: [] }],
    request: jsonBody(AddWatchlistRequest),
    responses: jsonRes(list(WatchlistItem)),
  });
  registry.registerPath({
    method: 'delete',
    path: '/api/watchlist/{code}',
    tags: ['Watchlist'],
    summary: '관심종목 삭제 (인증, 멱등) — 갱신된 전체 목록 반환',
    security: [{ bearerAuth: [] }],
    request: { params: codeParam },
    responses: jsonRes(list(WatchlistItem)),
  });

  // ============================ Profile ============================
  registry.registerPath({
    method: 'get',
    path: '/api/participants/{id}/profile',
    tags: ['Profile'],
    summary: '공개 프로필 조회 (SNS) — 요약·보유·최근 체결·관심종목',
    request: { params: z.object({ id: z.string().openapi({ description: '참가자 id' }) }) },
    responses: jsonRes(ParticipantProfile),
  });
  registry.registerPath({
    method: 'patch',
    path: '/api/profile',
    tags: ['Profile'],
    summary: '내 프로필(bio·아바타) 수정 (인증)',
    security: [{ bearerAuth: [] }],
    request: jsonBody(UpdateProfileRequest),
    responses: jsonRes(ParticipantProfile),
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'STOCK ARCADE BFF API',
      version: '0.1.0',
      description:
        '키움 OpenAPI 프록시 + 모의투자 경쟁 BFF. 모든 스키마는 packages/contracts 의 zod 계약에서 생성됩니다. 응답은 `{ code, message, data }` 봉투로 감싸며 code=0 이 정상입니다.',
    },
    servers: [{ url: '/' }],
  }) as OpenAPIObject;
}
