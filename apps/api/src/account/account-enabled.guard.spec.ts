import { ServiceUnavailableException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Env } from '../config/env';
import { AccountEnabledGuard } from './account-enabled.guard';

/**
 * 실계좌 조회 스위치 가드 계약:
 *  - ACCOUNT_ENABLED 가 참이면 통과, 거짓이면 503(사유 포함)으로 막는다.
 */
const ctx = {} as ExecutionContext;
const guard = (accountEnabled: boolean) =>
  new AccountEnabledGuard({ ACCOUNT_ENABLED: accountEnabled } as Env);

describe('AccountEnabledGuard', () => {
  it('활성이면 통과한다', () => {
    expect(guard(true).canActivate(ctx)).toBe(true);
  });

  it('비활성이면 503 으로 막고 사유를 남긴다', () => {
    expect(() => guard(false).canActivate(ctx)).toThrow(ServiceUnavailableException);
    expect(() => guard(false).canActivate(ctx)).toThrow(/ACCOUNT_ENABLED/);
  });
});
