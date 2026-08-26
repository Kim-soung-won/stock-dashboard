import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SymbolSearchInput } from './symbol-search-input';
import type { SymbolOption } from './symbol-search-input';

const SUGGESTIONS: SymbolOption[] = [
  { code: '005930', name: '삼성전자' },
  { code: '005935', name: '삼성전자우' },
];

/** 입력은 제어 컴포넌트다 — 실제 사용처처럼 상태를 쥔 껍데기로 감싸 검증한다. */
const Harness = ({
  onPick,
  suggestions = SUGGESTIONS,
}: {
  onPick: (symbol: SymbolOption) => void;
  suggestions?: SymbolOption[];
}) => {
  const [value, setValue] = useState('');
  return (
    <SymbolSearchInput
      value={value}
      onChange={setValue}
      suggestions={suggestions}
      onPick={onPick}
    />
  );
};

/**
 * 코드를 외우지 않은 사용자가 **이름으로 종목을 고르는** 입력의 계약을 고정한다.
 * 후보를 마우스로도 키보드로도 고를 수 있어야 하고, 고르면 목록은 닫혀야 한다.
 */
describe('SymbolSearchInput', () => {
  const type = (text: string) => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: text } });
  };

  it('입력하기 전에는 후보 목록이 열리지 않는다', () => {
    render(<Harness onPick={vi.fn()} />);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('입력하면 후보를 종목명과 코드로 함께 보여준다', () => {
    render(<Harness onPick={vi.fn()} />);
    type('삼성');
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByText('삼성전자')).toBeTruthy();
    expect(screen.getByText('005930')).toBeTruthy();
  });

  it('후보를 클릭하면 그 종목을 고른다', () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    type('삼성');
    fireEvent.mouseDown(screen.getByText('삼성전자우'));
    expect(onPick).toHaveBeenCalledWith(SUGGESTIONS[1]);
  });

  it('키보드(↓ + Enter)로도 고를 수 있다', () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);
    type('삼성');
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // 첫 줄 → 둘째 줄
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(SUGGESTIONS[1]);
  });

  it('고르고 나면 목록을 닫는다', () => {
    render(<Harness onPick={vi.fn()} />);
    type('삼성');
    fireEvent.mouseDown(screen.getByText('삼성전자'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape 로 목록을 닫는다', () => {
    render(<Harness onPick={vi.fn()} />);
    type('삼성');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('결과가 없으면 없다고 알린다 — 빈 목록으로 두지 않는다', () => {
    render(<Harness onPick={vi.fn()} suggestions={[]} />);
    type('없는종목');
    expect(screen.getByText('검색 결과가 없습니다')).toBeTruthy();
  });
});
