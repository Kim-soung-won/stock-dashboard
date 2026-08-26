/**
 * KRX 정규장 운영시간 판정 (순수).
 *
 * **BFF 와 웹이 같은 규칙을 써야 한다.** 서버는 이 규칙으로 체결을 거부하고(강제),
 * 화면은 같은 규칙으로 버튼을 잠근다(안내). 규칙이 두 벌이면 "버튼은 눌리는데 서버가
 * 거부하는" 상태가 생기므로 여기 한 곳에만 둔다.
 *
 * 판정 기준은 **시계**다. 실시간 `0s`(장운영구분)가 더 정확하지만 장외에는 아예 오지
 * 않아서(구독은 성공하고 조용하다) "아직 못 받았다"와 "장이 닫혔다"를 구분할 수 없다 —
 * 거래를 막는 판단을 그런 신호에 걸 수 없다.
 *
 * **한계**: 공휴일은 걸러내지 못한다(휴장일 달력이 없다). 평일 09:00~15:30 이면 열린
 * 것으로 본다. 휴장일에는 시세가 전일 종가로 고정돼 있으므로, 그 값으로 체결되는 것을
 * 막으려면 별도의 휴장일 목록이 필요하다.
 */

/** 정규장 운영시간 (KST). 시간외 단일가·종가매매는 포함하지 않는다. */
export const KRX_SESSION = {
  timeZone: 'Asia/Seoul',
  /** 09:00 */
  openMinute: 9 * 60,
  /** 15:30 */
  closeMinute: 15 * 60 + 30,
  label: '평일 09:00~15:30 (KST)',
} as const;

/** KST 기준 요일·분. 서버가 어느 타임존에서 돌든 같은 값이 나와야 한다. */
interface KstMoment {
  /** 0=일 … 6=토 */
  weekday: number;
  /** 자정부터 흐른 분 */
  minuteOfDay: number;
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

// 포맷터는 만드는 비용이 있으므로 한 번만 만든다(매 체결마다 호출된다).
const kstFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: KRX_SESSION.timeZone,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * UTC 시각 → KST 요일·분.
 *
 * 서버 로컬 타임존에 기대지 않고 Intl 로 KST 를 직접 읽는다. 배포 환경이 UTC 여도
 * 개발 머신이 KST 여도 같은 판정이 나와야 한다.
 */
export const toKstMoment = (date: Date): KstMoment => {
  const parts = kstFormat.formatToParts(date);
  const at = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  // hour12:false 에서 자정을 "24" 로 주는 구현이 있다. 24 시는 0 시다.
  const hour = Number(at('hour')) % 24;
  return {
    weekday: WEEKDAY_INDEX[at('weekday')] ?? 0,
    minuteOfDay: hour * 60 + Number(at('minute')),
  };
};

/**
 * 지금이 정규장 시간인가.
 *
 * 경계는 **시작 포함, 종료 제외**다(09:00 체결 가능, 15:30 정각은 마감).
 * 주말은 항상 닫혀 있고, 공휴일은 판정하지 못한다(위 한계 참고).
 */
export const isKrxRegularSession = (date: Date): boolean => {
  const { weekday, minuteOfDay } = toKstMoment(date);
  if (weekday === 0 || weekday === 6) return false;
  return minuteOfDay >= KRX_SESSION.openMinute && minuteOfDay < KRX_SESSION.closeMinute;
};

/** 왜 지금 거래할 수 없는지 — 사용자에게 그대로 보여줄 문구. */
export const krxClosedReason = (date: Date): string => {
  const { weekday, minuteOfDay } = toKstMoment(date);
  if (weekday === 0 || weekday === 6) return '주말에는 거래할 수 없습니다';
  if (minuteOfDay < KRX_SESSION.openMinute) return '장 시작 전입니다 (09:00 개장)';
  return '장이 마감되었습니다 (15:30 마감)';
};
