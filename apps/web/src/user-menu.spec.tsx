import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Participant } from '@stock/contracts';
import { describe, expect, it, vi } from 'vitest';
import { UserMenu } from './user-menu';

const PARTICIPANT = {
  id: 'p1',
  nickname: '철수',
  avatarEmoji: '🚀',
} as unknown as Participant;

const renderMenu = (onLogout = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <UserMenu participant={PARTICIPANT} onLogout={onLogout} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onLogout, trigger: screen.getByRole('button', { name: /철수/ }) };
};

/**
 * 내 화면(포트폴리오·프로필·잔고·주문이력)은 상단 네비가 아니라 이 드롭다운에 있다.
 * 그래서 "닫혀 있을 때는 안 보이고, 열면 전부 보인다"가 이 컴포넌트의 계약이다.
 */
describe('UserMenu', () => {
  it('닫혀 있으면 메뉴 항목이 보이지 않는다', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByText('내 포트폴리오')).toBeNull();
  });

  it('열면 내 화면 네 개와 로그아웃이 모두 있다', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    for (const label of ['내 포트폴리오', '내 프로필', '잔고·손익', '주문·이력', '로그아웃']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('다시 누르면 닫힌다', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Escape 로 닫힌다', () => {
    const { trigger } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('로그아웃을 누르면 상위에 알린다', () => {
    const { trigger, onLogout } = renderMenu();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('로그아웃'));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
