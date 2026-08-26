import { z } from 'zod';

/**
 * 관심 종목 도메인 계약.
 *
 * 참가자(로그인)별 관심 종목 목록. **시세는 저장하지 않는다** — 저장하는 것은 코드와
 * 표시용 이름 스냅샷뿐이고, 현재가·등락률은 조회 시점에 실시간(WS)으로 붙인다.
 * `(participantId, code)` 는 유일하다(같은 종목을 두 번 담지 않는다).
 */
export const watchlistItemSchema = z.object({
  /** 6자리 종목코드 */
  code: z.string(),
  /** 추가 시점의 표시용 이름 스냅샷. 코드만으로 담았으면 null 일 수 있다. */
  name: z.string().nullable(),
  /** 담은 시각 (ISO) */
  createdAt: z.string(),
});
export type WatchlistItem = z.infer<typeof watchlistItemSchema>;

/** 관심 종목 추가 요청. name 은 표시용(선택) — 없으면 서버가 종목 캐시에서 채운다. */
export const addWatchlistRequestSchema = z.object({
  code: z.string().min(6).max(12),
  name: z.string().max(40).optional(),
});
export type AddWatchlistRequest = z.infer<typeof addWatchlistRequestSchema>;
