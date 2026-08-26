/**
 * 익명/디바이스 식별자 (도메인 무관 인프라).
 *
 * 로그인 여부와 무관하게 모든 요청에 `X-User-Id` 로 실어, 서버가 비로그인 트래픽까지
 * 귀속시킬 수 있게 한다. 로그인 사용자의 **신뢰 신원은 Bearer 토큰**이고(서버가 확정),
 * 이 값은 위조 가능한 보조 식별자다 — 같은 디바이스의 익명→로그인 세션을 잇는 용도.
 */

const CLIENT_ID_KEY = 'ui.clientId';

export const getClientId = (): string => {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage 불가 환경(프라이빗 모드 등)에서는 세션 한정 값으로 대체.
    return 'anonymous';
  }
};
