import type { SeasonStatus } from '@stock/contracts';

export const SEASON_STATUS_LABEL: Readonly<Record<SeasonStatus, string>> = {
  upcoming: '시작 예정',
  active: '진행 중',
  ended: '종료',
};

/** 종료까지 남은 일수. 종료됐으면 null. */
export const daysUntil = (endAtIso: string, now = Date.now()): number | null => {
  const remainMs = new Date(endAtIso).getTime() - now;
  if (remainMs <= 0) return null;
  return Math.ceil(remainMs / (24 * 60 * 60 * 1000));
};

/** "D-12" / "종료" 형태의 배지 문자열. */
export const formatDday = (endAtIso: string, status: SeasonStatus, now = Date.now()): string => {
  if (status === 'ended') return '종료';
  const days = daysUntil(endAtIso, now);
  return days === null ? '종료' : `D-${days}`;
};
