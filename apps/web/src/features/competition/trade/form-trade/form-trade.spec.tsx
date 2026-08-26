import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// 서비스(HTTP)·실시간은 목킹한다. 여기서 고정하는 건 "확인 없이는 체결되지 않는다"다.
vi.mock('@/entities/market/quote', () => ({
  quoteQueries: {
    all: () => ['market', 'quote'],
    detail: (code: string) => ({
      queryKey: ['market', 'quote', code],
      queryFn: () => Promise.resolve({ code, name: '삼성전자', price: 50_000 }),
      enabled: code.length > 0,
    }),
  },
  useTickStream: () => new Map(),
}));

vi.mock('@/entities/market/symbol', () => ({
  useSymbolPicker: () => ({
    query: '삼성전자',
    suggestions: [],
    isSearching: false,
    code: '005930',
    name: '삼성전자',
    onChange: vi.fn(),
    onPick: vi.fn(),
    reset: vi.fn(),
  }),
}));

const mutate = vi.fn();
vi.mock('@/entities/competition/portfolio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/competition/portfolio')>();
  return {
    ...actual,
    useTrade: () => ({ mutate, isPending: false, isError: false, error: null, data: null }),
    portfolioQueries: {
      all: () => ['competition', 'portfolio'],
      current: () => ({
        queryKey: ['competition', 'portfolio', 'current'],
        queryFn: () => Promise.resolve({ cash: 1_000_000, holdings: [] }),
      }),
    },
  };
});

import { FormTrade } from './form-trade';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
});

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<FormTrade />, { wrapper });
};

/**
 * 시장가라 사용자는 얼마가 빠져나가는지 모른 채 버튼을 누른다. 그래서 **누르는 순간
 * 체결되지 않고** 금액을 먼저 보여준 뒤, 확정을 눌러야 체결된다는 것을 고정한다.
 */
describe('FormTrade — 매매 확인 창', () => {
  beforeEach(() => {
    // 장중(수요일 11:00 KST)이어야 버튼이 열려 있다.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-08-26T02:00:00.000Z'));
    mutate.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('매수를 눌러도 곧바로 체결하지 않는다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '매수' }));
    await screen.findByText('매수 확정');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('확인 창에 예수금 변화를 보여준다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '매수' }));
    expect(await screen.findByText('체결 후 예수금')).toBeTruthy();
    expect(screen.getByText('거래대금')).toBeTruthy();
    expect(screen.getByText('수수료')).toBeTruthy();
  });

  it('확정을 눌러야 체결한다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '매수' }));
    fireEvent.click(await screen.findByText('매수 확정'));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate.mock.calls[0]?.[0]).toMatchObject({ code: '005930', side: 'buy', quantity: 1 });
  });

  it('취소하면 체결하지 않고 창을 닫는다', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: '매수' }));
    fireEvent.click(await screen.findByText('취소'));
    expect(mutate).not.toHaveBeenCalled();
  });
});
