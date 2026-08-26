import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * 인증 프리미티브 — 외부 라이브러리 없이 Node `crypto` 만 쓴다.
 *
 * 캐주얼 경쟁이라 무거운 세션 스택(passport·jwt 라이브러리)을 들이지 않는다.
 * PIN 은 scrypt 로 해시하고, 로그인 토큰은 HMAC 서명한 `payload.signature` 문자열이다.
 * 토큰은 상태가 없어(stateless) 서버가 세션 테이블을 두지 않는다.
 */

const SCRYPT_KEYLEN = 32;

/** PIN → `salt:derivedKey` (둘 다 hex). 같은 PIN 도 salt 때문에 매번 다른 해시가 된다. */
export const hashPin = (pin: string): string => {
  const salt = randomBytes(16);
  const derived = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
};

/** 저장된 `salt:derivedKey` 와 입력 PIN 을 상수시간 비교한다. */
export const verifyPin = (pin: string, stored: string): boolean => {
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const derived = scryptSync(pin, Buffer.from(saltHex, 'hex'), SCRYPT_KEYLEN);
  const expected = Buffer.from(keyHex, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
};

interface TokenPayload {
  /** 참가자 id */
  sub: string;
  /** 만료 시각 (epoch ms) */
  exp: number;
}

/** 로그인 토큰 수명 — 캐주얼 경쟁이라 넉넉히 30일. */
export const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url');

const sign = (data: string, secret: string): string =>
  createHmac('sha256', secret).update(data).digest('base64url');

/** 참가자 id → 서명 토큰. `base64url(payload).signature` 형태. */
export const issueToken = (participantId: string, secret: string, now: number): string => {
  const payload: TokenPayload = { sub: participantId, exp: now + TOKEN_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
};

/**
 * 토큰 검증. 서명이 맞고 만료 전이면 참가자 id 를 돌려주고, 아니면 null.
 * 서명 비교는 상수시간으로 한다(위조 시도에 타이밍 정보를 주지 않는다).
 */
export const verifyToken = (token: string, secret: string, now: number): string | null => {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < now) return null;
    return payload.sub;
  } catch {
    return null;
  }
};
