import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequestSchema } from '@stock/contracts';
import { useLogin } from '@/entities/auth/session';
import { pathKeys } from '@/shared/lib';

/**
 * 참가/로그인 폼.
 *
 * 닉네임이 처음이면 그 PIN 으로 자동 참가하고, 이미 있으면 PIN 을 검증한다(서버 규칙).
 * 성공하면 내 포트폴리오로 이동한다.
 */
export const FormLogin = () => {
  const navigate = useNavigate();
  const login = useLogin();
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = () => {
    const parsed = loginRequestSchema.safeParse({ nickname, pin });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? '입력을 확인하세요');
      return;
    }
    setValidationError(null);
    login.mutate(parsed.data, {
      onSuccess: () => navigate(pathKeys.competition.portfolio),
    });
  };

  return (
    <form
      className="form-login"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="field">
        <span>닉네임</span>
        <input
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          placeholder="리더보드에 표시됩니다"
          maxLength={16}
          autoFocus
        />
      </label>

      <label className="field">
        <span>PIN (숫자 4~8자리)</span>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
          placeholder="비밀번호 대신 쓰는 PIN"
          maxLength={8}
        />
      </label>

      <p className="form-login__hint">
        처음 쓰는 닉네임이면 이 PIN 으로 <strong>참가</strong>하고, 이미 있으면 로그인합니다.
      </p>

      {validationError ? <p className="state state--error">{validationError}</p> : null}
      {login.isError ? <p className="state state--error">{login.error.message}</p> : null}

      <button type="submit" disabled={login.isPending}>
        {login.isPending ? '확인 중…' : '시작하기'}
      </button>
    </form>
  );
};
