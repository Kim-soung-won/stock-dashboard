import { describe, expect, it } from 'vitest';
import { isKrxRegularSession, krxClosedReason, toKstMoment } from './market-hours';

/**
 * 거래를 막는 규칙이라 **경계와 타임존**을 못 박는다. 서버가 UTC 에서 돌아도 KST 로
 * 판정해야 하고(배포 환경이 KST 가 아니다), 09:00 정각은 열림·15:30 정각은 마감이다.
 *
 * 기준일: 2026-08-26 은 수요일, 08-29 는 토요일, 08-30 은 일요일.
 * KST = UTC+9 이므로 UTC 02:00 = KST 11:00.
 */
describe('isKrxRegularSession', () => {
  const at = (iso: string) => isKrxRegularSession(new Date(iso));

  it('평일 장중이면 열려 있다', () => {
    expect(at('2026-08-26T02:00:00.000Z')).toBe(true); // 수 11:00 KST
  });

  it('09:00 정각은 열린 것으로 본다(시작 포함)', () => {
    expect(at('2026-08-26T00:00:00.000Z')).toBe(true); // 수 09:00 KST
  });

  it('09:00 1분 전은 닫혀 있다', () => {
    expect(at('2026-08-25T23:59:00.000Z')).toBe(false); // 수 08:59 KST
  });

  it('15:30 정각은 마감으로 본다(종료 제외)', () => {
    expect(at('2026-08-26T06:30:00.000Z')).toBe(false); // 수 15:30 KST
  });

  it('15:29 는 아직 열려 있다', () => {
    expect(at('2026-08-26T06:29:00.000Z')).toBe(true); // 수 15:29 KST
  });

  it('시간외 단일가 시간대는 정규장이 아니다', () => {
    expect(at('2026-08-26T08:00:00.000Z')).toBe(false); // 수 17:00 KST
  });

  it('주말은 장중 시간이어도 닫혀 있다', () => {
    expect(at('2026-08-29T02:00:00.000Z')).toBe(false); // 토 11:00 KST
    expect(at('2026-08-30T02:00:00.000Z')).toBe(false); // 일 11:00 KST
  });

  it('UTC 로는 전날이어도 KST 기준으로 판정한다', () => {
    // UTC 2026-08-25(화) 23:59 = KST 2026-08-26(수) 08:59 → 아직 장 시작 전
    expect(at('2026-08-25T23:59:00.000Z')).toBe(false);
    // UTC 2026-08-28(금) 23:59 = KST 2026-08-29(토) 08:59 → 주말
    expect(at('2026-08-28T23:59:00.000Z')).toBe(false);
  });

  it('KST 자정을 요일 경계로 넘긴다', () => {
    // UTC 금 15:00 = KST 토 00:00 — 주말로 넘어갔다
    const moment = toKstMoment(new Date('2026-08-28T15:00:00.000Z'));
    expect(moment.weekday).toBe(6);
    expect(moment.minuteOfDay).toBe(0);
  });
});

describe('krxClosedReason', () => {
  const reasonAt = (iso: string) => krxClosedReason(new Date(iso));

  it('주말과 장 시작 전·마감 후를 구분해 알려준다', () => {
    expect(reasonAt('2026-08-29T02:00:00.000Z')).toContain('주말');
    expect(reasonAt('2026-08-25T23:30:00.000Z')).toContain('장 시작 전');
    expect(reasonAt('2026-08-26T07:00:00.000Z')).toContain('마감');
  });
});
