import { z } from 'zod';
import { orderSideSchema } from './account';

/**
 * 모의투자 경쟁 도메인 계약.
 *
 * 실제 시세와 달리 **여기서 다루는 잔고·체결은 우리 DB 가 진실**이다(페이퍼 트레이딩).
 * 키움 단일 피드는 시세 제공에만 쓰고, 참가자별 가상 100만원 포트폴리오·체결·순위는
 * BFF 가 계산·보관한다. 클라이언트가 보낸 가격은 신뢰하지 않고 서버가 관측한
 * 최신 시세로만 체결한다.
 *
 * 금액 단위는 전부 원(정수)이다. 수익률은 % (부호 있음).
 */

/* ------------------------------------------------------------------ 인증 */

/** 닉네임 규칙 — 리더보드에 그대로 노출되므로 공백/특수문자를 제한한다. */
export const nicknameSchema = z
  .string()
  .trim()
  .min(2, '닉네임은 2자 이상이어야 합니다')
  .max(16, '닉네임은 16자 이하여야 합니다');

/** PIN — 숫자 4~8자리. 해시는 BFF 에서만 다루고 계약에는 평문이 오간다(HTTPS 전제). */
export const pinSchema = z
  .string()
  .regex(/^\d{4,8}$/, 'PIN 은 숫자 4~8자리입니다');

/**
 * 로그인(=참가) 요청.
 *
 * 닉네임이 처음이면 그 PIN 으로 참가자를 만들고(자동 참가), 이미 있으면 PIN 을 검증한다.
 * 캐주얼 경쟁이라 별도 회원가입 단계를 두지 않는다.
 */
export const loginRequestSchema = z.object({
  nickname: nicknameSchema,
  pin: pinSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** 참가자 공개 정보(비밀번호 해시는 절대 나가지 않는다). */
export const participantSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  createdAt: z.string(),
});
export type Participant = z.infer<typeof participantSchema>;

/** 로그인 응답 — Bearer 토큰 + 참가자. 토큰은 Authorization 헤더로 되돌려 보낸다. */
export const authSessionSchema = z.object({
  token: z.string(),
  participant: participantSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

/* ------------------------------------------------------------------ 시즌 */

export const seasonStatusSchema = z.enum(['upcoming', 'active', 'ended']);
export type SeasonStatus = z.infer<typeof seasonStatusSchema>;

export const seasonSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** 시드머니(원). 모두 같은 금액으로 시작한다 */
  startingCash: z.number(),
  /** ISO. 이 창(startAt~endAt) 밖에서는 체결이 거부된다 */
  startAt: z.string(),
  endAt: z.string(),
  status: seasonStatusSchema,
});
export type Season = z.infer<typeof seasonSchema>;

/* ------------------------------------------------------------------ 포트폴리오 */

/** 보유 종목 1건 — 현재가로 평가한 스냅샷. */
export const holdingSchema = z.object({
  code: z.string(),
  name: z.string(),
  /** 보유수량(주) */
  quantity: z.number(),
  /** 매입평균가(원, 수수료 제외) */
  averagePrice: z.number(),
  /** 서버가 관측한 현재가(원). 아직 시세가 없으면 null */
  currentPrice: z.number().nullable(),
  /** 평가금액(원) = 수량 × 현재가 */
  evaluationAmount: z.number().nullable(),
  /** 평가손익(원). 부호 있음 */
  profitLoss: z.number().nullable(),
  /** 수익률 %. 부호 있음 */
  profitLossRate: z.number().nullable(),
});
export type Holding = z.infer<typeof holdingSchema>;

/** 내 포트폴리오 — 현금 + 보유 + 총평가. */
export const portfolioSchema = z.object({
  seasonId: z.string(),
  participant: participantSchema,
  /** 시드머니(원) */
  startingCash: z.number(),
  /** 현재 현금 잔고(원) */
  cash: z.number(),
  /** 총평가금액(원) = 현금 + 보유평가합 */
  totalValue: z.number(),
  /** 총손익(원) = 총평가금액 − 시드머니 */
  totalProfitLoss: z.number(),
  /** 총수익률 % */
  totalProfitLossRate: z.number(),
  holdings: z.array(holdingSchema),
  at: z.string(),
});
export type Portfolio = z.infer<typeof portfolioSchema>;

/* ------------------------------------------------------------------ 체결 */

/**
 * 매매 요청.
 *
 * 시장가만 지원한다(MVP). 가격은 서버가 관측한 최신 시세로 결정하므로 요청에 넣지 않는다
 * — 클라이언트가 유리한 가격을 지정하는 것을 원천 차단한다.
 */
export const tradeRequestSchema = z.object({
  code: z.string().min(6).max(12),
  side: orderSideSchema,
  quantity: z.number().int().positive(),
});
export type TradeRequest = z.infer<typeof tradeRequestSchema>;

/** 가상 체결 1건(저널). */
export const paperTradeSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  side: orderSideSchema,
  quantity: z.number(),
  /** 체결 단가(원) */
  price: z.number(),
  /** 거래대금(원) = 수량 × 단가 */
  amount: z.number(),
  /** 매매수수료(원) */
  fee: z.number(),
  /** 거래세(원, 매도만) */
  tax: z.number(),
  /** 이 체결로 오간 순현금(원). 매수는 음수, 매도는 양수 */
  cashDelta: z.number(),
  at: z.string(),
});
export type PaperTrade = z.infer<typeof paperTradeSchema>;

/** 매매 응답 — 체결 결과 + 갱신된 포트폴리오. */
export const tradeResultSchema = z.object({
  trade: paperTradeSchema,
  portfolio: portfolioSchema,
});
export type TradeResult = z.infer<typeof tradeResultSchema>;

/* ------------------------------------------------------------------ 리더보드 */

/** 리더보드 한 줄 — 참가자 1명의 순위·수익률. */
export const leaderboardEntrySchema = z.object({
  rank: z.number(),
  participantId: z.string(),
  nickname: z.string(),
  /** 총평가금액(원) */
  totalValue: z.number(),
  /** 총손익(원) */
  totalProfitLoss: z.number(),
  /** 총수익률 % — 랭킹 기준 */
  totalProfitLossRate: z.number(),
  /** 보유 종목 수 */
  holdingCount: z.number(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

/** 리더보드 전체 — 시즌 정보 + 순위. */
export const leaderboardSchema = z.object({
  season: seasonSchema,
  entries: z.array(leaderboardEntrySchema),
  at: z.string(),
});
export type Leaderboard = z.infer<typeof leaderboardSchema>;
