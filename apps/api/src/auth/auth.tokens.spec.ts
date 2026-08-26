import { describe, expect, it } from 'vitest';
import { hashPin, issueToken, TOKEN_TTL_MS, verifyPin, verifyToken } from './auth.tokens';

const SECRET = 'test-secret';

describe('PIN 해시', () => {
  it('같은 PIN 도 매번 다른 해시가 나오고, 검증은 통과한다', () => {
    const a = hashPin('1234');
    const b = hashPin('1234');
    expect(a).not.toBe(b); // salt 때문에 다름
    expect(verifyPin('1234', a)).toBe(true);
    expect(verifyPin('1234', b)).toBe(true);
  });

  it('틀린 PIN 은 거부한다', () => {
    expect(verifyPin('9999', hashPin('1234'))).toBe(false);
  });

  it('형식이 깨진 저장값은 거부한다', () => {
    expect(verifyPin('1234', 'not-a-valid-hash')).toBe(false);
  });
});

describe('로그인 토큰', () => {
  const now = 1_700_000_000_000;

  it('발급한 토큰은 같은 시크릿으로 참가자 id 를 되돌려 준다', () => {
    const token = issueToken('user-1', SECRET, now);
    expect(verifyToken(token, SECRET, now)).toBe('user-1');
  });

  it('다른 시크릿으로 서명 검증이 실패하면 null', () => {
    const token = issueToken('user-1', SECRET, now);
    expect(verifyToken(token, 'other-secret', now)).toBeNull();
  });

  it('만료된 토큰은 null', () => {
    const token = issueToken('user-1', SECRET, now);
    expect(verifyToken(token, SECRET, now + TOKEN_TTL_MS + 1)).toBeNull();
  });

  it('페이로드가 변조되면 서명이 어긋나 null', () => {
    const token = issueToken('user-1', SECRET, now);
    const [, signature] = token.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ sub: 'admin', exp: now + TOKEN_TTL_MS }),
    ).toString('base64url');
    expect(verifyToken(`${forgedBody}.${signature}`, SECRET, now)).toBeNull();
  });
});
