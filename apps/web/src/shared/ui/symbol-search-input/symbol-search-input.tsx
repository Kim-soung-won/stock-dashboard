import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export interface SymbolOption {
  code: string;
  name: string;
  market?: string;
}

interface SymbolSearchInputProps {
  /** 입력창의 텍스트. 종목명이든 코드든 사용자가 친 그대로다. */
  value: string;
  onChange: (text: string) => void;
  /** 후보 목록. 데이터는 상위(entities/market/symbol)가 주입한다. */
  suggestions: SymbolOption[];
  onPick: (symbol: SymbolOption) => void;
  placeholder?: string;
  disabled?: boolean;
  isSearching?: boolean;
  /** 폼 라벨과 연결할 id. 없으면 자동 생성한다. */
  id?: string;
  className?: string;
}

/**
 * 종목명·코드 검색 입력 (순수 표시용).
 *
 * 코드를 외우지 않은 사용자가 이름으로 종목을 고르게 하는 공용 입력이다. 조회·후보
 * 목록은 상위가 주입하고(StarButton/useWatchlist 와 같은 분담) 여기서는 표시와
 * 키보드 조작만 맡는다.
 *
 * 코드를 그대로 붙여넣는 기존 사용법도 그대로 통한다 — 후보를 고르지 않아도 입력값은
 * 상위로 흐르고, 코드 확정은 `resolveSymbolCode` 가 판정한다.
 */
export const SymbolSearchInput = ({
  value,
  onChange,
  suggestions,
  onPick,
  placeholder,
  disabled,
  isSearching,
  id,
  className,
}: SymbolSearchInputProps) => {
  const listId = useId();
  const inputId = id ?? listId + '-input';
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 후보가 바뀌면 하이라이트를 첫 줄로 되돌린다(엉뚱한 줄이 선택돼 있는 것을 막는다).
  useEffect(() => {
    setActive(0);
  }, [suggestions]);

  // 바깥을 누르면 닫는다. blur 로 닫으면 후보를 클릭하는 순간 목록이 사라진다.
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const pick = (symbol: SymbolOption | undefined) => {
    if (!symbol) return;
    onPick(symbol);
    setIsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const count = suggestions.length;
      if (count > 0) setActive((previous) => (previous + step + count) % count);
      return;
    }
    // 후보를 하이라이트한 채 Enter 는 "선택"이다 — 폼 제출로 새지 않게 막는다.
    if (event.key === 'Enter' && isOpen && suggestions.length > 0) {
      event.preventDefault();
      pick(suggestions[active]);
    }
  };

  const showList = isOpen && value.trim().length > 0;

  return (
    <div className={'symbol-search' + (className ? ' ' + className : '')} ref={containerRef}>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder ?? '종목명 또는 코드'}
        maxLength={40}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showList ? (
        <ul className="symbol-search__list" id={listId} role="listbox">
          {suggestions.map((symbol, index) => (
            <li key={symbol.market ? symbol.market + ':' + symbol.code : symbol.code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={
                  'symbol-search__option' +
                  (index === active ? ' symbol-search__option--active' : '')
                }
                // mousedown 에서 고른다 — click 은 blur 뒤라 목록이 이미 닫혀 있을 수 있다.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(symbol);
                }}
                onMouseEnter={() => setActive(index)}
              >
                <span className="symbol-search__name">{symbol.name}</span>
                <span className="symbol-search__code">{symbol.code}</span>
              </button>
            </li>
          ))}
          {suggestions.length === 0 ? (
            <li className="symbol-search__empty" role="none">
              {isSearching ? '검색 중…' : '검색 결과가 없습니다'}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
};
