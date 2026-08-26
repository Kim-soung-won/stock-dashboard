import { describe, expect, it } from 'vitest';
import { symbolLabel } from './selected-symbol';

/**
 * 화면에 코드가 찍히면 무슨 종목인지 알 수 없다. 이름을 알면 이름을 쓴다는 계약.
 */
describe('symbolLabel', () => {
  it('이름을 알면 이름을 쓴다', () => {
    expect(symbolLabel({ code: '005930', name: '삼성전자' })).toBe('삼성전자');
  });

  it('이름을 모르면 코드로 대체한다(빈 라벨을 만들지 않는다)', () => {
    expect(symbolLabel({ code: '005930', name: null })).toBe('005930');
  });
});
