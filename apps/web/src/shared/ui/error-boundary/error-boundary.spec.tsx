import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/base';
import { ErrorBoundary } from './error-boundary';

/**
 * 바운더리가 "흰 화면 대신 원인을 보여준다"는 계약을 고정한다.
 * React 는 잡힌 예외도 console.error 로 흘리므로 테스트에서만 막는다.
 */
const Boom = ({ error }: { error: unknown }): never => {
  throw error;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('자식이 던진 예외를 잡아 원인을 화면에 남긴다', () => {
    render(
      <ErrorBoundary context="test">
        <Boom error={new Error('터졌다')} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('터졌다')).toBeTruthy();
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('ApiError 는 키움 코드와 원문까지 보여준다 — 디버깅의 핵심 정보', () => {
    render(
      <ErrorBoundary context="quote">
        <Boom
          error={
            new ApiError(2, '접근토큰 발급 실패', '8030', '투자구분(실전/모의)이 달라서 Appkey를 사용할수가 없습니다')
          }
        />
      </ErrorBoundary>,
    );

    expect(screen.getByText('키움 8030')).toBeTruthy();
    expect(screen.getByText(/투자구분/)).toBeTruthy();
    expect(screen.getByText('API 오류 (code 2)')).toBeTruthy();
  });

  it('잡은 예외는 콘솔에도 남긴다 — 화면을 닫아도 추적할 수 있어야 한다', () => {
    render(
      <ErrorBoundary context="logged">
        <Boom error={new Error('기록되어야 함')} />
      </ErrorBoundary>,
    );

    const logged = vi.mocked(console.error).mock.calls.flat().join('\n');
    expect(logged).toContain('ErrorBoundary:logged');
    expect(logged).toContain('기록되어야 함');
  });

  it('resetKeys 가 바뀌면 이전 에러를 붙들지 않는다', () => {
    const Host = () => {
      const [key, setKey] = useState('a');
      return (
        <>
          <button type="button" onClick={() => setKey('b')}>
            종목 변경
          </button>
          <ErrorBoundary context="reset" resetKeys={[key]}>
            {key === 'a' ? <Boom error={new Error('첫 종목 실패')} /> : <p>두 번째 종목 정상</p>}
          </ErrorBoundary>
        </>
      );
    };

    render(<Host />);
    expect(screen.getByText('첫 종목 실패')).toBeTruthy();

    // 상태 갱신을 React 가 처리하도록 fireEvent(act 포함)로 누른다.
    fireEvent.click(screen.getByRole('button', { name: '종목 변경' }));

    expect(screen.getByText('두 번째 종목 정상')).toBeTruthy();
  });

  it('fallback 을 주면 기본 패널 대신 그것을 그린다', () => {
    render(
      <ErrorBoundary fallback={(report) => <p>커스텀: {report.message}</p>}>
        <Boom error={new Error('원인')} />
      </ErrorBoundary>,
    );

    expect(screen.getByText('커스텀: 원인')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
