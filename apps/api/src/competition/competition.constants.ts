/**
 * 경쟁 규칙 상수 — 한 곳에서만 조정한다.
 *
 * **수수료·세금과 체결 금액 계산은 `@stock/contracts` 가 소유한다.** 화면이 매매 확인
 * 창에서 "체결하면 예수금이 이렇게 됩니다"를 미리 보여주는데, 그 식이 서버와 다르면
 * 안내한 금액과 실제 차감액이 어긋난다. 여기서는 다시 내보내기만 해서 이 모듈의
 * 호출부가 계속 한 곳(`competition.constants`)만 보게 한다.
 */
export {
  BUY_FEE_RATE,
  SELL_FEE_RATE,
  SELL_TAX_RATE,
  feeOf,
  previewTrade,
} from '@stock/contracts';

/** 모두가 같은 금액으로 시작한다. */
export const STARTING_CASH = 1_000_000;

/** 시즌 기본 기간(일). 시드 시즌 생성에만 쓰인다. */
export const SEASON_DURATION_DAYS = 30;

/** 리더보드 브로드캐스트 주기(ms). 시세가 움직인 경우에만 실제로 내보낸다. */
export const LEADERBOARD_BROADCAST_MS = 2_000;

/**
 * 일별 종가 스냅샷 크론 — 평일(월~금) 장마감 15:30(KST)에 하루 한 번 적재한다.
 * 장중 5분 간격으로 촘촘히 남기면 톱니처럼 튀고 저장도 폭증해서, 하루 1점(종가)만 남긴다.
 */
export const SNAPSHOT_CRON = '30 15 * * 1-5';
export const SNAPSHOT_TIMEZONE = 'Asia/Seoul';

/** 추이 라인차트가 보여주는 기간(일). 이 창 안의 일별 스냅샷만 조회한다. */
export const HISTORY_WINDOW_DAYS = 30;

/** 종목코드 정규화 — 거래소 접미사를 떼고 6자리 기준으로 맞춘다(구독·시세 매칭 일관성). */
export const normalizeCode = (code: string): string => {
  const trimmed = code.trim();
  return trimmed.split('_')[0] || trimmed;
};
