import { z } from 'zod';
import { holdingSchema, paperTradeSchema, participantSchema } from './competition';
import { watchlistItemSchema } from './watchlist';

/**
 * 프로필 도메인 계약 (SNS 형태 — 남이 조회 가능).
 *
 * 프로필은 여러 도메인을 **읽기 전용으로 합친 뷰**다: 참가자 신원(competition) + 경쟁
 * 지표(리더보드/포트폴리오) + 보유·체결(competition) + 관심종목(watchlist). 조회는 공개고,
 * 편집은 본인만(닉네임/PIN 은 여기서 바꾸지 않는다 — bio·아바타만).
 */

/** 프로필 요약 지표 — 리더보드 공개 지표와 동일 계열. */
export const profileStatsSchema = z.object({
  /** 현재 시즌 순위. 아직 매매 전이라 순위에 없으면 null. */
  rank: z.number().nullable(),
  /** 총평가금액(원) */
  totalValue: z.number(),
  /** 총손익(원) */
  totalProfitLoss: z.number(),
  /** 총수익률 % */
  totalProfitLossRate: z.number(),
  /** 보유 종목 수 */
  holdingCount: z.number(),
});
export type ProfileStats = z.infer<typeof profileStatsSchema>;

/** 공개 프로필 전체. 조회자가 본인인지는 클라이언트가 세션 id 로 판정한다(서버는 공개). */
export const participantProfileSchema = z.object({
  participant: participantSchema,
  stats: profileStatsSchema,
  holdings: z.array(holdingSchema),
  /** 최근 체결(최신순, 상한 있음) */
  recentTrades: z.array(paperTradeSchema),
  watchlist: z.array(watchlistItemSchema),
});
export type ParticipantProfile = z.infer<typeof participantProfileSchema>;

/** 프로필 편집(본인). 보낸 필드만 갱신하며, null 은 "지움"을 뜻한다. */
export const updateProfileRequestSchema = z.object({
  bio: z.string().max(140).nullable().optional(),
  avatarEmoji: z.string().max(16).nullable().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
