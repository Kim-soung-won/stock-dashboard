import { FormLogin } from '@/features/auth/login';

/**
 * 로그인/참가 화면. 앱 셸(사이드바) 밖의 독립 화면이다 — 로그인 전에는 메뉴가 없다.
 */
export const LoginPage = () => (
  <div className="auth-page">
    <div className="auth-card">
      <h1 className="auth-card__title">모의투자 리그</h1>
      <p className="auth-card__lead">
        모두 100만원으로 시작해 실시간 시세로 겨루는 모의투자 경쟁.
      </p>
      <FormLogin />
    </div>
  </div>
);
