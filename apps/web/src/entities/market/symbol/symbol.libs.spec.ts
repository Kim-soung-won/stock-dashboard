import { describe, expect, it } from 'vitest';
import { formatSymbolLabel, matchSymbols, resolveSymbolCode } from './symbol.libs';

const symbol = (code: string, name: string) => ({
  code,
  name,
  market: 'kospi' as const,
  marketCap: null,
});

/**
 * 종목 검색의 사용자 계약: **코드를 외우지 않아도 이름으로 찾을 수 있다.**
 * 코드를 그대로 붙여넣는 기존 사용법도 계속 통해야 한다.
 */
describe('matchSymbols', () => {
  const symbols = [symbol('005930', '삼성전자'), symbol('035720', '카카오'), symbol('069500', 'KODEX 200')];

  it('종목명 일부로 찾는다', () => {
    expect(matchSymbols(symbols, '카카').map((item) => item.code)).toEqual(['035720']);
  });

  it('종목코드 일부로도 찾는다', () => {
    expect(matchSymbols(symbols, '0059').map((item) => item.code)).toEqual(['005930']);
  });

  it('영문 종목명은 대소문자를 구분하지 않는다', () => {
    expect(matchSymbols(symbols, 'kodex').map((item) => item.code)).toEqual(['069500']);
  });

  it('앞뒤 공백은 검색어로 치지 않는다', () => {
    expect(matchSymbols(symbols, '  카카오  ').map((item) => item.code)).toEqual(['035720']);
  });

  it('빈 검색어는 필터하지 않는다(전체를 보여준다)', () => {
    expect(matchSymbols(symbols, '   ')).toEqual(symbols);
  });
});

describe('resolveSymbolCode', () => {
  const suggestions = [symbol('005930', '삼성전자'), symbol('005935', '삼성전자우')];

  it('코드를 그대로 입력하면 후보와 무관하게 그 코드다(신규 상장도 담을 수 있어야 한다)', () => {
    expect(resolveSymbolCode('000660', [])).toBe('000660');
  });

  it('종목명이 후보와 정확히 같으면 그 종목이다', () => {
    expect(resolveSymbolCode('삼성전자', suggestions)).toBe('005930');
  });

  it('후보가 하나뿐이면 그 종목이다', () => {
    expect(resolveSymbolCode('카카오뱅', [symbol('323410', '카카오뱅크')])).toBe('323410');
  });

  it('여러 후보에 걸리는 검색어는 확정하지 않는다(사용자가 고르게 한다)', () => {
    expect(resolveSymbolCode('삼성', suggestions)).toBeNull();
  });

  it('빈 입력은 확정하지 않는다', () => {
    expect(resolveSymbolCode('  ', suggestions)).toBeNull();
  });
});

describe('formatSymbolLabel', () => {
  it('이름을 알면 이름만 넣는다 — 그 문자열이 다시 검색어가 되기 때문이다', () => {
    expect(formatSymbolLabel({ code: '005930', name: '삼성전자' })).toBe('삼성전자');
  });

  it('이름이 없으면 코드를 넣는다', () => {
    expect(formatSymbolLabel({ code: '005930', name: null })).toBe('005930');
  });
});
