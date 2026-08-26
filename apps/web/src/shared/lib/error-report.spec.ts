import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/base';
import { formatErrorReport, toErrorReport } from './error-report';

/**
 * 에러 정형화 계약: 이 앱의 진짜 원인은 HTTP 상태가 아니라 **키움 코드**다.
 * ApiError 는 code/kiwoomCode/detail 을 보존하고, 일반 Error·문자열은 안전하게 감싼다.
 */
describe('toErrorReport', () => {
  it('ApiError 는 BFF code·키움 코드·원문을 보존한다', () => {
    const report = toErrorReport(
      new ApiError(2, '접근토큰 발급 실패', '8030', '투자구분 불일치'),
    );
    expect(report.code).toBe(2);
    expect(report.kiwoomCode).toBe('8030');
    expect(report.detail).toBe('투자구분 불일치');
    expect(report.title).toContain('code 2');
  });

  it('일반 Error 는 code·키움 코드 없이 이름·메시지를 남긴다', () => {
    const report = toErrorReport(new TypeError('터짐'));
    expect(report.code).toBeNull();
    expect(report.kiwoomCode).toBeNull();
    expect(report.title).toBe('TypeError');
    expect(report.message).toBe('터짐');
  });

  it('문자열 등 알 수 없는 값도 안전하게 감싼다', () => {
    const report = toErrorReport('그냥 문자열');
    expect(report.title).toBe('알 수 없는 오류');
    expect(report.message).toBe('그냥 문자열');
  });
});

describe('formatErrorReport', () => {
  it('키움 코드가 있으면 텍스트 리포트에 포함한다', () => {
    const text = formatErrorReport(
      toErrorReport(new ApiError(2, '실패', '1700', '유량 초과')),
      'quote:005930',
    );
    expect(text).toContain('키움 코드: 1700');
    expect(text).toContain('위치: quote:005930');
  });
});
